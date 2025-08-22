import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Content from "../models/contentModel.js";
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import ClassCategory from "../models/classCategoryModel.js";
import Payment from "../models/paymentModel.js";
import PlanDetails from "../models/planDetailsModel.js";
import Style from "../models/styleModel.js";
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import classCategoryModel from "../models/classCategoryModel.js";
import contentModel from "../models/contentModel.js";

// S3 client
const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY?.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY?.trim(),
    },
});

const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`;
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`;
};

const deleteS3KeyIfAny = async (key) => {
    if (!key) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }));
    } catch (e) {
        console.error('S3 delete failed:', e.message);
    }
};

export const createContent = async (req, res) => {
    try {
        const {
            level_name,
            video_title,
            video_time,
            video_description,
            video_range,
            burn,
            classCategoryId,
            styleId
        } = req.body;

        // Validate required fields
        if (!level_name || !video_title || !video_time || !video_description || !burn || !classCategoryId || !styleId || !video_range) {
            // Cleanup uploaded S3 files if any
            await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
            return ThrowError(res, 400, "All fields are required.");
        }

        const parsedClassCatIds = typeof classCategoryId === "string" ? JSON.parse(classCategoryId) : classCategoryId;
        const classCatIds = Array.isArray(parsedClassCatIds) ? parsedClassCatIds : [parsedClassCatIds];
        if (!classCatIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
            await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
            return ThrowError(res, 400, "Invalid classCategoryId.");
        }

        const validCategories = await ClassCategory.find({ _id: { $in: classCatIds } });
        if (validCategories.length !== classCatIds.length) {
            await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
            return sendNotFoundResponse(res, "One or more classCategoryId not found.");
        }

        const parsedStyleIds = typeof styleId === "string" ? JSON.parse(styleId) : styleId;
        const styleIds = Array.isArray(parsedStyleIds) ? parsedStyleIds : [parsedStyleIds];
        if (!styleIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
            await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
            return ThrowError(res, 400, "Invalid styleId.");
        }

        const validStyles = await Style.find({ _id: { $in: styleIds } });
        if (validStyles.length !== styleIds.length) {
            await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
            return sendNotFoundResponse(res, "One or more styleId not found.");
        }

        const contentImageFile = req.files?.content_image?.[0];
        const contentVideoFile = req.files?.content_video?.[0];

        if (!contentImageFile && !contentVideoFile) {
            return res.status(400).json({
                msg: "At least one of image or video is required.",
                data: null
            });
        }

        const contentImageKey = contentImageFile?.key || null;
        const contentVideoKey = contentVideoFile?.key || null;

        const duplicate = await Content.findOne({
            video_title,
            classCategoryId: { $in: classCatIds },
            styleId: { $in: styleIds }
        });

        if (duplicate) {
            await deleteS3KeyIfAny(contentImageKey);
            await deleteS3KeyIfAny(contentVideoKey);
            return ThrowError(res, 400, "A video with the same title already exists in one of the selected categories or styles.");
        }

        const newContent = await Content.create({
            content_image: contentImageKey ? publicUrlForKey(contentImageKey) : null,
            content_image_key: contentImageKey,
            content_video: contentVideoKey ? publicUrlForKey(contentVideoKey) : null,
            content_video_key: contentVideoKey,
            level_name,
            video_title,
            video_time,
            video_description,
            video_range,
            burn,
            classCategoryId: classCatIds,
            styleId: styleIds
        });

        return res.status(201).json({
            status: true,
            message: "Content created successfully",
            data: newContent
        });
    } catch (error) {
        await deleteS3KeyIfAny(req.files?.content_image?.[0]?.key);
        await deleteS3KeyIfAny(req.files?.content_video?.[0]?.key);
        return ThrowError(res, 500, error.message);
    }
};

// Get all content for a particular Category
export const getContentByClassCategoryId = async (req, res) => {
    try {
        const { classCategoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(classCategoryId)) {
            return ThrowError(res, 400, "Invalid classCategory ID");
        }

        const classCategory = await classCategoryModel
            .findById(classCategoryId)
            .select("classCategory_title");

        if (!classCategory) {
            return sendSuccessResponse(res, "Class Category not found", []);
        }


        const data = ["0-10", "11-15", "16"];

        let content;

        if (data.includes(classCategory.classCategory_title)) {
            content = await contentModel
                .find({
                    video_range: {
                        $regex: new RegExp("^" + classCategory.classCategory_title + "$", "i") // case-insensitive
                    }
                })
                .populate("classCategoryId")
                .populate("styleId");
        } else {
            content = await contentModel
                .find({ classCategoryId })
                .populate("classCategoryId")
                .populate("styleId");
        }

        if (!content.length) {
            return sendSuccessResponse(res, "No content found for this Category", []);
        }

        return sendSuccessResponse(res, "Content fetched successfully", content);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};


// Get all content for a particular Style
export const getContentByStyleId = async (req, res) => {
    try {
        const { styleId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(styleId)) {
            return ThrowError(res, 400, "Invalid style ID");
        }

        const style = await Style
            .findById(styleId)
            .select("style_title");

        if (!style) {
            return sendSuccessResponse(res, "Style not found", []);
        }


        const data = ["0-10", "11-15", "16"];

        let content;

        if (data.includes(style.style_title)) {
            content = await contentModel
                .find({
                    video_range: {
                        $regex: new RegExp("^" + style.style_title + "$", "i")
                    }
                })
                .populate("classCategoryId")
                .populate("styleId");
        } else {
            content = await contentModel
                .find({ styleId })
                .populate("classCategoryId")
                .populate("styleId");
        }

        if (!content.length) {
            return sendSuccessResponse(res, "No content found for this Category", []);
        }

        return sendSuccessResponse(res, "Content fetched successfully", content);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get All Content
export const getAllContent = async (req, res) => {
    try {
        const content = await Content.find().sort({ createdAt: -1 })

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No any content found!!!")
        }

        return sendSuccessResponse(res, "Content fetched successfully...", content)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// Get content by ID
export const getContentById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid Content ID");
        }
        const content = await Content.findById(req.params.id).populate('classCategoryId').populate('styleId');
        if (!content) {
            return ThrowError(res, 404, "Content not found");
        }
        return sendSuccessResponse(res, "Content fetched successfully...", content)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update a content
export const updateContent = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid Content ID");
        }

        const {
            level_name,
            video_title,
            video_time,
            video_description,
            video_range,
            burn,
            classCategoryId,
            styleId
        } = req.body;

        const content = await Content.findById(id);
        if (!content) {
            return ThrowError(res, 404, "Content not found");
        }

        // ✅ ClassCategoryId validation (array support)
        let classCatIds = content.classCategoryId; // fallback to existing
        if (classCategoryId) {
            const parsedClassCatIds = typeof classCategoryId === "string" ? JSON.parse(classCategoryId) : classCategoryId;
            classCatIds = Array.isArray(parsedClassCatIds) ? parsedClassCatIds : [parsedClassCatIds];

            if (!classCatIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
                return ThrowError(res, 400, "Invalid classCategoryId(s)");
            }

            const validCats = await ClassCategory.find({ _id: { $in: classCatIds } });
            if (validCats.length !== classCatIds.length) {
                return sendNotFoundResponse(res, "One or more classCategoryId not found");
            }
        }

        // ✅ StyleId validation (array support)
        let styleIds = content.styleId; // fallback to existing
        if (styleId) {
            const parsedStyleIds = typeof styleId === "string" ? JSON.parse(styleId) : styleId;
            styleIds = Array.isArray(parsedStyleIds) ? parsedStyleIds : [parsedStyleIds];

            if (!styleIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
                return ThrowError(res, 400, "Invalid styleId(s)");
            }

            const validStyles = await Style.find({ _id: { $in: styleIds } });
            if (validStyles.length !== styleIds.length) {
                return sendNotFoundResponse(res, "One or more styleId not found");
            }
        }

        // ✅ File updates
        const imageFile = req.files?.['content_image']?.[0];
        const videoFile = req.files?.['content_video']?.[0];


        if (imageFile?.key) {
            // delete old from S3
            await deleteS3KeyIfAny(content.content_image_key || (() => { try { const u = new URL(content.content_image); return u.pathname.replace(/^\//, ''); } catch { return null; } })());
            content.content_image = publicUrlForKey(imageFile.key);
            content.content_image_key = imageFile.key;
        }

        if (videoFile?.key) {
            await deleteS3KeyIfAny(content.content_video_key || (() => { try { const u = new URL(content.content_video); return u.pathname.replace(/^\//, ''); } catch { return null; } })());
            content.content_video = publicUrlForKey(videoFile.key);
            content.content_video_key = videoFile.key;
        }

        // ✅ Update fields
        content.level_name = level_name ?? content.level_name;
        content.video_title = video_title ?? content.video_title;
        content.video_time = video_time ?? content.video_time;
        content.video_description = video_description ?? content.video_description;
        content.video_range = video_range ?? content.video_range;
        content.burn = burn ?? content.burn;
        content.classCategoryId = classCatIds;
        content.styleId = styleIds;

        const updated = await content.save();
        return sendSuccessResponse(res, "Content updated successfully", updated);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete a Content
export const deleteContent = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid Content ID");
        }

        // Find the Content first to get the file URLs
        const existingContent = await Content.findById(id);
        if (!existingContent) {
            return sendErrorResponse(res, 404, "Content not found");
        }

        // delete from S3 if existed
        await deleteS3KeyIfAny(existingContent.content_image_key || (() => { try { const u = new URL(existingContent.content_image); return u.pathname.replace(/^\//, ''); } catch { return null; } })());
        await deleteS3KeyIfAny(existingContent.content_video_key || (() => { try { const u = new URL(existingContent.content_video); return u.pathname.replace(/^\//, ''); } catch { return null; } })());

        // Delete the Content from database
        const deletedContent = await Content.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Content and associated files deleted successfully", deletedContent);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};


// Get New Arrivals Content 
export const getNewArrivals = async (req, res) => {
    try {
        const latestContent = await Content.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('classCategoryId')
            .populate('styleId');

        if (!latestContent || latestContent.length === 0) {
            return sendNotFoundResponse(res, "No any latestContent found...")
        }

        return sendSuccessResponse(res, "Top 5 most recently added Content fetched successfully", latestContent)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Beginner Content
export const getBeginner = async (req, res) => {
    try {
        const beginner = await Content.find({ level_name: 'Beginner' })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!beginner || beginner.length === 0) {
            return sendNotFoundResponse(res, "No any beginner Content found...")
        }

        return sendSuccessResponse(res, "Beginner Content fetched successfully", beginner)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Advanced Content
export const getAdvanced = async (req, res) => {
    try {
        const advanced = await Content.find({ level_name: 'Advanced' })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!advanced || advanced.length === 0) {
            return sendNotFoundResponse(res, "No any Advanced Content found...")
        }

        return sendSuccessResponse(res, "Advanced Content fetched successfully", advanced)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Intermediate Content
export const getIntermediate = async (req, res) => {
    try {
        const intermediate = await Content.find({ level_name: 'Intermediate' })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!intermediate || intermediate.length === 0) {
            return sendNotFoundResponse(res, "No any Intermediate Content found...")
        }

        return sendSuccessResponse(res, "Intermediate Content fetched successfully", intermediate)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get DanceFitness Content
export const getContentByDanceFitness = async (req, res) => {
    try {
        const style = await Style.findOne({ style_title: "Dance Fitness" });

        if (!style) {
            return sendNotFoundResponse(res, "Dance Fitness style not found.");
        }

        const content = await Content.find({ styleId: style._id })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No Dance Fitness Content found.");
        }

        return sendSuccessResponse(res, "Dance Fitness Content fetched successfully", content);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }

};

// Get HipHop Content
export const getContentByHipHop = async (req, res) => {
    try {
        const style = await Style.findOne({
            style_title: { $regex: /hip\s*hop/i }
        });

        if (!style) {
            return sendNotFoundResponse(res, "Hip Hop style not found.");
        }

        // styleId array ma search karo
        const content = await Content.find({ styleId: { $in: [style._id] } })
            .sort({ createdAt: -1 })
            .populate("classCategoryId")
            .populate("styleId");

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No Hip Hop Content found.");
        }

        return sendSuccessResponse(res, "Hip Hop Content fetched successfully", content);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Boxing Content
export const getContentByBoxing = async (req, res) => {
    try {
        const style = await Style.findOne({ style_title: "Boxing" });

        if (!style) {
            return sendNotFoundResponse(res, "Boxing style not found.");
        }

        const content = await Content.find({ styleId: style._id })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No Boxing Content found.");
        }

        return sendSuccessResponse(res, "Boxing Content fetched successfully", content);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }

};

// Get Belly Dance Content
export const getContentByBellyDance = async (req, res) => {
    try {
        const style = await Style.findOne({ style_title: "Belly Dance" });

        if (!style) {
            return sendNotFoundResponse(res, "Belly Dance style not found.");
        }

        const content = await Content.find({ styleId: style._id })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No Belly Dance Content found.");
        }

        return sendSuccessResponse(res, "Belly Dance Content fetched successfully", content);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }

};

// Get All Just Released Content
export const getJustReleasedContent = async (req, res) => {
    try {
        const content = await Content.find().sort({ createdAt: -1 })

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No any content found!!!")
        }

        return sendSuccessResponse(res, "Content fetched successfully...", content)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// Get Best Dance Class
export const getBestDanceClass = async (req, res) => {
    try {
        const bestDanceClass = await Content.find({
            classCategoryId: { $ne: null },
            styleId: { $ne: null }
        }).sort({ views: -1 }).populate('classCategoryId').populate('styleId')

        if (!bestDanceClass || bestDanceClass.length === 0) {
            return sendNotFoundResponse(res, "No any best dance class found...")
        }

        return sendSuccessResponse(res, "Best dance class fetched successfully", bestDanceClass)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// Get TrendingPlan
export const getTrendingPlans = async (req, res) => {
    try {
        const planCounts = await Payment.aggregate([
            {
                $match: {
                    planDetails: { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: "$planDetails",
                    purchaseCount: { $sum: 1 },
                },
            },
        ]);

        const countMap = {};
        planCounts.forEach((item) => {
            countMap[item._id.toString()] = item.purchaseCount;
        });

        const allPlans = await PlanDetails.find({});

        // Merge purchaseCount and sort
        const merged = allPlans.map((plan) => {
            const planObj = plan.toObject();
            planObj.purchaseCount = countMap[plan._id.toString()] || 0;
            return planObj;
        });

        // Sort descending by purchaseCount
        const topThree = merged.sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, 3);

        if (topThree.length === 0) {
            return sendNotFoundResponse(res, "No any TrendingPlan fetched")
        }

        return sendSuccessResponse(res, "Trending PlanDetails fetched", topThree);
    } catch (error) {
        return sendBadRequestResponse(res, error.message);
    }
};

// Increment Content views
export const incrementContentViews = async (req, res) => {
    try {
        if (!req.user) {
            return ThrowError(res, 401, "User not authenticated");
        }

        const { contentId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return ThrowError(res, 400, 'Invalid Content ID');
        }

        const content = await Content.findById(contentId);
        if (!content) {
            return ThrowError(res, 404, 'Content not found');
        }

        // Ensure views is an array and filter out any invalid entries
        if (!Array.isArray(content.views)) {
            content.views = [];
        } else {
            content.views = content.views.filter(view => typeof view === 'object' && view !== null && view.userId && view.timestamp);
        }

        // Check if user has ever viewed this content
        const hasViewed = content.views.some(view => view.userId.toString() === userId.toString());

        if (hasViewed) {
            return res.status(200).json({
                status: true,
                message: "User has already viewed this content",
                data: {
                    contentId: content._id,
                    title: content.title,
                    views: content.views.length
                }
            });
        }

        // Add new view
        content.views.push({
            userId: userId,
            timestamp: new Date()
        });

        await content.save();

        return res.status(200).json({
            status: true,
            message: "View count updated successfully",
            data: {
                contentId: content._id,
                title: content.title,
                views: content.views.length
            }
        });
    } catch (error) {
        console.error('Error in incrementContentViews:', error);
        return ThrowError(res, 500, error.message);
    }
};
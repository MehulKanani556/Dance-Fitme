import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Content from "../models/contentModel.js";
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import ClassCategory from "../models/classCategoryModel.js";
import Payment from "../models/paymentModel.js";
import PlanDetails from "../models/planDetailsModel.js";
import Style from "../models/styleModel.js";
import fs from "fs"
import path from "path";

export const createContent = async (req, res) => {
    try {
        const {
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            classCategoryId,
            styleId
        } = req.body;

        // Validate required fields
        if (!level_name || !video_title || !video_time || !video_description || !burn || !classCategoryId || !styleId) {
            req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
            req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
            return ThrowError(res, 400, "All fields are required.");
        }

        const parsedClassCatIds = typeof classCategoryId === "string" ? JSON.parse(classCategoryId) : classCategoryId;
        const classCatIds = Array.isArray(parsedClassCatIds) ? parsedClassCatIds : [parsedClassCatIds];
        if (!classCatIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
            req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
            req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
            return ThrowError(res, 400, "Invalid classCategoryId.");
        }

        const validCategories = await ClassCategory.find({ _id: { $in: classCatIds } });
        if (validCategories.length !== classCatIds.length) {
            req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
            req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
            return sendNotFoundResponse(res, "One or more classCategoryId not found.");
        }

        const parsedStyleIds = typeof styleId === "string" ? JSON.parse(styleId) : styleId;
        const styleIds = Array.isArray(parsedStyleIds) ? parsedStyleIds : [parsedStyleIds];
        if (!styleIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
            req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
            req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
            return ThrowError(res, 400, "Invalid styleId.");
        }

        const validStyles = await Style.find({ _id: { $in: styleIds } });
        if (validStyles.length !== styleIds.length) {
            req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
            req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
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

        const contentImage = contentImageFile?.filename || null;
        const contentVideo = contentVideoFile?.filename || null;

        const duplicate = await Content.findOne({
            video_title,
            classCategoryId: { $in: classCatIds },
            styleId: { $in: styleIds }
        });

        if (duplicate) {
            contentImageFile?.path && fs.existsSync(contentImageFile.path) && fs.unlinkSync(contentImageFile.path);
            contentVideoFile?.path && fs.existsSync(contentVideoFile.path) && fs.unlinkSync(contentVideoFile.path);
            return ThrowError(res, 400, "A video with the same title already exists in one of the selected categories or styles.");
        }

        const newContent = await Content.create({
            content_image: contentImage,
            content_video: contentVideo,
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            classCategoryId: classCatIds,
            styleId: styleIds
        });

        return res.status(201).json({
            status: true,
            message: "Content created successfully",
            data: {
                content: newContent,
                fileInfo: {
                    image: contentImageFile
                        ? {
                            url: `/public/content_images/${contentImage}`,
                            type: contentImageFile.mimetype,
                            size: contentImageFile.size
                        }
                        : null,
                    video: contentVideoFile
                        ? {
                            url: `/public/content_videos/${contentVideo}`,
                            type: contentVideoFile.mimetype,
                            size: contentVideoFile.size
                        }
                        : null
                }
            }
        });
    } catch (error) {
        req.files?.content_image?.[0]?.path && fs.existsSync(req.files.content_image[0].path) && fs.unlinkSync(req.files.content_image[0].path);
        req.files?.content_video?.[0]?.path && fs.existsSync(req.files.content_video[0].path) && fs.unlinkSync(req.files.content_video[0].path);
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
        const content = await Content.find({ classCategoryId }).populate('classCategoryId').populate('styleId')
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
            return ThrowError(res, 400, "Invalid classCategory ID");
        }
        const content = await Content.find({ styleId }).populate('classCategoryId').populate('styleId');
        if (!content.length) {
            return sendSuccessResponse(res, "No content found for this Style", []);
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
        res.status(200).json(content);
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

        if (imageFile) {
            if (content.content_image) {
                const oldImagePath = path.resolve(`public/content_images/${content.content_image}`);
                fs.existsSync(oldImagePath) && fs.unlinkSync(oldImagePath);
            }
            content.content_image = imageFile.filename;
        }

        if (videoFile) {
            if (content.content_video) {
                const oldVideoPath = path.resolve(`public/content_videos/${content.content_video}`);
                fs.existsSync(oldVideoPath) && fs.unlinkSync(oldVideoPath);
            }
            content.content_video = videoFile.filename;
        }

        // ✅ Update fields
        content.level_name = level_name ?? content.level_name;
        content.video_title = video_title ?? content.video_title;
        content.video_time = video_time ?? content.video_time;
        content.video_description = video_description ?? content.video_description;
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

        if (existingContent.content_video) {
            const videoPath = path.resolve(`public/content_videos/${existingContent.content_video}`);
            fs.existsSync(videoPath) && fs.unlinkSync(videoPath);
        }
        if (existingContent.content_image) {
            const imagePath = path.resolve(`public/content_images/${existingContent.content_image}`);
            fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
        }

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
        const style = await Style.findOne({ style_title: "HipHop" });

        if (!style) {
            return sendNotFoundResponse(res, "HipHop style not found.");
        }

        const content = await Content.find({ styleId: style._id })
            .sort({ createdAt: -1 })
            .populate('classCategoryId')
            .populate('styleId');

        if (!content || content.length === 0) {
            return sendNotFoundResponse(res, "No HipHop Content found.");
        }

        return sendSuccessResponse(res, "HipHop Content fetched successfully", content);
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
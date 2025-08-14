import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import PlanVideo from "../models/planVideoModel.js";
import PlanDetails from "../models/planDetailsModel.js";
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

export const createPlanVideo = async (req, res) => {
    try {
        const {
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            planDetailsId,
        } = req.body;

        // Validate required fields
        if (!level_name || !video_title || !video_time || !burn || !planDetailsId) {
            await deleteS3KeyIfAny(req.files?.plan_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.plan_video?.[0]?.key);
            return ThrowError(res, 400, "All fields are required.");
        }

        if (!mongoose.Types.ObjectId.isValid(planDetailsId)) {
            await deleteS3KeyIfAny(req.files?.plan_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.plan_video?.[0]?.key);
            return ThrowError(res, 400, "Invalid planDetailsId.");
        }

        const planDetails = await PlanDetails.findById(planDetailsId);
        if (!planDetails) {
            await deleteS3KeyIfAny(req.files?.plan_image?.[0]?.key);
            await deleteS3KeyIfAny(req.files?.plan_video?.[0]?.key);
            return sendNotFoundResponse(res, "planDetailsId not found.");
        }

        // ✅ VALIDATION #1: Restrict video count per planDetails
        const existingVideos = await PlanVideo.countDocuments({ planDetailsId });
        if (existingVideos >= planDetails.total_workout) {
            req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
            req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
            return ThrowError(res, 400, `This planDetails already has maximum allowed videos (${planDetails.total_workout}).`);
        }

        // ✅ VALIDATION #2: Restrict time range
        const parsedVideoTime = parseInt(video_time);
        const parsedStartTime = parseInt(planDetails.startTime);
        const parsedEndTime = parseInt(planDetails.endTime);

        if (isNaN(parsedVideoTime) || parsedVideoTime < parsedStartTime || parsedVideoTime > parsedEndTime) {
            req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
            req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
            return ThrowError(res, 400, `Video time must be between ${parsedStartTime} and ${parsedEndTime} minutes.`);
        }

        const planImageFile = req.files?.plan_image?.[0];
        const planVideoFile = req.files?.plan_video?.[0];

        if (!planImageFile && !planVideoFile) {
            return res.status(400).json({
                msg: "At least one of image or video is required.",
                data: null
            });
        }

        const planImageKey = planImageFile?.key || null;
        const planVideoKey = planVideoFile?.key || null;

        const duplicate = await PlanVideo.findOne({
            video_title,
            planDetailsId,
        });

        if (duplicate) {
            await deleteS3KeyIfAny(planImageKey);
            await deleteS3KeyIfAny(planVideoKey);
            return ThrowError(res, 400, "A video with the same title already exists in one of the selected planDetailsId");
        }

        const newPlanVideo = await PlanVideo.create({
            plan_image: planImageKey ? publicUrlForKey(planImageKey) : null,
            plan_image_key: planImageKey,
            plan_video: planVideoKey ? publicUrlForKey(planVideoKey) : null,
            plan_video_key: planVideoKey,
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            planDetailsId,
        });

        await PlanDetails.findByIdAndUpdate(
            planDetailsId,
            { $push: { planVideo: newPlanVideo._id } }
        );

        return res.status(201).json({
            status: true,
            message: "PlanVideo created successfully",
            data: newPlanVideo
        });
    } catch (error) {
        await deleteS3KeyIfAny(req.files?.plan_image?.[0]?.key);
        await deleteS3KeyIfAny(req.files?.plan_video?.[0]?.key);
        return ThrowError(res, 500, error.message);
    }
};

// Get all planVideo for a particular plan
export const getPlanVideoByPlanDetailsId = async (req, res) => {
    try {
        const { planDetailsId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(planDetailsId)) {
            return ThrowError(res, 400, "Invalid classCategory ID");
        }
        const planVideo = await PlanVideo.find({ planDetailsId }).populate('planDetailsId')
        if (!planVideo.length) {
            return sendSuccessResponse(res, "No PlanVideo found for this Plan", []);
        }

        return sendSuccessResponse(res, "PlanVideo fetched successfully", planVideo);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get All PlanVideo
export const getAllPlanVideo = async (req, res) => {
    try {
        const planVideo = await PlanVideo.find().sort({ createdAt: -1 })

        if (!planVideo || planVideo.length === 0) {
            return sendNotFoundResponse(res, "No any PlanVideo found!!!")
        }

        return sendSuccessResponse(res, "PlanVideo fetched successfully...", planVideo)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

// Get PlanVideo by ID
export const getPlanVideoById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid PlanVideo ID");
        }

        const planVideo = await PlanVideo.findById(req.params.id).populate('planDetailsId')
        if (!planVideo) {
            return ThrowError(res, 404, "planVideo not found");
        }

        return sendSuccessResponse(res, "PlanVideo fetched successfully...", planVideo)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update a PlanVideo
export const updatePlanVideo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid PlanVideo ID");
        }

        const {
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            planDetailsId,
        } = req.body;

        const planVideo = await PlanVideo.findById(id);
        if (!planVideo) {
            return ThrowError(res, 404, "PlanVideo not found");
        }

        // Validate planDetailsId
        if (planDetailsId) {
            if (!mongoose.Types.ObjectId.isValid(planDetailsId)) {
                return ThrowError(res, 400, "Invalid planDetailsId");
            }

            const planDetailsExists = await PlanDetails.findById(planDetailsId);
            if (!planDetailsExists) {
                return sendNotFoundResponse(res, "planDetailsId not found");
            }
            planVideo.planDetailsId = planDetailsId;
        }

        // File updates
        const imageFile = req.files?.['plan_image']?.[0];
        const videoFile = req.files?.['plan_video']?.[0];

        if (imageFile?.key) {
            await deleteS3KeyIfAny(planVideo.plan_image_key || (() => { try { const u = new URL(planVideo.plan_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
            planVideo.plan_image = publicUrlForKey(imageFile.key);
            planVideo.plan_image_key = imageFile.key;
        }

        if (videoFile?.key) {
            await deleteS3KeyIfAny(planVideo.plan_video_key || (() => { try { const u = new URL(planVideo.plan_video); return u.pathname.replace(/^\//,''); } catch { return null; } })());
            planVideo.plan_video = publicUrlForKey(videoFile.key);
            planVideo.plan_video_key = videoFile.key;
        }

        // Update text fields
        planVideo.level_name = level_name ?? planVideo.level_name;
        planVideo.video_title = video_title ?? planVideo.video_title;
        planVideo.video_time = video_time ?? planVideo.video_time;
        planVideo.video_description = video_description ?? planVideo.video_description;
        planVideo.burn = burn ?? planVideo.burn;

        const updated = await planVideo.save();
        return sendSuccessResponse(res, "planVideo updated successfully", updated);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete a planVideo
export const deletePlanVideo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return ThrowError(res, 400, "Invalid PlanVideo ID");
        }

        const existingPlanVideo = await PlanVideo.findById(id);
        if (!existingPlanVideo) {
            return sendErrorResponse(res, 404, "PlanVideo not found");
        }

        await deleteS3KeyIfAny(existingPlanVideo.plan_image_key || (() => { try { const u = new URL(existingPlanVideo.plan_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
        await deleteS3KeyIfAny(existingPlanVideo.plan_video_key || (() => { try { const u = new URL(existingPlanVideo.plan_video); return u.pathname.replace(/^\//,''); } catch { return null; } })());

        // Remove from PlanDetails
        if (existingPlanVideo.planDetailsId) {
            await PlanDetails.findByIdAndUpdate(
                existingPlanVideo.planDetailsId,
                { $pull: { planVideo: existingPlanVideo._id } }
            );
        }

        // Delete DB record
        const deletedPlanVideo = await PlanVideo.findByIdAndDelete(id);

        return sendSuccessResponse(res, "PlanVideo and associated files deleted successfully", deletedPlanVideo);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
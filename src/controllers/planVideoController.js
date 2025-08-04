import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import PlanVideo from "../models/planVideoModel.js";
import PlanDetails from "../models/planDetailsModel.js";
import fs from "fs"
import path from "path";

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
            req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
            req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
            return ThrowError(res, 400, "All fields are required.");
        }

        if (!mongoose.Types.ObjectId.isValid(planDetailsId)) {
            req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
            req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
            return ThrowError(res, 400, "Invalid planDetailsId.");
        }

        const planDetails = await PlanDetails.findById(planDetailsId);
        if (!planDetails) {
            req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
            req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
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

        const planImage = planImageFile?.filename || null;
        const planVideo = planVideoFile?.filename || null;

        const duplicate = await PlanVideo.findOne({
            video_title,
            planDetailsId,
        });

        if (duplicate) {
            planImageFile?.path && fs.existsSync(planImageFile.path) && fs.unlinkSync(planImageFile.path);
            planVideoFile?.path && fs.existsSync(planVideoFile.path) && fs.unlinkSync(planVideoFile.path);
            return ThrowError(res, 400, "A video with the same title already exists in one of the selected planDetailsId");
        }

        const newPlanVideo = await PlanVideo.create({
            plan_image: planImage,
            plan_video: planVideo,
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
            data: {
                planVideo: newPlanVideo,
                fileInfo: {
                    image: planImageFile
                        ? {
                            url: `/public/plan_images/${planImage}`,
                            type: planImageFile.mimetype,
                            size: planImageFile.size
                        }
                        : null,
                    video: planVideoFile
                        ? {
                            url: `/public/plan_videos/${planVideo}`,
                            type: planVideoFile.mimetype,
                            size: planVideoFile.size
                        }
                        : null
                }
            }
        });
    } catch (error) {
        req.files?.plan_image?.[0]?.path && fs.existsSync(req.files.plan_image[0].path) && fs.unlinkSync(req.files.plan_image[0].path);
        req.files?.plan_video?.[0]?.path && fs.existsSync(req.files.plan_video[0].path) && fs.unlinkSync(req.files.plan_video[0].path);
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

        const baseImageUrl = "/public/plan_images/";
        const baseVideoUrl = "/public/plan_videos/";

        const modifiedResult = planVideo.map(video => ({
            ...video.toObject(),
            plan_image: video.plan_image ? baseImageUrl + video.plan_image : null,
            plan_video: video.plan_video ? baseVideoUrl + video.plan_video : null
        }));

        return sendSuccessResponse(res, "PlanVideo fetched successfully", modifiedResult);
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

        const baseImageUrl = "/public/plan_images/";
        const baseVideoUrl = "/public/plan_videos/";

        const modifiedResult = planVideo.map(video => ({
            ...video.toObject(),
            plan_image: video.plan_image ? baseImageUrl + video.plan_image : null,
            plan_video: video.plan_video ? baseVideoUrl + video.plan_video : null
        }));

        return sendSuccessResponse(res, "PlanVideo fetched successfully...", modifiedResult)
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

        const baseImageUrl = "/public/plan_images/";
        const baseVideoUrl = "/public/plan_videos/";

        const modifiedResult = {
            ...planVideo.toObject(),
            plan_image: planVideo.plan_image ? baseImageUrl + planVideo.plan_image : null,
            plan_video: planVideo.plan_video ? baseVideoUrl + planVideo.plan_video : null
        };

        return sendSuccessResponse(res, "PlanVideo fetched successfully...", modifiedResult)
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
        // ✅ Validate planDetailsId (single ObjectId)
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

        // ✅ File updates
        const imageFile = req.files?.['plan_image']?.[0];
        const videoFile = req.files?.['plan_video']?.[0];

        if (imageFile) {
            if (planVideo.plan_image) {
                const oldImagePath = path.resolve(`public/plan_images/${planVideo.plan_image}`);
                fs.existsSync(oldImagePath) && fs.unlinkSync(oldImagePath);
            }
            planVideo.plan_image = imageFile.filename;
        }

        if (videoFile) {
            if (planVideo.plan_video) {
                const oldVideoPath = path.resolve(`public/plan_videos/${planVideo.plan_video}`);
                fs.existsSync(oldVideoPath) && fs.unlinkSync(oldVideoPath);
            }
            planVideo.plan_video = videoFile.filename;
        }

        // ✅ Update fields
        planVideo.level_name = level_name ?? planVideo.level_name;
        planVideo.video_title = video_title ?? planVideo.video_title;
        planVideo.video_time = video_time ?? planVideo.video_time;
        planVideo.video_description = video_description ?? planVideo.video_description;
        planVideo.burn = burn ?? planVideo.burn;
        planDetailsId: planDetailsId ?? planVideo.planDetailsId

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

        // Find the PlanVideo first to get the file URLs
        const existingPlanVideo = await PlanVideo.findById(id);
        if (!existingPlanVideo) {
            return sendErrorResponse(res, 404, "PlanVideo not found");
        }

        if (existingPlanVideo.plan_video) {
            const videoPath = path.resolve(`public/plan_videos/${existingPlanVideo.plan_video}`);
            fs.existsSync(videoPath) && fs.unlinkSync(videoPath);

        }
        if (existingPlanVideo.plan_image) {
            const imagePath = path.resolve(`public/plan_images/${existingPlanVideo.plan_image}`);
            fs.existsSync(imagePath) && fs.unlinkSync(imagePath);
        }

        if (existingPlanVideo.planDetailsId) {
            await PlanDetails.findByIdAndUpdate(
                existingPlanVideo.planDetailsId,
                { $pull: { planVideo: existingPlanVideo._id } }
            );
        }

        // Delete the PlanVideo from database
        const deletedPlanVideo = await PlanVideo.findByIdAndDelete(id);

        return sendSuccessResponse(res, "PlanVideo and associated files deleted successfully", deletedPlanVideo);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
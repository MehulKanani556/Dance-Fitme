import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils";
import Content from "../models/contentModel";


export const createContent = async (req, res) => {
    try {
        const {
            video_name,
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            classCategoryId
        } = req.body;

        // Validate required fields
        if (
            !video_name ||
            !level_name ||
            !video_title ||
            !video_time ||
            !video_description ||
            !burn ||
            !classCategoryId
        ) {
            return ThrowError(res, 400, "All fields are required.");
        }

        // Validate video upload
        if (!req.files || !req.files.video || !req.files.video[0]) {
            return ThrowError(res, 400, "Video file is missing.");
        }

        const videoFile = req.files.video[0];
        const videoPath = videoFile.path || videoFile.location || "";

        if (!mongoose.Types.ObjectId.isValid(classCategoryId)) {
            // Delete uploaded video if ID is invalid
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            return ThrowError(res, 400, "Invalid classCategoryId");
        }

        // Optional: check if content with same title exists in category
        const duplicate = await Content.findOne({ classCategoryId, video_title });
        if (duplicate) {
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            return ThrowError(res, 400, "A video with the same title already exists in this category.");
        }

        // Create and save new content
        const newContent = await Content.create({
            video_name,
            content_video: videoPath,
            level_name,
            video_title,
            video_time,
            video_description,
            burn,
            classCategoryId
        });

        return res.status(201).json({
            status: true,
            message: "Content created successfully",
            data: {
                content: newContent,
                fileInfo: {
                    video: {
                        url: videoPath,
                        type: videoFile.mimetype,
                        size: videoFile.size
                    }
                }
            }
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
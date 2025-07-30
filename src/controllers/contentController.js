import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Content from "../models/contentModel.js";
import { sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import ClassCategory from "../models/classCategoryModel.js";
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
            classCategoryId
        } = req.body;

        // Validate required fields
        if (!level_name || !video_title || !video_time || !video_description || !burn || !classCategoryId) {
            return ThrowError(res, 400, "All fields are required.");
        }

        // Validate classCategoryId
        if (!mongoose.Types.ObjectId.isValid(classCategoryId)) {
            return ThrowError(res, 400, "Invalid classCategoryId.");
        }

        const classCategory = await ClassCategory.findById(classCategoryId);
        if (!classCategory) {
            return sendNotFoundResponse(res, "classCategoryId not found...");
        }

        // At least one media file should be uploaded
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

        // Check for duplicate title in the same category
        const duplicate = await Content.findOne({ classCategoryId, video_title });
        if (duplicate) {
            contentImageFile?.path && fs.existsSync(contentImageFile.path) && fs.unlinkSync(contentImageFile.path);
            contentVideoFile?.path && fs.existsSync(contentVideoFile.path) && fs.unlinkSync(contentVideoFile.path);
            return ThrowError(res, 400, "A video with the same title already exists in this category.");
        }

        // Create content
        const newContent = await Content.create({
            content_image: contentImage,
            content_video: contentVideo,
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
        // Cleanup on error
        const contentImageFile = req.files?.content_image?.[0];
        const contentVideoFile = req.files?.content_video?.[0];
        contentImageFile?.path && fs.existsSync(contentImageFile.path) && fs.unlinkSync(contentImageFile.path);
        contentVideoFile?.path && fs.existsSync(contentVideoFile.path) && fs.unlinkSync(contentVideoFile.path);

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
        const content = await Content.find({ classCategoryId })
        if (!content.length) {
            return sendSuccessResponse(res, "No content found for this Category", []);
        }

        return sendSuccessResponse(res, "Content fetched successfully", content);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get content by ID
export const getContentById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return ThrowError(res, 400, "Invalid Content ID");
        }
        const content = await Content.findById(req.params.id).populate('classCategoryId');
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
            classCategoryId
        } = req.body;

        const content = await Content.findById(id);
        if (!content) {
            return ThrowError(res, 404, "Content not found");
        }

        if (classCategoryId && !mongoose.Types.ObjectId.isValid(classCategoryId)) {
            return ThrowError(res, 400, "Invalid classCategoryId");
        }

        const classCategory = await ClassCategory.findById(classCategoryId);
        if (!classCategory) {
            return sendNotFoundResponse(res, "classCategoryId not found...");
        }

        // Delete old files if new files provided
        const imageFile = req.files?.['content_image']?.[0];
        const videoFile = req.files?.['content_video']?.[0];

        if (imageFile && content.content_image) {
            const oldImagePath = path.resolve(`public/content_images/${content.content_image}`);
            fs.existsSync(oldImagePath) && fs.unlinkSync(oldImagePath);
            content.content_image = imageFile.filename;
        }

        if (videoFile && content.content_video) {
            const oldVideoPath = path.resolve(`public/content_videos/${content.content_video}`);
            fs.existsSync(oldVideoPath) && fs.unlinkSync(oldVideoPath);
            content.content_video = videoFile.filename;
        }

        // Update fields
        content.level_name = level_name ?? content.level_name;
        content.video_title = video_title ?? content.video_title;
        content.video_time = video_time ?? content.video_time;
        content.video_description = video_description ?? content.video_description;
        content.burn = burn ?? content.burn;
        content.classCategoryId = classCategoryId ?? content.classCategoryId;

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
import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Style from "../models/styleModel.js";
import { sendBadRequestResponse, sendCreatedResponse, sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from "fs"

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


// Create Style
export const createStyle = async (req, res) => {
    try {
        const { style_title } = req.body;

        if (!style_title) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "style_title is required");
        }

        const existingStyle = await Style.findOne({ style_title });
        if (existingStyle) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "This style already exists");
        }

        let style_image = null;
        let style_image_key = null;
        if (req.file?.key) {
            style_image = publicUrlForKey(req.file.key);
            style_image_key = req.file.key;
        }

        const newStyle = await Style.create({
            style_title,
            style_image,
            style_image_key
        });

        return sendCreatedResponse(res, "Style added successfully", newStyle);
    } catch (error) {
        // nothing to clean up; uploads already in S3
        return ThrowError(res, 500, error.message);
    }
};
// Get all Style
export const getAllStyle = async (req, res) => {
    try {
        const style = await Style.find()

        if (!style || style.length === 0) {
            return sendBadRequestResponse(res, "No style found", []);
        }

        return sendSuccessResponse(res, "Style fetched successfully", style);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Style by ID
export const getstyleById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid style ID");
        }

        const style = await Style.findById(id)
        if (!style) {
            return sendErrorResponse(res, 404, "Style not found");
        }

        return sendSuccessResponse(res, "Style retrieved successfully", style);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update Style
export const updateStyle = async (req, res) => {
    try {
        const { id } = req.params;
        const { style_title } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Style ID");
        }

        const existingStyle = await Style.findById(id);
        if (!existingStyle) {
            return sendErrorResponse(res, 404, "Style not found");
        }

        if (req.file?.key) {
            await deleteS3KeyIfAny(existingStyle.style_image_key || (() => { try { const u = new URL(existingStyle.style_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
            existingStyle.style_image = publicUrlForKey(req.file.key);
            existingStyle.style_image_key = req.file.key;
        }

        if (style_title) existingStyle.style_title = style_title;

        await existingStyle.save();

        return sendSuccessResponse(res, "Style updated successfully", existingStyle);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete Style
export const deleteStyle = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Style ID");
        }

        const style = await Style.findByIdAndDelete(id);
        if (!style) {
            return sendErrorResponse(res, 404, "Style not found");
        }

        if (style.style_image) {
            await deleteS3KeyIfAny(style.style_image_key || (() => { try { const u = new URL(style.style_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
        }

        return sendSuccessResponse(res, "Style deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
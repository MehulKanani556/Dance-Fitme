import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import Style from "../models/styleModel.js";
import { sendBadRequestResponse, sendCreatedResponse, sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import fs from "fs"
import path from "path";


//craete Style
export const createStyle = async (req, res) => {
    try {
        const { style_title } = req.body

        if (!style_title) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "style_title are required");
        }

        const existingStyle = await Style.findOne({ style_title });
        if (existingStyle) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "This style is already assigned to this Style");
        }

        let style_image = null;
        if (req.file) {
            style_image = `/public/style_image/${path.basename(req.file.path)}`;
        }

        const newStyle = await Style.create({
            style_title,
            style_image
        });

        return sendCreatedResponse(res, "Style added successfully", newStyle);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
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

// Update Style (Admin only)
export const updateStyle = async (req, res) => {
    try {
        const { id } = req.params;
        const { style_title } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Invalid Style ID");
        }

        const existingStyle = await Style.findById(id);
        if (!existingStyle) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendErrorResponse(res, 404, "Style not found");
        }

        if (req.file) {
            const newImagePath = `/public/style_images/${req.file.filename}`;

            // ✅ Delete old image if it exists and is different
            if (existingStyle.style_image) {
                const oldImageName = existingStyle.style_image.split("/").pop();
                const oldImagePath = path.join("public", "style_images", oldImageName);

                if (
                    fs.existsSync(oldImagePath) &&
                    oldImageName !== req.file.filename
                ) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // ✅ Set new image path
            existingStyle.style_image = newImagePath;
        }


        if (style_title) existingStyle.style_title = style_title;

        await existingStyle.save();

        return sendSuccessResponse(res, "Style updated successfully", existingStyle);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Delete Style (Admin only)
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
            const imagePath = path.join(process.cwd(), style.style_image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        return sendSuccessResponse(res, "Style deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

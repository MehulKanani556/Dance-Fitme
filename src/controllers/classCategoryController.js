import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import ClassCategory from "../models/classCategoryModel.js";
import { sendBadRequestResponse, sendCreatedResponse, sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import fs from "fs"
import path from "path";


//craete ClassCategory
export const createClassCategory = async (req, res) => {
    try {
        const { classCategory_title } = req.body

        if (!classCategory_title) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "classCategory_title are required");
        }

        const existingClassCategory = await ClassCategory.findOne({ classCategory_title });
        if (existingClassCategory) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "This classCategory is already assigned to this class");
        }

        let classCategory_image = null;
        if (req.file) {
            classCategory_image = `/public/classCategory_image/${path.basename(req.file.path)}`;
        }

        const newClassCategory = await ClassCategory.create({
            classCategory_title,
            classCategory_image
        });

        return sendCreatedResponse(res, "ClassCategory added successfully", newClassCategory);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Get all ClassCategory
export const getAllClassCategory = async (req, res) => {
    try {
        const classCategory = await ClassCategory.find()

        if (!classCategory || classCategory.length === 0) {
            return sendBadRequestResponse(res, "No classCategory found", []);
        }

        return sendSuccessResponse(res, "ClassCategory fetched successfully", classCategory);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get ClassCategory by ID
export const getClassCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        const classCategory = await ClassCategory.findById(id)
        if (!classCategory) {
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        return sendSuccessResponse(res, "ClassCategory retrieved successfully", classCategory);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update ClassCategory (Admin only)
export const updateClassCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { classCategory_title } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        const existingClassCategory = await ClassCategory.findById(id);
        if (!existingClassCategory) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        if (req.file) {
            const newImagePath = `/public/classCategory_image/${path.basename(req.file.path)}`;
            if (existingClassCategory.classCategory_image) {
                const oldImagePath = path.join(process.cwd(), existingClassCategory.classCategory_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            existingClassCategory.classCategory_image = newImagePath;
        }

        if (classCategory_title) existingClassCategory.classCategory_title = classCategory_title;

        await existingClassCategory.save();

        return sendSuccessResponse(res, "ClassCategory updated successfully", existingClassCategory);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Delete ClassCategory (Admin only)
export const deleteClassCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        const classCategory = await ClassCategory.findByIdAndDelete(id);
        if (!classCategory) {
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        if (classCategory.classCategory_image) {
            const imagePath = path.join(process.cwd(), classCategory.classCategory_image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        return sendSuccessResponse(res, "ClassCategory deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

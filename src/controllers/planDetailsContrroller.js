import mongoose from "mongoose";
import PlanDetails from "../models/planDetailsModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import fs from "fs"
import path from "path";

export const createPlan = async (req, res) => {
    try {
        const { plan_title, total_workout, startTime, endTime, description } = req.body;

        // ✅ Required fields validation
        if (!plan_title || !total_workout || !startTime || !endTime || !description) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "All fields are required!");
        }

        // ✅ Check for duplicate plan title
        const existingPlan = await PlanDetails.findOne({ plan_title: plan_title.trim() });
        if (existingPlan) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "This plan already exists.");
        }

        // ✅ Handle image path
        let planDetails_image = null;
        if (req.file) {
            planDetails_image = `/public/planDetails_images/${req.file.filename}`;
        }

        // ✅ Create new plan
        const newPlan = new PlanDetails({
            plan_title: plan_title.trim(),
            total_workout,
            startTime,
            endTime,
            description,
            planDetails_image
        });

        await newPlan.save();

        return sendSuccessResponse(res, "PlanDetails added successfully", newPlan);

    } catch (error) {
        // ✅ Cleanup uploaded image if error occurs
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(path.resolve(req.file.path));
        }
        return ThrowError(res, 500, error.message);
    }
};

// Get all PlanDetails
export const getAllPlanDetails = async (req, res) => {
    try {
        const planDetails = await PlanDetails.find()

        if (!planDetails || planDetails.length === 0) {
            return sendNotFoundResponse(res, "No PlanDetails found", []);
        }

        return sendSuccessResponse(res, "PlanDetails fetched successfully", planDetails);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get PlanDetails by ID
export const getPlanDetailsById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PlanDetails ID");
        }

        const planDetails = await PlanDetails.findById(id)
        if (!planDetails) {
            return sendNotFoundResponse(res, 404, "PlanDetails not found");
        }

        return sendSuccessResponse(res, "PlanDetails retrieved successfully", planDetails);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update PlanDetails (Admin only)
export const updatePlanDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_title, total_workout, startTime, endTime, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendBadRequestResponse(res, "Invalid PlanDetails ID");
        }

        const existingPlanDetails = await PlanDetails.findById(id);
        if (!existingPlanDetails) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendNotFoundResponse(res, 404, "PlanDetails not found");
        }

        if (req.file) {
            const newImagePath = `/public/planDetails_images/${req.file.filename}`;

            // ✅ Delete old image if it exists and is different
            if (existingPlanDetails.planDetails_image) {
                const oldImageName = existingPlanDetails.planDetails_image.split("/").pop();
                const oldImagePath = path.join("public", "planDetails_images", oldImageName);

                if (
                    fs.existsSync(oldImagePath) &&
                    oldImageName !== req.file.filename
                ) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // ✅ Set new image path
            existingPlanDetails.planDetails_image = newImagePath;
        }


        if (plan_title) existingPlanDetails.plan_title = plan_title;
        if (total_workout) existingPlanDetails.total_workout = total_workout;
        if (startTime) existingPlanDetails.startTime = startTime;
        if (endTime) existingPlanDetails.endTime = endTime;
        if (description) existingPlanDetails.description = description;

        await existingPlanDetails.save();

        return sendSuccessResponse(res, "PlanDetails updated successfully", existingPlanDetails);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return ThrowError(res, 500, error.message);
    }
};

// Delete PlanDetails (Admin only)
export const deletePlanDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PlanDetails ID");
        }

        const planDetails = await PlanDetails.findByIdAndDelete(id);
        if (!planDetails) {
            return sendNotFoundResponse(res, "PlanDetails not found");
        }

        if (planDetails.planDetails_image) {
            const imagePath = path.join(process.cwd(), planDetails.planDetails_image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        return sendSuccessResponse(res, "PlanDetails deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

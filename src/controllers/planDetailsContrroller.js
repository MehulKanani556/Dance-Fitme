import mongoose from "mongoose";
import PlanDetails from "../models/planDetailsModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
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

export const createPlan = async (req, res) => {
    try {
        const { plan_title, total_workout, startTime, endTime, description } = req.body;

        // ✅ Required fields validation
        if (!plan_title || !total_workout || !startTime || !endTime || !description) {
            await deleteS3KeyIfAny(req.file?.key);
            return sendBadRequestResponse(res, "All fields are required!");
        }

        // ✅ Check for duplicate plan title
        const existingPlan = await PlanDetails.findOne({ plan_title: plan_title.trim() });
        if (existingPlan) {
            await deleteS3KeyIfAny(req.file?.key);
            return sendBadRequestResponse(res, "This plan already exists.");
        }

        // ✅ Handle image path
        let planDetails_image = null;
        let planDetails_image_key = null;
        if (req.file?.key) {
            planDetails_image = publicUrlForKey(req.file.key);
            planDetails_image_key = req.file.key;
        }

        // ✅ Create new plan
        const newPlan = new PlanDetails({
            plan_title: plan_title.trim(),
            total_workout,
            startTime,
            endTime,
            description,
            planDetails_image,
            planDetails_image_key
        });

        await newPlan.save();

        return sendSuccessResponse(res, "PlanDetails added successfully", newPlan);

    } catch (error) {
        await deleteS3KeyIfAny(req.file?.key);
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
            await deleteS3KeyIfAny(req.file?.key);
            return sendBadRequestResponse(res, "Invalid PlanDetails ID");
        }

        const existingPlanDetails = await PlanDetails.findById(id);
        if (!existingPlanDetails) {
            await deleteS3KeyIfAny(req.file?.key);
            return sendNotFoundResponse(res, 404, "PlanDetails not found");
        }

        if (req.file?.key) {
            await deleteS3KeyIfAny(existingPlanDetails.planDetails_image_key || (() => { try { const u = new URL(existingPlanDetails.planDetails_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
            existingPlanDetails.planDetails_image = publicUrlForKey(req.file.key);
            existingPlanDetails.planDetails_image_key = req.file.key;
        }


        if (plan_title) existingPlanDetails.plan_title = plan_title;
        if (total_workout) existingPlanDetails.total_workout = total_workout;
        if (startTime) existingPlanDetails.startTime = startTime;
        if (endTime) existingPlanDetails.endTime = endTime;
        if (description) existingPlanDetails.description = description;

        await existingPlanDetails.save();

        return sendSuccessResponse(res, "PlanDetails updated successfully", existingPlanDetails);
    } catch (error) {
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
            await deleteS3KeyIfAny(planDetails.planDetails_image_key || (() => { try { const u = new URL(planDetails.planDetails_image); return u.pathname.replace(/^\//,''); } catch { return null; } })());
        }

        return sendSuccessResponse(res, "PlanDetails deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

import mongoose from "mongoose";
import Weight from "../models/weightModel.js";
import { sendSuccessResponse, sendNotFoundResponse, sendBadRequestResponse } from "../utils/ResponseUtils.js";
import { ThrowError } from "../utils/ErrorUtils.js";

export const createWeight = async (req, res) => {
    try {
        const { starting, target, unit } = req.body;

        if (!starting || !target || !unit) {
            return sendBadRequestResponse(res, 400, "All fields are required");
        }

        // Check if weight already exists for this user
        const existingWeight = await Weight.findOne({ userId: req.user._id });

        if (existingWeight) {
            return sendBadRequestResponse(res, "Weight already exists. You can only update it.");
        }

        const weight = await Weight.create({ userId: req.user._id, starting, target, unit });

        return sendSuccessResponse(res, "Weight created successfully", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

export const getAllWeight = async (req, res) => {
    try {
        const weight = await Weight.find({ userId: req.user._id }).sort({ createdAt: -1 });

        if (!weight || weight.length === 0) {
            return sendNotFoundResponse(res, "No any weight found...");
        }

        return sendSuccessResponse(res, "Weight fetched successfully", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

export const getWeightByUser = async (req, res) => {
    try {
        const weight = await Weight.findOne({ userId: req.user._id });

        if (!weight) {
            return sendNotFoundResponse(res, "Weight not found for this user.");
        }

        return sendSuccessResponse(res, "Weight fetched successfully", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateWeight = async (req, res) => {
    try {
        const { starting, target, unit } = req.body;

        // Step 1: Find the weight by ID first
        const weight = await Weight.findById(req.params.id);

        if (!weight) {
            return sendNotFoundResponse(res, "Weight not found...");
        }

        if (weight.userId.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 403, "You are not authorized to update this weight...");
        }

        // Step 3: Now update
        if (starting !== undefined) weight.starting = starting;
        if (target !== undefined) weight.target = target;
        if (unit !== undefined) weight.unit = unit;

        await weight.save();

        return sendSuccessResponse(res, "Weight updated successfully", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }

}

export const deleteWeight = async (req, res) => {
    try {

        const weight = await Weight.findById(req.params.id);

        if (!weight) {
            return sendNotFoundResponse(res, "Weight not found...");
        }

        if (weight.userId.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 403, "You are not authorized to update this weight...");
        }

        await weight.deleteOne();

        return sendSuccessResponse(res, "Weight deleted successfully", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

export const addRecord = async (req, res) => {
    try {
        const { value, unit } = req.body;

        if (!value || !unit) {
            return sendBadRequestResponse(res, 400, "Value and unit are required.");
        }

        const weight = await Weight.findById(req.params.id);

        if (!weight) {
            return sendNotFoundResponse(res, "Weight not found...");
        }

        if (weight.userId.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, "You are not authorized to update this weight...");
        }

        const now = new Date();
        const day = now.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();

        const existingIndex = weight.history.findIndex(record =>
            record.unit === unit &&
            record.date === day &&
            record.month === month &&
            record.year === year
        );


        if (existingIndex !== -1) {
            // Replace existing record
            weight.history[existingIndex].value = value;
        } else {
            // Add new record
            weight.history.push({ value, unit, date: day, month, year });
        }

        await weight.save();

        return sendSuccessResponse(res, "Record added/updated in history", weight);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
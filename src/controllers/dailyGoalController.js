import DailyGoal from "../models/dailyGoalModel.js";
import { sendSuccessResponse, sendNotFoundResponse, sendBadRequestResponse } from "../utils/ResponseUtils.js";
import { ThrowError } from "../utils/ErrorUtils.js";

// Create Daily Goal
export const createDailyGoal = async (req, res) => {
    try {
        const { energy, workout } = req.body;

        if (!energy || !workout) {
            return sendBadRequestResponse(res, 400, "All fields are required");
        }

        const existingGoal = await DailyGoal.findOne({ userId: req.user._id });
        if (existingGoal) {
            return sendBadRequestResponse(res, "DailyGoal already exists. You can only update it.");
        }

        const goal = await DailyGoal.create({ userId: req.user._id, energy, workout });
        return sendSuccessResponse(res, "DailyGoal created successfully", goal);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get All Daily Goals (for a user - historical if needed)
export const getAllDailyGoals = async (req, res) => {
    try {
        const goals = await DailyGoal.find({ userId: req.user._id }).sort({ createdAt: -1 });

        if (!goals.length) {
            return sendNotFoundResponse(res, "No daily goals found...");
        }

        return sendSuccessResponse(res, "Daily goals fetched successfully", goals);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Current User's Daily Goal
export const getDailyGoalByUser = async (req, res) => {
    try {
        const goal = await DailyGoal.findOne({ userId: req.user._id });

        if (!goal) {
            return sendNotFoundResponse(res, "DailyGoal not found for this user.");
        }

        return sendSuccessResponse(res, "DailyGoal fetched successfully", goal);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update Daily Goal
export const updateDailyGoal = async (req, res) => {
    try {
        const { energy, workout } = req.body;
        const goal = await DailyGoal.findById(req.params.id);

        if (!goal) {
            return sendNotFoundResponse(res, "DailyGoal not found...");
        }

        if (goal.userId.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 403, "You are not authorized to update this DailyGoal...");
        }

        if (energy !== undefined) goal.energy = energy;
        if (workout !== undefined) goal.workout = workout;

        await goal.save();

        return sendSuccessResponse(res, "DailyGoal updated successfully", goal);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete Daily Goal
export const deleteDailyGoal = async (req, res) => {
    try {
        const goal = await DailyGoal.findById(req.params.id);

        if (!goal) {
            return sendNotFoundResponse(res, "DailyGoal not found...");
        }

        if (goal.userId.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 403, "You are not authorized to delete this DailyGoal...");
        }

        await goal.deleteOne();
        return sendSuccessResponse(res, "DailyGoal deleted successfully", goal);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
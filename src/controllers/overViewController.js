import mongoose, { Query } from "mongoose";
import OverView from "../models/overViewModel.js";
import Content from "../models/contentModel.js"
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";

export const createOverviewVideo = async (req, res) => {
    try {
        const { day_No, week_No, week_Title, contentId } = req.body

        if (!day_No || !week_No || !week_Title || !contentId) {
            return sendBadRequestResponse(res, "All filed are required...")
        }

        const parsedContentIds = typeof contentId === "string" ? JSON.parse(contentId) : contentId;
        const contentIds = Array.isArray(parsedContentIds) ? parsedContentIds : [parsedContentIds];

        if (contentIds.length !== 2) {
            return sendBadRequestResponse(res, "Exactly 2 contentIds must be provided.");
        }

        if (!contentIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
            return ThrowError(res, 400, "Invalid contentId(s) provided.");
        }

        const validContent = await Content.find({ _id: { $in: contentIds } });
        if (validContent.length !== contentIds.length) {
            return sendNotFoundResponse(res, "One or more contentId(s) not found.");
        }

        const allowedRanges = {
            1: [1, 7],
            2: [8, 14],
            3: [15, 21],
            4: [22, 28]
        };

        const [minDay, maxDay] = allowedRanges[week_No] || [];
        if (!minDay || day_No < minDay || day_No > maxDay) {
            return sendBadRequestResponse(
                res,
                `Invalid day_No for week_No ${week_No}. Allowed range: ${minDay} to ${maxDay}.`
            );
        }

        const alreadyExists = await OverView.findOne({ week_No, day_No });
        if (alreadyExists) {
            return sendBadRequestResponse(res, "Overview for this day and week already exists.");
        }

        const existingTitle = await OverView.findOne({ week_Title: week_Title });
        if (existingTitle && existingTitle.week_No !== week_No) {
            return sendBadRequestResponse(
                res,
                `The week_Title "${week_Title}" is already used for week_No ${existingTitle.week_No}.`
            );
        }

        const alreadyUsed = await OverView.find({
            contentId: { $in: contentIds }
        });

        if (alreadyUsed.length > 0) {
            return sendBadRequestResponse(
                res,
                "One or more videos (contentId) already used in another day/week."
            );
        }

        // create new OverView
        const newOverview = await OverView.create({
            day_No,
            week_No,
            week_Title,
            contentId: contentIds
        });

        return sendSuccessResponse(res, newOverview, "Overview video created successfully.");

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllOverViewVideos = async (req, res) => {
    try {
        const overViews = await OverView.find({}).populate({
            path: "contentId",
            model: "Content"
        })

        if (!overViews || overViews.length === 0) {
            return sendNotFoundResponse(res, "No any OverView found...")
        }

        return sendSuccessResponse(res, "OverView fetched Succesfully...", overViews)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getOverViewById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid OverView Id")
        }

        const overtView = await OverView.findOne({ _id: id }).populate("contentId")
        if (!overtView) {
            return sendNotFoundResponse(res, "No any OverView found...")
        }

        return sendSuccessResponse(res, "OverView fetched Successfully...", overtView)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateOverViewVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { day_No, week_No, week_Title, contentId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid OverView Id");
        }

        const existingOverview = await OverView.findById(id);
        if (!existingOverview) {
            return sendNotFoundResponse(res, "OverView not found...");
        }

        const updateData = {};

        // ✅ Validate and Update day_No and week_No
        if (day_No !== undefined || week_No !== undefined) {
            const newDay = day_No ?? existingOverview.day_No;
            const newWeek = week_No ?? existingOverview.week_No;

            const allowedRanges = {
                1: [1, 7],
                2: [8, 14],
                3: [15, 21],
                4: [22, 28]
            };
            const [minDay, maxDay] = allowedRanges[newWeek] || [];
            if (!minDay || newDay < minDay || newDay > maxDay) {
                return sendBadRequestResponse(
                    res,
                    `Invalid day_No for week_No ${newWeek}. Allowed range: ${minDay} to ${maxDay}.`
                );
            }

            // ✅ Ensure no duplicate day/week in other overview
            const sameDayWeek = await OverView.findOne({
                _id: { $ne: id },
                day_No: newDay,
                week_No: newWeek
            });
            if (sameDayWeek) {
                return sendBadRequestResponse(
                    res,
                    `Another overview already exists for day ${newDay} of week ${newWeek}.`
                );
            }

            updateData.day_No = newDay;
            updateData.week_No = newWeek;
        }

        // ✅ Validate and Update week_Title
        if (week_Title !== undefined) {
            const otherWithSameTitle = await OverView.findOne({
                _id: { $ne: id },
                week_Title,
                week_No: { $ne: week_No ?? existingOverview.week_No }
            });
            if (otherWithSameTitle) {
                return sendBadRequestResponse(
                    res,
                    `The week_Title "${week_Title}" is already used in another week.`
                );
            }

            updateData.week_Title = week_Title;
        }

        // ✅ Validate and Update contentId
        if (contentId !== undefined) {
            const parsedContentIds = typeof contentId === "string" ? JSON.parse(contentId) : contentId;
            const contentIds = Array.isArray(parsedContentIds) ? parsedContentIds : [parsedContentIds];

            if (!contentIds.every(cid => mongoose.Types.ObjectId.isValid(cid))) {
                return sendBadRequestResponse(res, "Invalid contentId(s) provided.");
            }

            // ✅ Check existence in Content collection
            const validContent = await Content.find({ _id: { $in: contentIds } });
            if (validContent.length !== contentIds.length) {
                return sendNotFoundResponse(res, "One or more contentId(s) not found.");
            }

            // ✅ Check uniqueness in other OverViews
            const alreadyUsed = await OverView.find({
                _id: { $ne: id },
                contentId: { $in: contentIds }
            });

            if (alreadyUsed.length > 0) {
                return sendBadRequestResponse(res, "One or more videos (contentId) are already used in another day/week.");
            }

            updateData.contentId = contentIds;
        }

        // ✅ Update only if there are changes
        if (Object.keys(updateData).length === 0) {
            return sendBadRequestResponse(res, "No valid fields provided to update.");
        }

        const updatedOverview = await OverView.findByIdAndUpdate(id, updateData, { new: true });

        return sendSuccessResponse(res, updatedOverview, "OverView updated successfully.");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteOverViewVideo = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid OverView Id")
        }

        const overViews = await OverView.findById(id)
        if (!overViews) {
            return sendNotFoundResponse(res, "OverView not found...")
        }

        await OverView.findByIdAndDelete(id)

        return sendSuccessResponse(res, "OverView deleted Successfully..")

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getOverViewByDay = async (req, res) => {
    try {
        const { day_No } = req.params;

        if (!day_No) {
            return sendBadRequestResponse(res, "Please provide a valid day_No in query.");
        }

        const overView = await OverView.findOne({ day_No: Number(day_No) }).populate("contentId")
        if (!overView) {
            return sendNotFoundResponse(res, "No OverView found for the given day...")
        }

        return sendSuccessResponse(res, "OverView fetched Successfully...", overView)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}  
import mongoose from "mongoose";
import Privacy from "../models/privacyModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";

export const createPrivacy = async (req, res) => {
    try {
        const { description } = req.body

        if (!description) {
            return sendBadRequestResponse(res, "Description are required...")
        }

        const addPrivacy = await Privacy.create({
            description
        })

        return sendSuccessResponse(res, "Privacy added Successfully...", addPrivacy)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllPrivacy = async (req, res) => {
    try {
        const privacy = await Privacy.find()

        if (!privacy || privacy.length === 0) {
            return sendNotFoundResponse(res, "No any Privacy found...")
        }

        return sendSuccessResponse(res, "Privacy fetched Successfully...", privacy)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getPrivacyById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Privacy Id...")
        }

        const privacy = await Privacy.findById(id)
        if (!privacy) {
            return sendNotFoundResponse(res, "Privacy not found...")
        }

        return sendSuccessResponse(res, "Privacy fetched Successully...", privacy)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}


export const updatePrivacy = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Privacy Id...")
        }

        let privacy = await Privacy.findById(id)
        if (!privacy) {
            return sendNotFoundResponse(res, "Privacy not found...")
        }

        privacy = await Privacy.findByIdAndUpdate(id, { ...req.body }, { new: true })

        return sendSuccessResponse(res, "Privacy updated Successfully...", privacy)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const deletePrivacy = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Privacy Id...")
        }

        let privacy = await Privacy.findById(id)
        if (!privacy) {
            return sendNotFoundResponse(res, "Privacy not found...")
        }

        privacy = await Privacy.findByIdAndDelete(id)

        return sendSuccessResponse(res, "Privacy deleted Successfully...")
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
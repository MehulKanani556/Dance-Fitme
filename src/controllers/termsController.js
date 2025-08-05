import mongoose from "mongoose";
import Terms from "../models/termsModel.js";
import { ThrowError } from "../utils/ErrorUtils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";

export const createTerm = async (req, res) => {
    try {
        const { description } = req.body

        if (!description) {
            return sendBadRequestResponse(res, "Description are required...")
        }

        const addTerms = await Terms.create({
            description
        })

        return sendSuccessResponse(res, "Terms added Successfully...", addTerms)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllTerms = async (req, res) => {
    try {
        const terms = await Terms.find()

        if (!terms || terms.length === 0) {
            return sendNotFoundResponse(res, "No any Terms found...")
        }

        return sendSuccessResponse(res, "Terms fetched Successfully...", terms)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getTermsById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Terms Id...")
        }

        const terms = await Terms.findById(id)
        if (!terms) {
            return sendNotFoundResponse(res, "Terms not found...")
        }

        return sendSuccessResponse(res, "Terms fetched Successully...", terms)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}


export const updateTerms = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Terms Id...")
        }

        let terms = await Terms.findById(id)
        if (!terms) {
            return sendNotFoundResponse(res, "Terms not found...")
        }

        terms = await Terms.findByIdAndUpdate(id, { ...req.body }, { new: true })

        return sendSuccessResponse(res, "Terms updated Successfully...", terms)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const deleteTerms = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid Terms Id...")
        }

        let terms = await Terms.findById(id)
        if (!terms) {
            return sendNotFoundResponse(res, "Terms not found...")
        }

        terms = await Terms.findByIdAndDelete(id)

        return sendSuccessResponse(res, "Terms deleted Successfully...")
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
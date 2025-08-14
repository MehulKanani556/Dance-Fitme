import Register from "../models/registerModel.js";
import { ThrowError } from "../utils/ErrorUtils.js"
import bcrypt from "bcryptjs";
import fs from 'fs';
import path from "path";
import {
    sendSuccessResponse,
    sendErrorResponse,
    sendBadRequestResponse,
    sendNotFoundResponse,
    sendForbiddenResponse,
    sendCreatedResponse
} from '../utils/ResponseUtils.js';

// Create new user
export const createRegister = async (req, res) => {
    try {
        const { name, phone, email, gender, password, confirmed_password, role } = req.body;

        if (!name || !phone || !email || !password || !confirmed_password || !role) {
            return sendBadRequestResponse(res, "All fields are required");
        }

        if (password !== confirmed_password) {
            return sendBadRequestResponse(res, "Passwords do not match");
        }

        // Check for existing user with same email or phone
        const existingUser = await Register.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: phone }
            ]
        });

        if (existingUser) {
            return sendBadRequestResponse(res, "Email or phone already registered");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newRegister = await Register.create({
            name,
            phone,
            email: email.toLowerCase(),
            gender,
            password: hashedPassword,
            confirmed_password: hashedPassword,
            role,
            isAdmin: role === 'admin',
            image: null,
        });

        // Generate JWT token
        const token = await newRegister.getJWT();
        if (!token) {
            return sendErrorResponse(res, 500, "Failed to generate token");
        }

        return sendCreatedResponse(res, "Registration successful", { newRegister, token: token });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single user by ID
export const getRegisterById = async (req, res) => {
    try {
        const { id } = req.params;

        let query = { _id: id };
        if (!req.user.isAdmin && req.user._id.toString() !== id) {
            return sendForbiddenResponse(res, "Access denied. You can only view your own profile.");
        }

        const register = await Register.findOne(query);

        if (!register) {
            return sendNotFoundResponse(res, "User not found");
        }

        return sendSuccessResponse(res, "User retrieved successfully", register);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update user
export const updateRegister = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, gender } = req.body;

        // Access Control
        if (!req.user.isAdmin && req.user._id.toString() !== id) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendForbiddenResponse(res, "Access denied. You can only update your own profile.");
        }

        // Find existing user
        const existingUser = await Register.findById(id);
        if (!existingUser) {
            if (req.file) fs.unlinkSync(path.resolve(req.file.path));
            return sendNotFoundResponse(res, "User not found");
        }

        // Update basic fields
        if (name) existingUser.name = name;
        if (phone) existingUser.phone = phone;
        if (email) existingUser.email = email;
        if (gender) existingUser.gender = gender;

        // ✅ Update profile image
        if (req.file) {
            const newImagePath = `/public/images/${req.file.filename}`;

            // Delete old image if exists
            if (existingUser.image) {
                const oldImageName = existingUser.image.split("/").pop();
                const oldImagePath = path.join("public", "images", oldImageName);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            }

            existingUser.image = newImagePath;
        }

        await existingUser.save();

        return sendSuccessResponse(res, "User updated successfully", existingUser);
    } catch (error) {
        if (req.file) fs.unlinkSync(path.resolve(req.file.path));
        return sendErrorResponse(res, 500, error.message);
    }
};

// ✅ Delete User Profile
export const deleteRegister = async (req, res) => {
    try {
        const { id } = req.params;

        // Access Control
        if (!req.user.isAdmin && req.user._id.toString() !== id) {
            return sendForbiddenResponse(res, "Access denied. You can only delete your own profile.");
        }

        const user = await Register.findByIdAndDelete(id);
        if (!user) {
            return sendNotFoundResponse(res, "User not found");
        }

        // Delete image if exists
        if (user.image) {
            const imageName = user.image.split("/").pop();
            const imagePath = path.join("public", "images", imageName);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        return sendSuccessResponse(res, "User deleted successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const getAllUsers = async (req, res) => {
    try {
        if (!req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Only admins can view all users.");
        }

        const users = await Register.find({ role: 'user' });

        if (!users || users.length === 0) {
            return sendSuccessResponse(res, "No users found", []);
        }

        return sendSuccessResponse(res, "Users fetched successfully", users);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

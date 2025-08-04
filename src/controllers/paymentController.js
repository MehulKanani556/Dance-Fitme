import mongoose from 'mongoose';
import Payment from '../models/paymentModel.js';
import premiumModel from '../models/premiumModel.js';
import PlanDetails from '../models/planDetailsModel.js';
import registerModel from '../models/registerModel.js';
import { ThrowError } from '../utils/ErrorUtils.js';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/ResponseUtils.js';

// Create new payment record (User)
export const createPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { transactionId, premiumPlan, planDetails } = req.body;

        // Basic validation for required fields
        if (!transactionId || (!premiumPlan && !planDetails)) {
            return sendBadRequestResponse(res, "transactionId and either premiumPlan or planDetails are required");
        }

        if (premiumPlan && planDetails) {
            return sendBadRequestResponse(res, "Only one of premiumPlan or planDetails should be provided, not both");
        }

        // Fetch the premium plan
        if (premiumPlan && !mongoose.Types.ObjectId.isValid(premiumPlan)) {
            return sendBadRequestResponse(res, 'Invalid Premium Plan ID');
        }
        if (planDetails && !mongoose.Types.ObjectId.isValid(planDetails)) {
            return sendBadRequestResponse(res, 'Invalid Plan Details ID');
        }

        let plan;
        let planName;
        let price;
        let duration;

        if (premiumPlan) {
            plan = await premiumModel.findById(premiumPlan);
            if (!plan) return sendBadRequestResponse(res, 'Premium plan not found');

            planName = plan.type;
            price = plan.price;
            duration = plan.duration;
        } else {
            plan = await PlanDetails.findById(planDetails);
            if (!plan) return sendBadRequestResponse(res, 'Plan details not found');

            planName = plan.plan_title;
            price = 0; // Assume price is 0 for planDetails
            duration = "Monthly"; // Or whatever default you want
        }


        if (!duration) {
            return sendBadRequestResponse(res, 'Plan duration is missing in selected plan');
        }

        let endDate = new Date();
        switch (duration.toLowerCase()) {
            case "monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case "yearly":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            default:
                return sendBadRequestResponse(res, 'Invalid plan duration. Must be Monthly or Yearly');
        }

        const user = await registerModel.findById(req.user._id);
        if (!user) {
            return sendNotFoundResponse(res, "User not found!!!")
        }

        // Block duplicate subscription if not expired
        if (user.endDate && new Date(user.endDate) > new Date()) {
            return sendBadRequestResponse(res, "You already have an active subscription. Please wait until it expires.");
        }

        user.planId = premiumPlan || planDetails;
        user.endDate = endDate;
        user.isSubscribed = true;
        user.planStatus = "Active";
        await user.save();

        const newPayment = new Payment({
            transactionId,
            planName,
            price,
            discount: 0,
            total: price,
            user: req.user._id,
            ...(premiumPlan && { premiumPlan }),
            ...(planDetails && { planDetails })
        });

        const savedPayment = await newPayment.save();

        return sendSuccessResponse(res, "Payment created successfully", savedPayment)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get all payment records (Admin Only)
export const getAllPayments = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendBadRequestResponse(res, "Access denied. Admins only.");
        }
        const payments = await Payment.find().populate('user', 'name email');

        if (!payments || payments.length === 0) {
            return ThrowError(res, 404, 'No any payment found');
        }

        res.status(200).json({
            success: true,
            message: "All payment records fetched successfully",
            payments
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get single payment record by ID (Admin or User)
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        // Allow admin or the user who owns the payment to access it
        if (!req.user.isAdmin && payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only access your own payment records.');
        }

        return sendSuccessResponse(res, "Payment record fetched successfully", payment)
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update payment record (User Only)
export const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }

        // Check user ownership
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only update your own payment records.');
        }

        // Update payment
        const updatedPayment = await Payment.findByIdAndUpdate(id, { ...req.body }, { new: true });

        // ✅ Now update Register document (user subscription data)
        const userId = payment.user;
        const premiumPlan = req.body.premiumPlan; // Should be plan ID
        const planEndDate = new Date();
        planEndDate.setMonth(planEndDate.getMonth() + 1); // assuming 1 month plan

        await registerModel.findByIdAndUpdate(
            userId,
            {
                planId: premiumPlan,
                planStatus: "Active",
                isSubscribed: true,
                endDate: planEndDate,
            },
            { new: true }
        );

        return sendSuccessResponse(res, "Payment record and user subscription updated successfully", updatedPayment);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete payment record (User Only)
export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, 'Invalid Payment ID format.');
        }
        const payment = await Payment.findById(id);
        if (!payment) {
            return sendBadRequestResponse(res, 'Payment record not found.');
        }
        // Only allow the user who owns the payment to delete it
        if (payment.user && payment.user.toString() !== req.user._id.toString()) {
            return sendBadRequestResponse(res, 'Access denied. You can only delete your own payment records.');
        }

        // Remove subscription details from the user
        await registerModel.findByIdAndUpdate(payment.user, {
            $set: {
                planId: null,
                endDate: null,
                isSubscribed: false,
                planStatus: "No Subscription"
            }
        });

        await Payment.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Payment record deleted successfully and user subscription cleared")
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get logged-in user's active subscription plan
export const getMySubscription = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await registerModel.findById(userId);
        // Check for no plan or expired plan
        if (!user || !user.planId || !user.endDate || new Date(user.endDate) < new Date()) {
            return res.status(404).json({ success: false, message: "No active subscription found" });
        }

        const plan = await premiumModel.findById(user.planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Subscription plan not found" });
        }

        // Format the date
        const validTillDate = new Date(user.endDate);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        const validTill = validTillDate.toLocaleDateString('en-GB', options).replace(/ /g, ' ');

        res.json({
            success: true,
            plan: {
                name: plan.plan_name,
                price: plan.price,
                validTill,
                specification: plan.description
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


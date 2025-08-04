import mongoose from "mongoose";

const PaymentSchema = mongoose.Schema({
    transactionId: {
        type: String
    },
    premiumPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Premium',
    },
    planDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PlanDetails'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true
    }
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment; 

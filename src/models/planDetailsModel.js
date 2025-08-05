import mongoose from "mongoose";

const planDetailsSchema = mongoose.Schema({
    planDetails_image: {
        type: String
    },
    plan_title: {
        type: String
    },
    total_workout: {
        type: Number
    },
    startTime: {
        type: String
    },
    endTime: {
        type: String
    },
    description: {
        type: Array
    },
    duration: {
        type: String,
        enum: ['Monthly', 'Yearly'],
    },
    planVideo: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PlanVideo"
        }
    ]
}, { timestamps: true })

export default mongoose.model("PlanDetails", planDetailsSchema)

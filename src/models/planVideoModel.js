import mongoose from "mongoose";

export const planVideoSchema = mongoose.Schema({
    plan_video: {
        type: String
    },
    plan_image: {
        type: String
    },
    level_name: {
        type: String,
        enum: ["Beginner", "Advanced", "Intermediate"]
    },
    video_title: {
        type: String
    },
    video_time: {
        type: String
    },
    video_description: {
        type: String,
        default: null
    },
    burn: {
        type: String
    },
    planDetailsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlanDetails"
    },
    views: {
        type: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            timestamp: { type: Date, default: Date.now }
        }],
        default: []
    },
    

}, { timestamps: true })

export default mongoose.model("PlanVideo", planVideoSchema)
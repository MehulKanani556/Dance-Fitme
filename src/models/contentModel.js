import mongoose from "mongoose";

export const contentSchema = mongoose.Schema({
    content_video: {
        type: String
    },
    content_image: {
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
        type: String
    },
    burn: {
        type: String
    },
    classCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassCategory"
    }

}, { timestamps: true })

export default mongoose.model("Content", contentSchema)
import mongoose from "mongoose";

export const contentSchema = mongoose.Schema({
    video_name: {
        type: String
    },
    content_video: {
        type: String
    },
    level_name: {
        type: String
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
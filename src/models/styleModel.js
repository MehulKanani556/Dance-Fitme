import mongoose from "mongoose";

const styleSchema = mongoose.Schema({
    style_title: {
        type: String
    },
    style_image: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("Style", styleSchema)

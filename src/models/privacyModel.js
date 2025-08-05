import mongoose from "mongoose";

const privacySchema = mongoose.Schema({
    description: {
        type: Array,
        require: true
    }
}, { timestamps: true })

export default mongoose.model("Privacy", privacySchema)
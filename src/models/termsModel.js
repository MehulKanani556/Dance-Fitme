import mongoose from "mongoose";

const termsSchema = mongoose.Schema({
    description: {
        type: Array,
        require: true
    }
}, { timestamps: true })

export default mongoose.model("Terms", termsSchema)
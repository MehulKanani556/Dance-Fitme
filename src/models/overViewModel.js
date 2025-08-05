import mongoose from "mongoose";

const overViewSchema = mongoose.Schema({
    day_No: {
        type: Number
    },
    week_No: {
        type: Number
    },
    week_Title: {
        type: String
    },
    contentId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Content"
        }
    ]
}, { timestamps: true })

export default mongoose.model("OverView", overViewSchema)
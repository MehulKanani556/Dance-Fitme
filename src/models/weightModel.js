import mongoose from "mongoose";

const weightSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    starting: {
        type: Number,
    },
    target: {
        type: Number,
    },
    unit: {
        type: String,
        enum: ["kg", "lb"],
        required: true
    },
    history: [
        {
            value: Number,
            date: Number,
            month: String,
            year: Number,
            unit: {
                type: String,
                enum: ["kg", "lb"]
            }
        }
    ]
}, { timestamps: true })

export default mongoose.model('Weight', weightSchema)
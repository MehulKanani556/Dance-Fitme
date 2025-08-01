import mongoose from "mongoose";

const dailyGoalSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    energy: {
        type: Number
    },
    workout: {
        type: Number
    }
}, { timestamps: true })

export default mongoose.model("DailyGoal", dailyGoalSchema)
import mongoose from "mongoose";

const userTotalStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    totalDanceTimeInMin: {
        type: Number,
        default: 0,
    },

    totalCaloriesBurned: {
        type: Number,
        default: 0,
    },

    totalDanceDays: {
        type: Number,
        default: 0,
    },

    currentStreak: {
        type: Number,
        default: 0,
    },

    longestStreak: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true
});

export default mongoose.model("UserTotalStats", userTotalStatsSchema)

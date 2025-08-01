import mongoose from "mongoose";

const danceStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    date: {
        type: Date,
        required: true,
    },

    // Daily data
    danceTimeInMin: {
        type: Number,
        default: 0, // minutes danced on this date
    },

    caloriesBurned: {
        type: Number,
        default: 0, // total kcal burned on this date
    },

    isDanceDay: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

export default mongoose.model("DanceStats", danceStatsSchema)


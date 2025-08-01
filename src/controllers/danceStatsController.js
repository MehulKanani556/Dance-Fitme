import DanceStats from '../models/danceStateModel.js';
import UserTotalStats from '../models/userTotalStatsModel.js';
import moment from 'moment';

//  Add or update dance stat for the day
export const recordDanceSession = async (req, res) => {
    try {
        const userId = req.user._id;
        const { danceTimeInMin, caloriesBurned } = req.body;
        const today = moment().startOf('day').toDate();

        let dailyStat = await DanceStats.findOne({ userId, date: today });

        if (dailyStat) {
            dailyStat.danceTimeInMin += danceTimeInMin;
            dailyStat.caloriesBurned += caloriesBurned;
            dailyStat.isDanceDay = true;
        } else {
            dailyStat = new DanceStats({
                userId,
                date: today,
                danceTimeInMin,
                caloriesBurned,
                isDanceDay: true
            });
        }

        await dailyStat.save();

        // Update total stats
        let totalStats = await UserTotalStats.findOne({ userId });
        if (!totalStats) {
            totalStats = new UserTotalStats({
                userId,
                totalDanceTimeInMin: 0,
                totalCaloriesBurned: 0,
                totalDanceDays: 0,
                currentStreak: 0,
                longestStreak: 0,
            });
        }

        // Update totals
        totalStats.totalDanceTimeInMin += danceTimeInMin;
        totalStats.totalCaloriesBurned += caloriesBurned;

        // Only increase dance day count if this is first record for today
        if (!dailyStat._id) {
            totalStats.totalDanceDays += 1;
        }

        // Update streak
        const yesterday = moment().subtract(1, 'days').startOf('day').toDate();
        const yesterdayStat = await DanceStats.findOne({ userId, date: yesterday });

        if (yesterdayStat && yesterdayStat.isDanceDay) {
            totalStats.currentStreak += 1;
        } else {
            totalStats.currentStreak = 1;
        }

        if (totalStats.currentStreak > totalStats.longestStreak) {
            totalStats.longestStreak = totalStats.currentStreak;
        }

        await totalStats.save();

        return res.status(200).json({
            message: "Dance session recorded successfully",
            dailyStat,
            totalStats
        });
    } catch (err) {
        console.error("Error recording dance stats:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getDailyStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const today = moment().startOf('day').toDate();

        const stat = await DanceStats.findOne({ userId, date: today });

        if (!stat) {
            return res.status(200).json({
                success: false,
                message: "No daily stats found...",
                result: {},
            });
        }

        return res.status(200).json({
            success: true,
            message: "Daily stats fetched",
            result: stat,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getWeeklyStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const start = moment().startOf('isoWeek').toDate();
        const end = moment().endOf('isoWeek').toDate();

        const stats = await DanceStats.find({
            userId,
            date: { $gte: start, $lte: end },
        });

        const total = stats.reduce((acc, stat) => {
            acc.danceTimeInMin += stat.danceTimeInMin;
            acc.caloriesBurned += stat.caloriesBurned;
            acc.danceDays += stat.isDanceDay ? 1 : 0;
            return acc;
        }, { danceTimeInMin: 0, caloriesBurned: 0, danceDays: 0 });

        return res.status(200).json({
            success: true,
            message: "Weekly stats fetched",
            result: total,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getMonthlyStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const start = moment().startOf('month').toDate();
        const end = moment().endOf('month').toDate();

        const stats = await DanceStats.find({
            userId,
            date: { $gte: start, $lte: end },
        });

        const total = stats.reduce((acc, stat) => {
            acc.danceTimeInMin += stat.danceTimeInMin;
            acc.caloriesBurned += stat.caloriesBurned;
            acc.danceDays += stat.isDanceDay ? 1 : 0;
            return acc;
        }, { danceTimeInMin: 0, caloriesBurned: 0, danceDays: 0 });

        return res.status(200).json({
            success: true,
            message: "Monthly stats fetched",
            result: total,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getTotalStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const stats = await DanceStats.find({ userId });

        const total = stats.reduce((acc, stat) => {
            acc.danceTimeInMin += stat.danceTimeInMin;
            acc.caloriesBurned += stat.caloriesBurned;
            acc.danceDays += stat.isDanceDay ? 1 : 0;
            return acc;
        }, { danceTimeInMin: 0, caloriesBurned: 0, danceDays: 0 });

        return res.status(200).json({
            success: true,
            message: "Total stats fetched",
            result: total,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

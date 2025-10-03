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
        const start = moment().startOf("isoWeek").toDate(); // Monday
        const end = moment().endOf("isoWeek").toDate();     // Sunday

        const stats = await DanceStats.find({
            userId,
            date: { $gte: start, $lte: end },
        }).sort({ date: 1 });

        const dailyStats = stats.map((stat) => ({
            date: moment(stat.date).format("YYYY-MM-DD"),
            danceTimeInMin: stat.danceTimeInMin,
            caloriesBurned: stat.caloriesBurned,
        }));

        const total = stats.reduce(
            (acc, stat) => {
                acc.totalDanceTime += stat.danceTimeInMin;
                acc.totalCaloriesBurned += stat.caloriesBurned;
                return acc;
            },
            { totalDanceTime: 0, totalCaloriesBurned: 0 }
        );

        return res.status(200).json({
            success: true,
            message: "Weekly stats fetched successfully.",
            result: dailyStats,
            ...total,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const getMonthlyStats = async (req, res) => {
    try {
        const userId = req.user._id;
        let { month, year } = req.query;

        // If no query passed → use current month & year
        month = month ? parseInt(month) : moment().month() + 1;
        year = year ? parseInt(year) : moment().year();

        // Start & End of the requested month
        const start = moment(`${year}-${month}`, "YYYY-M").startOf("month").toDate();
        const end = moment(`${year}-${month}`, "YYYY-M").endOf("month").toDate();

        const stats = await DanceStats.find({
            userId,
            date: { $gte: start, $lte: end },
        }).sort({ date: 1 });

        const result = stats.map(stat => ({
            date: moment(stat.date).format("YYYY-MM-DD"),
            danceTimeInMin: stat.danceTimeInMin,
            caloriesBurned: stat.caloriesBurned,
        }));

        const totalDanceTime = result.reduce((acc, stat) => acc + stat.danceTimeInMin, 0);
        const totalCaloriesBurned = result.reduce((acc, stat) => acc + stat.caloriesBurned, 0);

        return res.status(200).json({
            success: true,
            message: `Stats for ${month}-${year} fetched successfully.`,
            month,
            year,
            result,
            totalDanceTime,
            totalCaloriesBurned
        });
    } catch (err) {
        console.error("Error fetching monthly stats:", err);
        return res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

export const getTotalStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const stats = await DanceStats.find({ userId }).sort({ date: 1 });

        let totalDanceTimeInMin = 0;
        let totalCaloriesBurned = 0;
        let danceDays = new Set();
        let currentStreak = 0;
        let longestStreak = 0;

        let previousDate = null;
        let tempStreak = 0;

        stats.forEach(stat => {
            const date = moment(stat.date).format("YYYY-MM-DD");
            danceDays.add(date);
            totalDanceTimeInMin += stat.danceTimeInMin;
            totalCaloriesBurned += stat.caloriesBurned;

            // Streak logic
            if (stat.danceTimeInMin > 0) {
                if (previousDate) {
                    const diff = moment(date).diff(moment(previousDate), 'days');
                    if (diff === 1) {
                        tempStreak += 1;
                    } else if (diff === 0) {
                        // same day - continue
                    } else {
                        tempStreak = 1;
                    }
                } else {
                    tempStreak = 1;
                }
                previousDate = date;
            } else {
                tempStreak = 0;
                previousDate = null;
            }
            longestStreak = Math.max(longestStreak, tempStreak);
        });

        // current streak
        const today = moment().format("YYYY-MM-DD");
        let day = moment(today);
        currentStreak = 0;
        while (danceDays.has(day.format("YYYY-MM-DD"))) {
            currentStreak++;
            day.subtract(1, 'days');
        }

        return res.status(200).json({
            success: true,
            message: "Total stats fetched successfully.",
            result: {
                totalDanceDays: danceDays.size,
                totalDanceTimeInMin,
                totalCaloriesBurned,
                currentStreak,
                longestStreak
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
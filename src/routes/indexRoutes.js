import express from 'express';
import { upload, convertJfifToJpeg } from '../middlewares/imageupload.js';
import { UserAuth, isAdmin, isUser } from '../middlewares/auth.js';
import { createRegister, getRegisterById, updateRegister, deleteRegister, getAllUsers } from '../controllers/registerController.js';
import { changePassword, forgotPassword, loginUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
// import { createPreferences, getUserPreferences, deleteUserPreferences, getAllUsersPreferences } from '../controllers/userPreferencesController.js';
import { createPremiumPlan, getAllPremiumPlans, getPremiumPlanById, updatePremiumPlan, deletePremiumPlan } from '../controllers/premiumController.js';
import { createClassCategory, deleteClassCategory, getAllClassCategory, getClassCategoryById, updateClassCategory } from '../controllers/classCategoryController.js';
import { createContent, deleteContent, getAdvanced, getAllContent, getBeginner, getBestDanceClass, getContentByBoxing, getContentByClassCategoryId, getContentByDanceFitness, getContentByHipHop, getContentById, getContentByStyleId, getIntermediate, getJustReleasedContent, getNewArrivals, updateContent } from '../controllers/contentController.js';
import { createStyle, deleteStyle, getAllStyle, getstyleById, updateStyle } from '../controllers/styleController.js';
import { addRecord, createWeight, deleteWeight, getAllWeight, getWeightByUser, updateWeight } from '../controllers/weightController.js';
import { createDailyGoal, deleteDailyGoal, getAllDailyGoals, getDailyGoalByUser, updateDailyGoal } from '../controllers/dailyGoalController.js';
import { getDailyStats, getMonthlyStats, getTotalStats, getWeeklyStats, recordDanceSession } from '../controllers/danceStatsController.js';

const indexRouter = express.Router();

// Register Routes
indexRouter.post('/createRegister', createRegister);
indexRouter.get('/getRegisterById/:id', UserAuth, getRegisterById);
indexRouter.put('/updateRegister/:id', UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister);
indexRouter.delete('/deleteRegister/:id', UserAuth, deleteRegister);
indexRouter.get('/getAllUsers', UserAuth, isAdmin, getAllUsers);

// Login Routes
indexRouter.post('/loginUser', loginUser);
indexRouter.post('/forgotPassword', forgotPassword);
indexRouter.post('/VerifyEmail', VerifyEmail);
indexRouter.post('/resetPassword', resetPassword);
indexRouter.post('/changePassword/:id', UserAuth, changePassword);
// indexRouter.post('/logoutUser', UserAuth, logoutUser);


// indexRouter.post('/createPreferences', UserAuth, isUser, createPreferences);
// indexRouter.get('/getUserPreferences', UserAuth, getUserPreferences);
// indexRouter.get('/getAllUsersPreferences', UserAuth, isAdmin, getAllUsersPreferences);
// indexRouter.delete('/deleteUserPreferences', UserAuth, isUser, deleteUserPreferences);

// Premium Routes
indexRouter.post('/createPremiumPlan', UserAuth, isAdmin, createPremiumPlan);
indexRouter.get('/getAllPremiumPlans', UserAuth, getAllPremiumPlans);
indexRouter.get('/getPremiumPlanById/:id', UserAuth, getPremiumPlanById);
indexRouter.put('/updatePremiumPlan/:id', UserAuth, isAdmin, updatePremiumPlan);
indexRouter.delete('/deletePremiumPlan/:id', UserAuth, isAdmin, deletePremiumPlan);

// ClassCategory Routes
indexRouter.post('/createClassCategory', UserAuth, isAdmin, upload.single("classCategory_image"), convertJfifToJpeg, createClassCategory);
indexRouter.get('/getAllClassCategory', UserAuth, getAllClassCategory);
indexRouter.get('/getClassCategoryById/:id', UserAuth, getClassCategoryById);
indexRouter.put('/updateClassCategory/:id', UserAuth, isAdmin, upload.single("classCategory_image"), convertJfifToJpeg, updateClassCategory);
indexRouter.delete('/deleteClassCategory/:id', UserAuth, isAdmin, deleteClassCategory);

// Style Routes
indexRouter.post('/createStyle', UserAuth, isAdmin, upload.single("style_image"), convertJfifToJpeg, createStyle);
indexRouter.get('/getAllStyle', UserAuth, getAllStyle);
indexRouter.get('/getstyleById/:id', UserAuth, getstyleById);
indexRouter.put('/updateStyle/:id', UserAuth, isAdmin, upload.single("style_image"), convertJfifToJpeg, updateStyle);
indexRouter.delete('/deleteStyle/:id', UserAuth, isAdmin, deleteStyle);


// Content Routes
indexRouter.post('/createContent', UserAuth, isAdmin, upload.fields([{ name: 'content_image', maxCount: 1 }, { name: 'content_video', maxCount: 1 }]), convertJfifToJpeg, createContent);
indexRouter.get('/getContentByClassCategoryId/:classCategoryId', UserAuth, getContentByClassCategoryId);
indexRouter.get('/getContentByStyleId/:styleId', UserAuth, getContentByStyleId);
indexRouter.get('/getAllContent', UserAuth, getAllContent);
indexRouter.get('/getContentById/:id', UserAuth, getContentById);
indexRouter.put('/updateContent/:id', UserAuth, isAdmin, upload.fields([{ name: 'content_image', maxCount: 1 }, { name: 'content_video', maxCount: 1 }]), convertJfifToJpeg, updateContent);
indexRouter.delete('/deleteContent/:id', UserAuth, isAdmin, deleteContent);
indexRouter.get('/getNewArrivals', UserAuth, getNewArrivals);
indexRouter.get('/getBeginner', UserAuth, getBeginner);
indexRouter.get('/getAdvanced', UserAuth, getAdvanced);
indexRouter.get('/getIntermediate', UserAuth, getIntermediate);
indexRouter.get('/getContentByDanceFitness', UserAuth, getContentByDanceFitness);
indexRouter.get('/getContentByHipHop', UserAuth, getContentByHipHop);
indexRouter.get('/getContentByBoxing', UserAuth, getContentByBoxing);
indexRouter.get('/getJustReleasedContent', UserAuth, getJustReleasedContent);
indexRouter.get('/getBestDanceClass', UserAuth, getBestDanceClass);

// Weight Routes
indexRouter.post('/createWeight', UserAuth, isUser, createWeight);
indexRouter.get('/getAllWeight', UserAuth, getAllWeight);
indexRouter.get('/getWeightByUser', UserAuth, getWeightByUser);
indexRouter.put('/updateWeight/:id', UserAuth, isUser, updateWeight);
indexRouter.delete('/deleteWeight/:id', UserAuth, isUser, deleteWeight);
indexRouter.post('/addRecord/:id', UserAuth, isUser, addRecord);

// DailyGoal Routes
indexRouter.post('/createDailyGoal', UserAuth, isUser, createDailyGoal);
indexRouter.get('/getAllDailyGoals', UserAuth, getAllDailyGoals);
indexRouter.get('/getDailyGoalByUser', UserAuth, getDailyGoalByUser);
indexRouter.put('/updateDailyGoal/:id', UserAuth, isUser, updateDailyGoal);
indexRouter.delete('/deleteDailyGoal/:id', UserAuth, isUser, deleteDailyGoal);


indexRouter.post('/recordDanceSession', UserAuth, recordDanceSession);
indexRouter.get('/getDailyStats', UserAuth, getDailyStats);
indexRouter.get('/getWeeklyStats', UserAuth, getWeeklyStats);
indexRouter.get('/getMonthlyStats', UserAuth, getMonthlyStats);
indexRouter.get('/getTotalStats', UserAuth, getTotalStats);




export default indexRouter;  
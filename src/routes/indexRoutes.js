import express from 'express';
import { upload, convertJfifToJpeg } from '../middlewares/imageupload.js';
import { UserAuth, isAdmin, isUser } from '../middlewares/auth.js';
import { createRegister, getRegisterById, updateRegister, deleteRegister, getAllUsers } from '../controllers/registerController.js';
import { changePassword, forgotPassword, googleLogin, loginUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
import { createPremiumPlan, getAllPremiumPlans, getPremiumPlanById, updatePremiumPlan, deletePremiumPlan } from '../controllers/premiumController.js';
import { createClassCategory, deleteClassCategory, getAllClassCategory, getClassCategoryById, updateClassCategory } from '../controllers/classCategoryController.js';
import { createContent, deleteContent, getAdvanced, getAllContent, getBeginner, getBestDanceClass, getContentByBellyDance, getContentByBoxing, getContentByClassCategoryId, getContentByDanceFitness, getContentByHipHop, getContentById, getContentByStyleId, getIntermediate, getJustReleasedContent, getNewArrivals, getTrendingPlans, incrementContentViews, updateContent } from '../controllers/contentController.js';
import { createStyle, deleteStyle, getAllStyle, getstyleById, updateStyle } from '../controllers/styleController.js';
import { addRecord, createWeight, deleteWeight, getAllWeight, getWeightByUser, updateWeight } from '../controllers/weightController.js';
import { createDailyGoal, deleteDailyGoal, getAllDailyGoals, getDailyGoalByUser, updateDailyGoal } from '../controllers/dailyGoalController.js';
import { getDailyStats, getMonthlyStats, getTotalStats, getWeeklyStats, recordDanceSession } from '../controllers/danceStatsController.js';
import { createPlan, deletePlanDetails, getAllPlanDetails, getPlanDetailsById, updatePlanDetails } from '../controllers/planDetailsContrroller.js';
import { createPlanVideo, deletePlanVideo, getAllPlanVideo, getPlanVideoById, getPlanVideoByPlanDetailsId, updatePlanVideo } from '../controllers/planVideoController.js';
import { createPayment, deletePayment, getAllPayments, getMySubscription, getPaymentById, updatePayment } from '../controllers/paymentController.js';
import { createOverviewVideo, deleteOverViewVideo, getAllOverViewVideos, getOverViewByDay, getOverViewById, updateOverViewVideo } from '../controllers/overViewController.js';
import { createTerm, deleteTerms, getAllTerms, getTermsById, updateTerms } from '../controllers/termsController.js';
import { createPrivacy, deletePrivacy, getAllPrivacy, getPrivacyById, updatePrivacy } from '../controllers/privacyController.js';
import { createHelpSupport, deleteHelpSupport, getAllHelpSupport, getHelpSupportById, updateHelpSupport } from '../controllers/help&SupportController.js';

const indexRouter = express.Router();

// Register Routes
indexRouter.post('/createRegister', createRegister);
indexRouter.get('/getRegisterById/:id', UserAuth, getRegisterById);
indexRouter.put('/updateRegister/:id', UserAuth, upload.single("image"), convertJfifToJpeg, updateRegister);
indexRouter.delete('/deleteRegister/:id', UserAuth, deleteRegister);
indexRouter.get('/getAllUsers', UserAuth, isAdmin, getAllUsers);

// Login Routes
indexRouter.post('/loginUser', loginUser);
indexRouter.post('/googleLogin', googleLogin);
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

//payment Routes
indexRouter.post("/createPayment", UserAuth, isUser, createPayment)
indexRouter.get("/getAllPayments", UserAuth, isAdmin, getAllPayments)
indexRouter.get("/getPaymentById/:id", UserAuth, getPaymentById)
indexRouter.put("/updatePayment/:id", UserAuth, isUser, updatePayment)
indexRouter.delete("/deletePayment/:id", UserAuth, isUser, deletePayment)
indexRouter.get('/getMySubscription', UserAuth, isUser, getMySubscription);

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
indexRouter.get('/getContentByBellyDance', UserAuth, getContentByBellyDance);
indexRouter.get('/getJustReleasedContent', UserAuth, getJustReleasedContent);
indexRouter.get('/getBestDanceClass', UserAuth, getBestDanceClass);
indexRouter.get('/getTrendingPlans', UserAuth, getTrendingPlans);
indexRouter.post('/incrementContentViews/:contentId', UserAuth, incrementContentViews);

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

// PlanDetails Routes
indexRouter.post('/createPlan', UserAuth, isAdmin, upload.single("planDetails_image"), convertJfifToJpeg, createPlan);
indexRouter.get('/getAllPlanDetails', UserAuth, getAllPlanDetails);
indexRouter.get('/getPlanDetailsById/:id', UserAuth, getPlanDetailsById);
indexRouter.put('/updatePlanDetails/:id', UserAuth, isAdmin, upload.single("planDetails_image"), convertJfifToJpeg, updatePlanDetails);
indexRouter.delete('/deletePlanDetails/:id', UserAuth, isAdmin, deletePlanDetails);

// PlanVideo Routes
indexRouter.post('/createPlanVideo', UserAuth, isAdmin, upload.fields([{ name: 'plan_image', maxCount: 1 }, { name: 'plan_video', maxCount: 1 }]), convertJfifToJpeg, createPlanVideo);
indexRouter.get('/getPlanVideoByPlanDetailsId/:planDetailsId', UserAuth, getPlanVideoByPlanDetailsId);
indexRouter.get('/getAllPlanVideo', UserAuth, getAllPlanVideo);
indexRouter.get('/getPlanVideoById/:id', UserAuth, getPlanVideoById);
indexRouter.put('/updatePlanVideo/:id', UserAuth, isAdmin, upload.fields([{ name: 'plan_image', maxCount: 1 }, { name: 'plan_video', maxCount: 1 }]), convertJfifToJpeg, updatePlanVideo);
indexRouter.delete('/deletePlanVideo/:id', UserAuth, isAdmin, deletePlanVideo);

// OverView Routes
indexRouter.post('/createOverviewVideo', UserAuth, isAdmin, createOverviewVideo);
indexRouter.get('/getAllOverViewVideos', UserAuth, getAllOverViewVideos);
indexRouter.get('/getOverViewById/:id', UserAuth, getOverViewById);
indexRouter.put('/updateOverViewVideo/:id', UserAuth, isAdmin, updateOverViewVideo);
indexRouter.delete('/deleteOverViewVideo/:id', UserAuth, isAdmin, deleteOverViewVideo);
indexRouter.get('/getOverViewByDay/:day_No', UserAuth, getOverViewByDay);

// Terms Routes
indexRouter.post('/createTerm', UserAuth, isAdmin, createTerm);
indexRouter.get('/getAllTerms', UserAuth, getAllTerms);
indexRouter.get('/getTermsById/:id', UserAuth, getTermsById);
indexRouter.put('/updateTerms/:id', UserAuth, isAdmin, updateTerms);
indexRouter.delete('/deleteTerms/:id', UserAuth, isAdmin, deleteTerms);

// createPrivacy Routes
indexRouter.post('/createPrivacy', UserAuth, isAdmin, createPrivacy);
indexRouter.get('/getAllPrivacy', UserAuth, getAllPrivacy);
indexRouter.get('/getPrivacyById/:id', UserAuth, getPrivacyById);
indexRouter.put('/updatePrivacy/:id', UserAuth, isAdmin, updatePrivacy);
indexRouter.delete('/deletePrivacy/:id', UserAuth, isAdmin, deletePrivacy);

// HelpSupport Routes
indexRouter.post('/createHelpSupport', UserAuth, isAdmin, createHelpSupport);
indexRouter.get('/getAllHelpSupport', UserAuth, getAllHelpSupport);
indexRouter.get('/getHelpSupportById/:id', UserAuth, getHelpSupportById);
indexRouter.put('/updateHelpSupport/:id', UserAuth, isAdmin, updateHelpSupport);
indexRouter.delete('/deleteHelpSupport/:id', UserAuth, isAdmin, deleteHelpSupport);



export default indexRouter;
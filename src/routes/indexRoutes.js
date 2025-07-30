import express from 'express';
import { upload, convertJfifToJpeg } from '../middlewares/imageupload.js';
import { UserAuth, isAdmin, isUser } from '../middlewares/auth.js';
import { createRegister, getRegisterById, updateRegister, deleteRegister, getAllUsers } from '../controllers/registerController.js';
import { changePassword, forgotPassword, loginUser, resetPassword, VerifyEmail } from '../controllers/loginController.js';
// import { createPreferences, getUserPreferences, deleteUserPreferences, getAllUsersPreferences } from '../controllers/userPreferencesController.js';
import { createPremiumPlan, getAllPremiumPlans, getPremiumPlanById, updatePremiumPlan, deletePremiumPlan } from '../controllers/premiumController.js';
import { createClassCategory, deleteClassCategory, getAllClassCategory, getClassCategoryById, updateClassCategory } from '../controllers/classCategoryController.js';
import { createContent, deleteContent, getContentByClassCategoryId, getContentById, updateContent } from '../controllers/contentController.js';

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

// classCategory Routes
indexRouter.post('/createClassCategory', UserAuth, isAdmin, upload.single("classCategory_image"), convertJfifToJpeg, createClassCategory);
indexRouter.get('/getAllClassCategory', UserAuth, getAllClassCategory);
indexRouter.get('/getClassCategoryById/:id', UserAuth, getClassCategoryById);
indexRouter.put('/updateClassCategory/:id', UserAuth, isAdmin, upload.single("classCategory_image"), convertJfifToJpeg, updateClassCategory);
indexRouter.delete('/deleteClassCategory/:id', UserAuth, isAdmin, deleteClassCategory);

// Comtent Routes
indexRouter.post('/createContent', UserAuth, isAdmin, upload.fields([{ name: 'content_image', maxCount: 1 }, { name: 'content_video', maxCount: 1 }]), convertJfifToJpeg, createContent);
indexRouter.get('/getContentByClassCategoryId/:classCategoryId', UserAuth, getContentByClassCategoryId);
indexRouter.get('/getContentById/:id', UserAuth, getContentById);
indexRouter.put('/updateContent/:id', UserAuth, isAdmin, upload.fields([{ name: 'content_image', maxCount: 1 }, { name: 'content_video', maxCount: 1 }]), convertJfifToJpeg, updateContent);
indexRouter.delete('/deleteContent/:id', UserAuth, isAdmin, deleteContent);


export default indexRouter;  
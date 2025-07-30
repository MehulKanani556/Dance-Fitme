import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

// 🗂️ Define storage destination based on field name

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/';

        if (file.fieldname === 'image') {
            uploadPath += 'images';
        } else if (file.fieldname === 'classCategory_image') {
            uploadPath += 'classCategory_images';
        } else if (file.fieldname === 'content_image') {
            uploadPath += 'content_images';
        } else if (file.fieldname === 'content_video') {
            uploadPath += 'content_videos';
        } else {
            return cb(new Error("Invalid field name"), null);
        }

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}${ext}`;
        cb(null, filename);
    }
});

// ✅ File validation
const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isOctetStream = file.mimetype === 'application/octet-stream';
    const ext = path.extname(file.originalname).toLowerCase();
    const isJfifExt = ext === '.jfif';

    const allowedImageFields = ['image', 'classCategory_image', 'content_image'];
    const allowedVideoFields = ['content_video'];

    if (allowedImageFields.includes(file.fieldname)) {
        return (isImage || isOctetStream || isJfifExt) ? cb(null, true) : cb(new Error('Invalid image file.'));
    }

    if (allowedVideoFields.includes(file.fieldname)) {
        return isVideo ? cb(null, true) : cb(new Error('Invalid video file.'));
    }

    return cb(new Error(`Invalid field name for file upload: ${file.fieldname}`));
};

// ✅ Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 200 } // 200MB
});

// ✅ Convert JFIF to JPEG for image uploads
const convertJfifToJpeg = async (req, res, next) => {
    try {
        if (!req.files) return next();

        const conversionPromises = [];

        for (const fieldName in req.files) {
            const files = req.files[fieldName];
            for (const file of files) {
                const isImageField = ['image', 'content_image'].includes(fieldName);
                if (!isImageField) continue;

                const ext = path.extname(file.originalname).toLowerCase();
                const isConvertible = ext === '.jfif' || file.mimetype === 'image/jfif' || file.mimetype === 'application/octet-stream';

                if (isConvertible) {
                    const promise = (async () => {
                        const inputPath = file.path;
                        const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".jpeg";

                        await sharp(inputPath).jpeg().toFile(outputPath);

                        if (fs.existsSync(inputPath)) {
                            fs.unlinkSync(inputPath);
                        }

                        file.path = outputPath;
                        file.filename = path.basename(outputPath);
                        file.mimetype = 'image/jpeg';
                    })();
                    conversionPromises.push(promise);
                }
            }
        }

        await Promise.all(conversionPromises);
        next();
    } catch (err) {
        console.error('Error in convertJfifToJpeg:', err);
        next(err);
    }
};

// ✅ Error handling middleware
const handleMulterError = (err, req, res, next) => {
    console.log('Upload error:', err);
    if (err instanceof multer.MulterError || err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

// ✅ Exported upload handlers
const uploadHandlers = {
    single: (fieldName) => upload.single(fieldName),
    fields: (fields) => upload.fields(fields),
};

// ✅ Final export
export const uploadMedia = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'content_image', maxCount: 1 },
    { name: 'content_video', maxCount: 1 }
]);

export { upload, uploadHandlers, convertJfifToJpeg, handleMulterError };

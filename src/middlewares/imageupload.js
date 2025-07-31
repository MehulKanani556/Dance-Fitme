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
        } else if (file.fieldname === 'style_image') {
            uploadPath += 'style_images';
        } else {
            return cb(new Error("Invalid field name"), null);
        }

        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}${ext}`;
        cb(null, fileName);
    }
});

// ✅ File validation
const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isOctetStream = file.mimetype === 'application/octet-stream';
    const ext = path.extname(file.originalname).toLowerCase();
    const isJfifExt = ext === '.jfif';

    const allowedImageFields = ['image', 'classCategory_image', 'content_image', 'style_image'];
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
        const filesToConvert = [];

        if (req.file) {
            filesToConvert.push(req.file); // Single upload
        }

        if (req.files) {
            for (const key in req.files) {
                const fileArray = req.files[key];
                fileArray.forEach(f => filesToConvert.push(f));
            }
        }

        const conversionPromises = filesToConvert.map(async (file) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const isConvertible = ext === '.jfif' || file.mimetype === 'image/jfif' || file.mimetype === 'application/octet-stream';

            if (!isConvertible) return;

            const inputPath = file.path;
            const outputPath = inputPath.replace(/\.[^/.]+$/, "") + ".jpeg";

            await sharp(inputPath).jpeg().toFile(outputPath);

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

            // Update file object to point to new JPEG file
            file.path = outputPath;
            file.filename = path.basename(outputPath);
            file.mimetype = 'image/jpeg';
        });

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

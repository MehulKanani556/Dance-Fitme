import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';

dotenv.config();

// 🛠 S3 Client Configuration
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: String(process.env.S3_ACCESS_KEY).trim(),
        secretAccessKey: String(process.env.S3_SECRET_KEY).trim()
    }
});

// 🗂 Map field names to S3 folders
const getS3Folder = (fieldname) => {
    switch (fieldname) {
        case 'image':
            return 'images';
        case 'classCategory_image':
            return 'classCategory_images';
        case 'content_image':
            return 'content_images';
        case 'content_video':
            return 'content_videos';
        case 'style_image':
            return 'style_images';
        case 'planDetails_image':
            return 'planDetails_images';
        case 'plan_image':
            return 'plan_images';
        case 'plan_video':
            return 'plan_videos';
        default:
            throw new Error(`Invalid field name: ${fieldname}`);
    }
};

// 📦 Multer S3 Storage
const storage = multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
        cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
        try {
            const folder = getS3Folder(file.fieldname);
            const ext = path.extname(file.originalname);
            const fileName = `${Date.now()}${ext}`;
            cb(null, `${folder}/${fileName}`);
        } catch (err) {
            cb(err);
        }
    }
});

// ✅ File validation
const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isOctetStream = file.mimetype === 'application/octet-stream';
    const ext = path.extname(file.originalname).toLowerCase();
    const isJfifExt = ext === '.jfif';

    const allowedImageFields = ['image', 'classCategory_image', 'content_image', 'style_image', 'planDetails_image', 'plan_image'];
    const allowedVideoFields = ['content_video', 'plan_video'];

    if (allowedImageFields.includes(file.fieldname)) {
        return (isImage || isOctetStream || isJfifExt) ? cb(null, true) : cb(new Error('Invalid image file.'));
    }

    if (allowedVideoFields.includes(file.fieldname)) {
        return isVideo ? cb(null, true) : cb(new Error('Invalid video file.'));
    }

    return cb(new Error(`Invalid field name for file upload: ${file.fieldname}`));
};

// 📥 Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 200 } // 200MB
});

// 🔄 Convert JFIF to JPEG — Note: This will need download/convert/re-upload for S3
const convertJfifToJpeg = async (req, res, next) => {
    console.log('JFIF conversion placeholder — needs custom S3 handling.');
    next();
};

// ⚠️ Error handler
const handleMulterError = (err, req, res, next) => {
    console.error('Upload error:', err);
    return res.status(400).json({
        success: false,
        message: err.message
    });
};

// 📤 Exported upload handlers
export const uploadMedia = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'content_image', maxCount: 1 },
    { name: 'content_video', maxCount: 1 },
    { name: 'plan_image', maxCount: 1 },
    { name: 'plan_video', maxCount: 1 }
]);

export { upload, convertJfifToJpeg, handleMulterError };

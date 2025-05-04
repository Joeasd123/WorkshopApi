const multer = require('multer');
const path = require('path');
const prisma = require('../config/prisma');

// ตั้งค่า multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

exports.uploadFile = (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ code: "400", status: false, message: "Multer Error" });
        }

        if (!req.file) {
            return res.status(400).json({ code: "400", status: false, message: "No file uploaded" });
        }

        try {
            const filePath = path.join("uploads/", req.file.filename);
            const uploadData = await prisma.upload.create({
                data: {
                    url: filePath,
                }
            });

            res.json({
                code: "200",
                status: true,
                message: "อัปโหลดสำเร็จ",
                data: uploadData
            });

        } catch (error) {
            console.error("Database error:", error);
            res.status(500).json({ code: "500", status: false, message: "Server Error" });
        }
    });
};

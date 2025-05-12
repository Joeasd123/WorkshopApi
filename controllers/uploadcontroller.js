const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const prisma = require('../config/prisma');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // หรือใช้ anon ถ้าต้องการ
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ใช้ memory storage แทน diskStorage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

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
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // อัปโหลดไฟล์ไป Supabase
      const { error: uploadError } = await supabase
        .storage
        .from('uploads') 
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype
        });

      if (uploadError) {
        throw uploadError;
      }

      // เอา public URL มาใช้
      const { data: publicUrlData } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // บันทึก URL ลง DB
      const uploadData = await prisma.upload.create({
        data: {
          url: publicUrl,
        }
      });

      res.json({
        code: "200",
        status: true,
        message: "อัปโหลดสำเร็จ",
        data: uploadData
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ code: "500", status: false, message: "Server Error" });
    }
  });
};

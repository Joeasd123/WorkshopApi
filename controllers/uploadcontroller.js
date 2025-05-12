const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const prisma = require('../config/prisma');

// โหลด environment variables
require('dotenv').config();

// ตั้งค่า Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // หรือใช้ anon ถ้าต้องการ
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ใช้ memory storage แทน diskStorage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // ขนาดไฟล์สูงสุด 10MB
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
      // ตั้งชื่อไฟล์ที่อัปโหลด
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // อัปโหลดไฟล์ไปยัง Supabase
      const { error: uploadError } = await supabase
        .storage
        .from('uploads')  // ชื่อ bucket ที่ต้องการ
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,  // กำหนดชนิดของไฟล์
          upsert: true  // ใช้เพื่อไม่ให้เกิดการเขียนทับไฟล์เดิม (ถ้าต้องการ)
        });

      if (uploadError) {
        throw uploadError;
      }

      // รับ URL สาธารณะ (public URL) ของไฟล์ที่อัปโหลด
      const { data: { publicUrl }, error: urlError } = await supabase
      .storage
      .from('uploads')
      .getPublicUrl(filePath);
    
    if (urlError || !publicUrl) {
      throw urlError || new Error("No public URL returned");
    }
    
    // บันทึกลงฐานข้อมูล
    const uploadData = await prisma.upload.create({
      data: {
        url: publicUrl
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

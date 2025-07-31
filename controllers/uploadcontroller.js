const supabase = require('../lib/supabase');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// ใช้ memory storage ของ multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware สำหรับ Express route
exports.uploadMiddleware = upload.single('file');

// ฟังก์ชันอัปโหลดไฟล์
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;

    // อัปโหลดไฟล์ขึ้น Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('newupload') // ชื่อ bucket ของคุณ
      .upload(`uploads/${fileName}`, file.buffer, {
        cacheControl: '3600', // เก็บ cache 1 ชั่วโมง
        upsert: false, // ไม่เขียนทับไฟล์ถ้ามีอยู่แล้ว
        contentType: file.mimetype, // กำหนดประเภทไฟล์
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ message: 'Upload failed', error: uploadError });
    }

    // ดึง public URL ของไฟล์
    const { data: publicUrlData, error: publicUrlError } = supabase.storage
      .from('newupload')
      .getPublicUrl(`uploads/${fileName}`);

    if (publicUrlError) {
      console.error('Public URL error:', publicUrlError);
      return res.status(500).json({ message: 'Failed to get public URL', error: publicUrlError });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      url: publicUrlData.publicUrl,
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

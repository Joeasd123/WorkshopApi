const prisma = require('../config/prisma');
const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

// สร้าง user ใหม่ (register) - ไม่ต้องใช้ token
exports.create = async (req, res) => {
  try {
    const { email, password, name, address } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ message: 'Failed to create auth user', error });
    }

    const auth_uid = data.user.id;

    const newUser = await prisma.user.create({
      data: {
        auth_uid,
        email,
        name,
        address: address || null,
      },
      include: { images: true },
    });

    res.status(201).json(newUser);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// อัปเดตข้อมูล user (ต้องมี token)
exports.update = async (req, res) => {
  try {
    const uid = req.user.id;

    const { name, address } = req.body;
    const files = req.files || [];

    const pictureList = [];

    // อัปโหลดไฟล์ถ้ามี
    for (const file of files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${uid}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(500).json({ message: 'File upload failed.', error: uploadError });
      }

      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      pictureList.push({ url: publicUrlData.publicUrl });
    }

    // อัปเดตข้อมูล user พร้อมภาพ
    const userData = await prisma.user.upsert({
      where: { auth_uid: uid },
      update: {
        name,
        email,
        address,
        images: {
          deleteMany: {}, // ลบภาพเก่าทั้งหมดก่อน
          create: pictureList,
        },
      },
      create: {
        auth_uid: uid,
        name,
        email,
        address,
        images: {
          create: pictureList,
        },
      },
      include: {
        images: true,
      },
    });

    res.json(userData);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ดึงข้อมูล user (ต้องมี token)
exports.get = async (req, res) => {
  try {
    const uid = req.user.id;

    const userData = await prisma.user.findUnique({
      where: { auth_uid: uid },
      include: { images: true },
    });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userData);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error });
  }
};

const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

// ✅ Register
const supabase = require('../lib/supabase');

exports.register = async (req, res) => {
  try {
    const { email, password, name, images } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // สมัครผู้ใช้ผ่าน Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const supabaseUser = data.user;

    // บันทึกข้อมูลเสริมใน Prisma DB
    const newUser = await prisma.user.create({
      data: {
        auth_uid: supabaseUser.id, // ใช้ UID จาก Supabase
        email,
        name,
        images: images ? { create: images } : undefined,
      },
      include: { images: true },
    });

    res.status(201).json({
      message: "Register successful",
      user: newUser,
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// ✅ Login


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, password: password ? '******' : null });

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('Login error from Supabase:', error);
      return res.status(400).json({ message: error.message });
    }

    const { session, user } = data;

    res.json({
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
      }
    });

  } catch (error) {
    console.error("Supabase login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


// ✅ ตรวจสอบว่า token ใช้งานได้ (ต้องใช้ middleware ดึง req.user มาก่อน)
exports.currentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.SECRET);

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      include: { images: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Current user error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

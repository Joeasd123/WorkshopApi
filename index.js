require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const http = require('http'); // นำเข้าโมดูล http
const { Server } = require('socket.io'); // นำเข้า Server จาก socket.io
const { readdirSync, existsSync, mkdirSync } = require('fs'); // เพิ่ม existsSync, mkdirSync สำหรับสร้างโฟลเดอร์ uploads
const cors = require('cors');
const multer = require('multer'); // นำเข้า multer สำหรับการอัปโหลดไฟล์
const path = require('path'); // นำเข้า path สำหรับจัดการเส้นทางไฟล์

// ******** Middleware ********
app.use(morgan('dev')); // Logger สำหรับ HTTP requests
app.use(express.json()); // Body parser สำหรับ JSON payloads
app.use(cors()); // CORS header management

// ******** การตั้งค่า Environment Variables ********
// คุณสามารถตั้งค่า PORT ในไฟล์ .env หรือจะใช้ค่าเริ่มต้น 3001
const PORT = process.env.PORT || 3001;

console.log('SUPABASE_URL:', process.env.SUPABASE_URL); // แสดงค่าจาก .env เพื่อ debug (ถ้าใช้)
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY); // แสดงค่าจาก .env เพื่อ debug (ถ้าใช้)

// ******** ตรวจสอบและสร้างโฟลเดอร์ 'uploads' หากยังไม่มี ********
const UPLOADS_DIR = 'uploads';
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR);
  console.log(`โฟลเดอร์ '${UPLOADS_DIR}' ถูกสร้างขึ้นแล้ว.`);
}

// ******** การตั้งค่า Multer สำหรับการอัปโหลดไฟล์ ********
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // บันทึกไฟล์ที่อัปโหลดในโฟลเดอร์ 'uploads'
  },
  filename: (req, file, cb) => {
    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน: timestamp-originalfilename.ext
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// ******** เสิร์ฟไฟล์คงที่จากโฟลเดอร์ 'uploads' ********
// ทำให้รูปภาพที่อัปโหลดสามารถเข้าถึงได้ผ่าน URL
app.use('/api/uploads', express.static(UPLOADS_DIR));
console.log(`ให้บริการไฟล์คงที่จากโฟลเดอร์ '/${UPLOADS_DIR}' ภายใต้ URL '/api/uploads'`);

// ******** สร้าง HTTP Server และ Socket.IO Server ********
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // ในการพัฒนา ใช้ '*' ได้ แต่ในการผลิต ควรระบุ Domain ของ Client ที่แน่นอน (เช่น 'https://your-flutter-app.com')
    methods: ['GET', 'POST'],
    credentials: true // อนุญาตให้ส่ง cookies/authorization headers
  },
});

// ******** Map เพื่อเก็บการเชื่อมโยงระหว่าง userId กับ socket.id ********
// นี่เป็นสิ่งสำคัญสำหรับระบบ Private Chat
const connectedUsers = {}; // Key: userId (จาก Flutter), Value: socket.id (ของ Socket.IO)

// ******** Socket.IO Connection Handling ********
io.on('connection', (socket) => {
  console.log(`⚡ ผู้ใช้เชื่อมต่อแล้ว: Socket ID = ${socket.id}`);

  // 1. รับอีเวนต์ "client_ready" จาก Flutter client
  //    ใช้เพื่อลงทะเบียน userId กับ socket.id เมื่อไคลเอนต์พร้อม
  socket.on('client_ready', (data) => {
    const userId = data.userId;
    if (userId) { // ตรวจสอบว่า userId ไม่เป็น null/undefined
      console.log(`Client Ready: userId=${userId}, socket.id=${socket.id}`);
      connectedUsers[userId] = socket.id; // เก็บ socket.id ของผู้ใช้คนนี้
      socket.userId = userId; // ผูก userId กับ socket object ด้วย เพื่อใช้ง่ายๆ ตอน disconnect
      console.log('Current connected users map:', connectedUsers);
    } else {
      console.warn(`Warning: client_ready event received with no userId. Socket ID: ${socket.id}`);
    }
  });

  // 2. รับอีเวนต์ "SendMessage" จาก Flutter client (สำหรับข้อความตัวอักษร)
  socket.on('SendMessage', (data) => {
    // data ควรเป็น array: [senderId, senderName, receiverId, messageText]
    const [senderId, senderName, receiverId, messageText] = data;

    console.log(`Received text message: From ${senderId} to ${receiverId}: "${messageText}"`);

    // ส่งข้อความกลับไปหาผู้ส่งเอง (เพื่อให้ผู้ส่งเห็นข้อความที่ตัวเองพิมพ์ไปทันที)
    socket.emit('ReceivePrivateMessage', [senderId, senderName, receiverId, messageText]);

    // ส่งข้อความไปยังผู้รับที่ระบุ (Private Message Logic)
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId && receiverSocketId !== socket.id) { // ตรวจสอบว่าผู้รับออนไลน์และไม่ใช่ตัวเอง
        io.to(receiverSocketId).emit('ReceivePrivateMessage', [senderId, senderName, receiverId, messageText]);
        console.log(`Text message sent to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
    } else if (receiverSocketId === socket.id) {
        console.log(`Message is for self, already echoed. Receiver ID: ${receiverId}`);
    } else {
        console.log(`Receiver ${receiverId} is not online or not registered. Message not delivered.`);
        // คุณอาจจะเพิ่ม logic การเก็บข้อความในฐานข้อมูลเพื่อส่งเมื่อผู้รับออนไลน์
    }
  });

  // 3. รับอีเวนต์ "SendImage" จาก Flutter client (สำหรับ URL รูปภาพ)
  socket.on('SendImage', (data) => {
    // data ควรเป็น array: [senderId, senderName, receiverId, imageUrl]
    const [senderId, senderName, receiverId, imageUrl] = data;

    console.log(`Received image URL: From ${senderId} to ${receiverId}: "${imageUrl}"`);

    // ส่งรูปภาพกลับไปหาผู้ส่งเอง (เพื่อให้ผู้ส่งเห็นรูปที่ตัวเองส่งไปทันที)
    socket.emit('ReceivePrivateImage', [senderId, senderName, receiverId, imageUrl]);

    // ส่งรูปภาพไปยังผู้รับที่ระบุ (Private Message Logic)
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId && receiverSocketId !== socket.id) { // ตรวจสอบว่าผู้รับออนไลน์และไม่ใช่ตัวเอง
        io.to(receiverSocketId).emit('ReceivePrivateImage', [senderId, senderName, receiverId, imageUrl]);
        console.log(`Image sent to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
    } else if (receiverSocketId === socket.id) {
        console.log(`Image is for self, already echoed. Receiver ID: ${receiverId}`);
    } else {
        console.log(`Receiver ${receiverId} is not online or not registered. Image not delivered.`);
    }
  });

  // 4. จัดการการตัดการเชื่อมต่อ (Disconnect)
  socket.on('disconnect', () => {
    console.log(`🔥 ผู้ใช้ตัดการเชื่อมต่อแล้ว: Socket ID = ${socket.id}`);
    // ลบผู้ใช้ที่ตัดการเชื่อมต่อออกจาก Map connectedUsers
    if (socket.userId && connectedUsers[socket.userId] === socket.id) {
        delete connectedUsers[socket.userId];
        console.log(`User ${socket.userId} (Socket ID: ${socket.id}) removed from connectedUsers.`);
    }
    console.log('Current connected users map after disconnect:', connectedUsers);
  });
});

// ******** API Endpoint สำหรับอัปโหลดรูปภาพ ********
// 'image' คือชื่อ field ใน FormData ที่ Flutter จะใช้ (http.MultipartFile.fromPath('image', imagePath))
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // สร้าง URL ที่สามารถเข้าถึงไฟล์ได้
  // !!! สำคัญ: เปลี่ยน 'https://workshopapi-x83c.onrender.com' เป็น Domain ของ Render App ของคุณจริงๆ
  // หรือใช้ req.protocol + '://' + req.get('host') สำหรับ Local Development
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`; // สามารถกำหนด BASE_URL ใน .env ได้
  const imageUrl = `${baseUrl}/api/uploads/${req.file.filename}`;

  console.log(`File uploaded: ${req.file.filename}, accessible at: ${imageUrl}`);
  res.json({ imageUrl: imageUrl });
});


// ******** Auto-import API Routes (Express) ********
// ตรวจสอบให้แน่ใจว่าโฟลเดอร์ 'routes' มีไฟล์ route ของคุณอยู่
readdirSync('./routes').map((item) => {
  console.log('📦 loading route:', item);
  app.use('/api', require('./routes/' + item));
});

// ******** Root Endpoint สำหรับทดสอบ API ********
app.get('/', (req, res) => {
  res.send('API กำลังทำงานพร้อมรองรับ Socket.IO และ File Upload!');
});

// ******** เริ่ม Server (ใช้ server.listen เท่านั้น!) ********
server.listen(PORT, () => {
  console.log(`✅ เซิร์ฟเวอร์กำลังทำงานบนพอร์ต ${PORT}`);
  console.log(`🚀 Socket.IO พร้อมสำหรับการเชื่อมต่อแล้ว`);
  console.log(`📂 Endpoint สำหรับอัปโหลดไฟล์: POST /api/upload`);
  console.log(`🖼️ ไฟล์ที่อัปโหลดเข้าถึงได้ที่: /api/uploads/:filename`);
});

// ******** หมายเหตุ: บรรทัด app.listen(PORT, ...) เดิมถูกลบออกไปแล้ว ********
// เนื่องจากการเรียก listen สองครั้งบนพอร์ตเดียวกันจะทำให้เกิด Error: EADDRINUSE
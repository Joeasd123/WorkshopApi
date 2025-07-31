require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const http = require('http'); // นำเข้าโมดูล http
const { Server } = require('socket.io'); // นำเข้า Server จาก socket.io
const { readdirSync } = require('fs');
const cors = require('cors');

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use('/api/uploads', express.static('uploads')); // หากมีโฟลเดอร์ uploads สำหรับไฟล์คงที่

// ******** การตั้งค่า Environment Variables ********
const DATABASE_URL = process.env.DATABASE_URL; // คุณอาจจะใช้หรือไม่ใช้ก็ได้
const SECRET = process.env.SECRET;             // คุณอาจจะใช้หรือไม่ใช้ก็ได้
const PORT = process.env.PORT || 3001; // สามารถเปลี่ยนเป็นพอร์ตอื่นได้หากต้องการ เช่น 8000, 5000

console.log('SUPABASE_URL:', process.env.SUPABASE_URL); // แสดงค่าจาก .env เพื่อ debug
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY); // แสดงค่าจาก .env เพื่อ debug

// ******** สร้าง HTTP Server และ Socket.IO Server ********
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // ในการพัฒนา ใช้ '*' ได้ แต่ในการผลิต ควรระบุ Domain ของ Client ที่แน่นอน
    methods: ['GET', 'POST'],
    credentials: true // อนุญาตให้ส่ง cookies/authorization headers
  },
});

// ******** Map เพื่อเก็บการเชื่อมโยงระหว่าง userId กับ socket.id ********
// สิ่งนี้สำคัญสำหรับการส่งข้อความแบบ Private
const connectedUsers = {}; // Key: userId (จาก Flutter), Value: socket.id (ของ Socket.IO)

// ******** Socket.IO Connection Handling ********
io.on('connection', (socket) => {
  console.log(`⚡ ผู้ใช้เชื่อมต่อแล้ว: Socket ID = ${socket.id}`);

  // 1. รับอีเวนต์ "client_ready" จาก Flutter client
  //    ใช้เพื่อลงทะเบียน userId กับ socket.id
  socket.on('client_ready', (data) => {
    const userId = data.userId;
    console.log(`Client Ready: userId=${userId}, socket.id=${socket.id}`);
    connectedUsers[userId] = socket.id; // เก็บ socket.id ของผู้ใช้คนนี้
    socket.userId = userId; // ผูก userId กับ socket object ด้วย เพื่อใช้ง่ายๆ ตอน disconnect
    console.log('Current connected users map:', connectedUsers);
  });

  // 2. รับอีเวนต์ "SendMessage" จาก Flutter client
  //    สำหรับส่งข้อความตัวอักษร
  socket.on('SendMessage', (data) => {
    // data ควรเป็น array: [senderId, senderName, receiverId, messageText]
    const [senderId, senderName, receiverId, messageText] = data;

    console.log(`Received text message: From ${senderId} to ${receiverId}: "${messageText}"`);

    // ส่งข้อความกลับไปหาผู้ส่งเอง (เพื่อให้ผู้ส่งเห็นข้อความที่ตัวเองพิมพ์ไปทันที)
    socket.emit('ReceivePrivateMessage', [senderId, senderName, receiverId, messageText]);

    // ส่งข้อความไปยังผู้รับที่ระบุ (Private Message Logic)
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId) {
        // ถ้าผู้รับออนไลน์ ให้ส่งข้อความไปหา Socket ID ของผู้รับโดยตรง
        io.to(receiverSocketId).emit('ReceivePrivateMessage', [senderId, senderName, receiverId, messageText]);
        console.log(`Text message sent to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
    } else {
        // กรณีผู้รับไม่ออนไลน์ (หรือยังไม่ได้ลงทะเบียน client_ready)
        console.log(`Receiver ${receiverId} is not online or not registered. Message not delivered.`);
        // คุณอาจจะเพิ่ม logic การเก็บข้อความใน DB เพื่อส่งเมื่อผู้รับออนไลน์
    }
  });

  // 3. รับอีเวนต์ "SendImage" จาก Flutter client
  //    สำหรับส่งรูปภาพ (ต้องมีการจัดการอัปโหลดรูปภาพที่ฝั่ง client ก่อน)
  socket.on('SendImage', (data) => {
    // data ควรเป็น array: [senderId, senderName, receiverId, imageUrl]
    const [senderId, senderName, receiverId, imageUrl] = data;

    console.log(`Received image: From ${senderId} to ${receiverId}: "${imageUrl}"`);

    // ส่งรูปภาพกลับไปหาผู้ส่งเอง
    socket.emit('ReceivePrivateImage', [senderId, senderName, receiverId, imageUrl]);

    // ส่งรูปภาพไปยังผู้รับที่ระบุ
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('ReceivePrivateImage', [senderId, senderName, receiverId, imageUrl]);
        console.log(`Image sent to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
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

// ******** Auto-import API Routes (Express) ********
readdirSync('./routes').map((item) => {
  console.log('📦 loading route:', item);
  app.use('/api', require('./routes/' + item));
});

// ******** Root Endpoint สำหรับทดสอบ API ********
app.get('/', (req, res) => {
  res.send('API กำลังทำงานพร้อมรองรับ Socket.IO!');
});

// ******** เริ่ม Server (ใช้ server.listen เท่านั้น!) ********
server.listen(PORT, () => {
  console.log(`✅ เซิร์ฟเวอร์กำลังทำงานบนพอร์ต ${PORT}`);
  console.log(`🚀 Socket.IO พร้อมสำหรับการเชื่อมต่อแล้ว`);
});

// ******** หมายเหตุ: บรรทัด app.listen(PORT, ...) เดิมถูกลบออกไปแล้ว ********
// เนื่องจากการเรียก listen สองครั้งบนพอร์ตเดียวกันจะทำให้เกิด Error: EADDRINUSE
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
app.use('/api/uploads', express.static('uploads'));

const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.SECRET;
// ******** แก้ไขพอร์ตตรงนี้ หรือตั้งค่าในไฟล์ .env ********
const PORT = process.env.PORT || 3001; // เปลี่ยนเป็นพอร์ตอื่น เช่น 3001
// ******************************************************

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('⚡ ผู้ใช้เชื่อมต่อแล้ว:', socket.id);
  socket.on('chat message', (msg) => {
    console.log('ข้อความ:', msg);
    io.emit('chat message', msg);
  });
  socket.on('disconnect', () => {
    console.log('🔥 ผู้ใช้ตัดการเชื่อมต่อแล้ว:', socket.id);
  });
});

// Auto-import routes
readdirSync('./routes').map((item) => {
  console.log('📦 loading route:', item);
  app.use('/api', require('./routes/' + item));
});

app.get('/', (req, res) => {
  res.send('API กำลังทำงานพร้อมรองรับ Socket.IO!');
});

// ******** บรรทัดนี้ถูกต้องแล้ว ให้ใช้ server.listen เท่านั้น ********
server.listen(PORT, () => {
  console.log(`✅ เซิร์ฟเวอร์กำลังทำงานบนพอร์ต ${PORT}`);
  console.log(`🚀 Socket.IO พร้อมสำหรับการเชื่อมต่อแล้ว`);
});

// ******** ลบบรรทัดนี้ออก เพราะซ้ำซ้อนและทำให้เกิดปัญหา EADDRINUSE ********
// app.listen(PORT, () => {
//   console.log(`✅ Server is running on port ${PORT}`);
// });
// *******************************************************************
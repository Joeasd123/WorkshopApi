// server.js (หรือ app.js)

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { readdirSync, existsSync, mkdirSync } = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const morgan = require('morgan'); 


const { setupSocketListeners } = require('./src/socketController');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = 'uploads';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// --- File Upload Setup (Multer) ---
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR);
  console.log(`Created uploads directory: '${UPLOADS_DIR}'`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

app.use('/api/uploads', express.static(UPLOADS_DIR));
console.log(`Serving static files from '/${UPLOADS_DIR}' at '/api/uploads'`);

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// *** เรียกใช้ฟังก์ชัน setupSocketListeners เพื่อตั้งค่า Socket.IO events ***
setupSocketListeners(io); // ส่ง instance ของ io เข้าไป

// --- API Endpoints (Express Routes) ---

app.get('/', (req, res) => {
  res.send('API is running, ready for Socket.IO and File Uploads!');
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const imageUrl = `${BASE_URL}/api/uploads/${req.file.filename}`;

  console.log(`File uploaded: ${req.file.filename}, accessible at: ${imageUrl}`);
  res.json({ imageUrl });
});

try {
  readdirSync('./routes').forEach((file) => {
    if (file.endsWith('.js')) {
      console.log(`📦 Loading route: ${file}`);
      app.use('/api', require(`./routes/${file}`));
    }
  });
} catch (error) {
  console.warn('No "routes" directory found or error reading routes:', error.message);
}

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🚀 Socket.IO is ready for connections`);
  console.log(`📂 File upload endpoint: POST /api/upload`);
  console.log(`🖼️ Uploaded files accessible at: /api/uploads/:filename`);
  console.log(`Base URL for uploads: ${BASE_URL}`);
});
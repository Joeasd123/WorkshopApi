require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { readdirSync, existsSync, mkdirSync } = require('fs');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = 'uploads';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; // For dynamic URL generation

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
  origin: '*', // Be specific in production, e.g., 'https://your-flutter-app.com'
  methods: ['GET', 'POST'],
  credentials: true
}));

// --- File Upload Setup (Multer) ---
// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR);
  console.log(`Created uploads directory: '${UPLOADS_DIR}'`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Serve static uploaded files
app.use('/api/uploads', express.static(UPLOADS_DIR));
console.log(`Serving static files from '/${UPLOADS_DIR}' at '/api/uploads'`);

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: '*', // Same as app.use(cors()) for consistency
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Map to store userId to socket.id for private messaging
const connectedUsers = {}; // Key: userId (from Flutter), Value: socket.id

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log(`⚡ User connected: Socket ID = ${socket.id}`);

  // Event: client_ready - Register userId with socket.id
  socket.on('client_ready', (data) => {
    const userId = data.userId;
    if (userId) {
      console.log(`Client Ready: userId=${userId}, socket.id=${socket.id}`);
      connectedUsers[userId] = socket.id;
      socket.userId = userId; // Attach userId to socket object for easy access on disconnect
      console.log('Current connected users map:', connectedUsers);
    } else {
      console.warn(`Warning: 'client_ready' event received with no userId. Socket ID: ${socket.id}`);
    }
  });

  // Event: SendMessage - Handle text messages
  socket.on('SendMessage', (data) => {
    // data should be an array: [senderId, senderName, receiverId, messageText]
    // Add validation for incoming data for robustness
    if (!Array.isArray(data) || data.length < 4) {
      console.error(`Invalid 'SendMessage' data received from ${socket.id}:`, data);
      return; // Abort if data is not as expected
    }

    const [senderId, senderName, receiverId, messageText] = data;
    console.log(`Received text message: From ${senderId} to ${receiverId}: "${messageText}"`);

    // Prepare data to send back
    const messagePayload = [senderId, senderName, receiverId, messageText];

    // Echo message back to sender (for immediate display)
    socket.emit('ReceivePrivateMessage', messagePayload);

    // Send message to the intended receiver
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId && receiverSocketId !== socket.id) {
        io.to(receiverSocketId).emit('ReceivePrivateMessage', messagePayload);
        console.log(`Text message emitted to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
    } else if (receiverSocketId === socket.id) {
        console.log(`Message is for self, already echoed. Receiver ID: ${receiverId}`);
    } else {
        console.log(`Receiver ${receiverId} is offline or not registered. Message not delivered.`);
        // Optional: Implement logic to store offline messages in a database
    }
  });

  // Event: SendImage - Handle image URLs
  socket.on('SendImage', (data) => {
    // data should be an array: [senderId, senderName, receiverId, imageUrl]
    // Add validation for incoming data for robustness
    if (!Array.isArray(data) || data.length < 4) {
      console.error(`Invalid 'SendImage' data received from ${socket.id}:`, data);
      return; // Abort if data is not as expected
    }

    const [senderId, senderName, receiverId, imageUrl] = data;
    console.log(`Received image URL: From ${senderId} to ${receiverId}: "${imageUrl}"`);

    // Prepare data to send back
    const imagePayload = [senderId, senderName, receiverId, imageUrl];

    // Echo image back to sender
    socket.emit('ReceivePrivateImage', imagePayload);

    // Send image to the intended receiver
    const receiverSocketId = connectedUsers[receiverId];
    if (receiverSocketId && receiverSocketId !== socket.id) {
        io.to(receiverSocketId).emit('ReceivePrivateImage', imagePayload);
        console.log(`Image emitted to receiver ${receiverId} (Socket ID: ${receiverSocketId})`);
    } else if (receiverSocketId === socket.id) {
        console.log(`Image is for self, already echoed. Receiver ID: ${receiverId}`);
    } else {
        console.log(`Receiver ${receiverId} is offline or not registered. Image not delivered.`);
    }
  });

  // Event: disconnect - Clean up connectedUsers map
  socket.on('disconnect', () => {
    console.log(`🔥 User disconnected: Socket ID = ${socket.id}`);
    if (socket.userId && connectedUsers[socket.userId] === socket.id) {
        delete connectedUsers[socket.userId];
        console.log(`User ${socket.userId} (Socket ID: ${socket.id}) removed from connectedUsers.`);
    }
    console.log('Current connected users map after disconnect:', connectedUsers);
  });
});

// --- API Endpoints (Express Routes) ---

// Root endpoint for health check
app.get('/', (req, res) => {
  res.send('API is running, ready for Socket.IO and File Uploads!');
});

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Construct the full URL for the uploaded image
  const imageUrl = `${BASE_URL}/api/uploads/${req.file.filename}`;

  console.log(`File uploaded: ${req.file.filename}, accessible at: ${imageUrl}`);
  res.json({ imageUrl });
});

// Auto-import API Routes from the 'routes' directory
// Ensure your 'routes' folder exists and contains your route files
try {
  readdirSync('./routes').forEach((file) => {
    if (file.endsWith('.js')) { // Only process .js files
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


const connectedUsers = {}; 

/**
 * ฟังก์ชันนี้จะตั้งค่า Event Listeners ทั้งหมดสำหรับ Socket.IO
 * @param {SocketIO.Server} io - Instance ของ Socket.IO Server
 */
const setupSocketListeners = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ ผู้ใช้เชื่อมต่อแล้ว: Socket ID = ${socket.id}`);

    // Event: client_ready - Register userId with socket.id
    socket.on('client_ready', (data) => {
      const userId = data.userId;
      if (userId) {
        console.log(`Client Ready: userId=${userId}, socket.id=${socket.id}`);
        connectedUsers[userId] = socket.id;
        socket.userId = userId; // Attach userId to socket object
        console.log('Current connected users map:', connectedUsers);
      } else {
        console.warn(`Warning: 'client_ready' event received with no userId. Socket ID: ${socket.id}`);
      }
    });

    // Event: SendMessage - Handle text messages
 socket.on('SendMessage', (data) => {
  if (!data || typeof data !== 'object') {
    console.error(`Invalid 'SendMessage' data received from ${socket.id}:`, data);
    return;
  }

  const { senderId, senderName, receiverId, messageText } = data;
  console.log(`Received text message: From ${senderId} to ${receiverId}: "${messageText}"`);

  const messagePayload = { senderId, senderName, receiverId, messageText };

  // Echo back to sender
  socket.emit('ReceivePrivateMessage', messagePayload);

  // Send to receiver
  const receiverSocketId = connectedUsers[receiverId];
  if (receiverSocketId && receiverSocketId !== socket.id) {
    io.to(receiverSocketId).emit('ReceivePrivateMessage', messagePayload);
    console.log(`Message sent to ${receiverId} (Socket ID: ${receiverSocketId})`);
  } else if (receiverSocketId === socket.id) {
    console.log(`Message is for self`);
  } else {
    console.log(`Receiver ${receiverId} is offline or not registered`);
  }
});


    // Event: SendImage - Handle image URLs
    socket.on('SendImage', (data) => {
      // data should be an array: [senderId, senderName, receiverId, imageUrl]
      if (!Array.isArray(data) || data.length < 4) {
        console.error(`Invalid 'SendImage' data received from ${socket.id}:`, data);
        return;
      }

      const [senderId, senderName, receiverId, imageUrl] = data;
      console.log(`Received image URL: From ${senderId} to ${receiverId}: "${imageUrl}"`);

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
      console.log(`🔥 ผู้ใช้ตัดการเชื่อมต่อแล้ว: Socket ID = ${socket.id}`);
      if (socket.userId && connectedUsers[socket.userId] === socket.id) {
          delete connectedUsers[socket.userId];
          console.log(`User ${socket.userId} (Socket ID: ${socket.id}) removed from connectedUsers.`);
      }
      console.log('Current connected users map after disconnect:', connectedUsers);
    });
  });
};

module.exports = { setupSocketListeners };
const express = require('express');
const app = express();
const morgan = require('morgan');
const { readdirSync } = require('fs');
const cors = require('cors');
const uploadRouter = require('./routes/upload');

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());
app.use('/api/uploads', express.static('uploads'));
app.use('/api', uploadRouter);

// Auto-import routes
readdirSync('./routes').map((item) =>
  app.use('/api', require('./routes/' + item))
);

// ✅ ใช้แบบ Express ปกติ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

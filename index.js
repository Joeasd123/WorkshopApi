require('dotenv').config();
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
console.log('✅ Loaded SECRET:', process.env.SECRET);
// Auto-import routes
readdirSync('./routes').map((item) =>
  app.use('/api', require('./routes/' + item))
);
console.log('SECRET is:', process.env.SECRET);

app.get('/', (req, res) => {
    res.send('API is working');
  });

// ✅ ใช้แบบ Express ปกติ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

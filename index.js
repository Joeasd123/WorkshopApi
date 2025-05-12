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
const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.SECRET;
const PORT = process.env.PORT || 3000;
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY);
// Auto-import routes
readdirSync('./routes').map((item) =>
  app.use('/api', require('./routes/' + item))
);


app.get('/', (req, res) => {
    res.send('API is working');
  });



app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});


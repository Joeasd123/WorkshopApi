const express = require('express');
const app= express()
const morgan = require('morgan')
const {readdirSync} = require('fs')
const cors = require('cors')
const uploadRouter = require("./routes/upload");


// const authRouter = require('./routes/auth')
// const categoryRouter = require('./routes/category')
app.use(morgan('dev'))
app.use(express.json())
app.use(cors())
app.use('/api/uploads', express.static('uploads'));
app.use("/api", uploadRouter);

const PORT = 5002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

readdirSync('./routes')
.map((item)=> app.use('/api',require('./routes/'+item)))




// app.use('/api',authRouter)
// app.use('/api',categoryRouter)






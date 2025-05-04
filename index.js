const express = require('express');
const app= express()
const morgan = require('morgan')
const {readdirSync} = require('fs')
const cors = require('cors')
const uploadRouter = require("./routes/upload");
const serverless = require('serverless-http');


// const authRouter = require('./routes/auth')
// const categoryRouter = require('./routes/category')
app.use(morgan('dev'))
app.use(express.json())
app.use(cors())
app.use('/api/uploads', express.static('uploads'));
app.use("/api", uploadRouter);



readdirSync('./routes')
.map((item)=> app.use('/api',require('./routes/'+item)))

module.exports = serverless(app);


// app.use('/api',authRouter)
// app.use('/api',categoryRouter)






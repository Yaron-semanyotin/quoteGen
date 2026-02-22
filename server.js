require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const port = process.env.PORT || 5002;

http.createServer(app).listen(port, () => {
  console.log(`The server is up on port ${port}`);
});

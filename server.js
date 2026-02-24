// ברמת האפליקציה server.js

require('dotenv').config(); // .env מאפשר להשתמש בערכים שנמצאים בתקיית dotenv ייבוא ספריית

const http = require('http'); // HTTP מאפשר ליצור שרת
const mongoose = require('mongoose');  // mongoose ייבוא ספריית
const app = require('./app'); // app.js יבוא קובץ

mongoose // mongoDB חיבור ל
  .connect(process.env.MONGO_URI) // .then .catch לכן יש  Promise מחזיר connect
  .then(() => console.log('Connected to MongoDB')) // אם ההתחברות מצליחה מדפיסים
  .catch((err) => { // process.exit(1) אם ההתחברות נכשלת הדפיס שגיאה ומכבה את השרת בעזרת
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const port = process.env.PORT || 5002; // הגדרת הפורט שעליו השרת רץ

http.createServer(app).listen(port, () => { // יצירת השרת
  console.log(`The server is up on port ${port}`);
});


// server.js הוא לא מכיל לוגיקה עסקית הוא רק
// מרים סביבה מחבר בסיס נתונים ומםעיל שרת
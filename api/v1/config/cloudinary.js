// api/v1/config/cloudinary.js

// כדי app.js בנפרד ולא בתוך cloudinary.js ואת קובץ config יצרתי את תקיית
// להפריד שירותים חיצוניים מהאפליקציה ולשמור על הפרדה נקייה
// בהמשך אעשה זאת למונגו
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
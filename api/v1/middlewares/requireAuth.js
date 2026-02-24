// api/v1/middlewares requireAuth.js

module.exports = (req, res, next) =>{ // פונקציה שמקבלת 3 פרמטקים בקשה תגובה ופונקציה שממשיכה לראוט הבא
  if(!req.session || !req.session.userId){ // userId אם המשתמש לא התחבר לא אמור להיות  userId שדה  בשםsession והאם יש בתוך ה session האם קיים
    return res.redirect('/auth/login'); // מפנה לדף ההתחברות ומונע גישה לראוט session אם אין
  }
  next(); // אומר הכל תקין תמשיך לנתיב הבא
};
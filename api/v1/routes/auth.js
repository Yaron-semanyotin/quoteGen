const router = require('express').Router();
const usersObj = require('../controllers/auth');
const requireAuth = require('../middlewares/requireAuth');
// Pages (views)
router.get('/login', usersObj.showLogin);
router.get('/register', usersObj.showRegister);

// Actions
router.post('/login', usersObj.login);
router.post('/register', usersObj.register);

// logout נוסיף אחרי שנוסיף sessions
router.post('/logout', usersObj.logout);
// router.post('/logout', authController.logout);

router.get('/settings', requireAuth, usersObj.settingsPage);
router.post('/settings', requireAuth, usersObj.updateSettings);
module.exports = router;


// auth.js
const express = require('express');
const { register, login, verifyUser, forgotPassword, resetPassword, checkVerification } = require('../../controllers/authController');
const router = express.Router();

// API routes
router.post('/register', register);
router.post('/login', login);
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});
router.get('/verify/:userId/:uniqueString', verifyUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/check-verification/:userId', checkVerification);

module.exports = router;
// auth.js
const express = require('express');
const { register, login, verifyUser } = require('../../controllers/authController');
const router = express.Router();

// API routes
router.post('/register', register);
router.post('/login', login);
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});
router.get('/verify/:userId/:uniqueString', verifyUser);

module.exports = router;
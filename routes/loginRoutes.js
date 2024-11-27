// authPageRoutes.js
const express = require('express');
const router = express.Router();
const { getResetPasswordPage } = require('../controllers/authController');
const {authenticateUser} = require('../middleware/authMiddleware');

// Page routes
router.get('/login-page', authenticateUser, (req, res) => {
  res.render('login',  { 
    user: req.user || null 
  });
});

router.get('/create-account', authenticateUser, (req, res) => {
  res.render('create-account',  { 
    user: req.user || null 
  });
});

router.get('/verified', authenticateUser, (req, res) => {
  const { error, success, message } = req.query;
  res.render('verified', { 
    success: success === 'true',
    error: error === 'true',
    message: message || 'Email verified successfully! You can now log in.'
  });
});

router.get('/forgot-password', authenticateUser, (req, res) => {
  res.render('forgot-password', { 
    user : req.user || null,
    error: req.query.error,
    success: req.query.success 
  });
});

router.get('/reset-password/:token', getResetPasswordPage);

module.exports = router;
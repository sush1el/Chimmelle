// authPageRoutes.js
const express = require('express');
const router = express.Router();

// Page routes
router.get('/login-page', (req, res) => {
  const { error } = req.query;
  res.render('login', { error });
});

router.get('/create-account', (req, res) => {
  const { error } = req.query;
  res.render('create-account', { error });
});

router.get('/verified', (req, res) => {
  const { error, success, message } = req.query;
  res.render('verified', { 
    success: success === 'true',
    error: error === 'true',
    message: message || 'Email verified successfully! You can now log in.'
  });
});

module.exports = router;

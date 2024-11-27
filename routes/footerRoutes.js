const express = require('express');
const router = express.Router();
const {authenticateUser} = require('../middleware/authMiddleware');

router.get('/contact', authenticateUser, (req, res) => {
  res.render('contact-us', { 
    user: req.user || null  // Pass the user to the view, defaulting to null if not authenticated
  });
});

router.get('/tc', authenticateUser, (req, res) => {
  res.render('tc', { 
    user: req.user || null 
  });
});

router.get('/privacy', authenticateUser, (req, res) => {
  res.render('privacy', { 
    user: req.user || null 
  });
});

router.get('/return', authenticateUser, (req, res) => {
  res.render('return', { 
    user: req.user || null 
  });
});

module.exports = router;
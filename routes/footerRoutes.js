const express = require('express');
const router = express.Router();
const {authenticateUser} = require('../middleware/authMiddleware');

router.get('/contact',authenticateUser, (req, res) => {
  res.render('contact-us');
});

router.get('/tc', authenticateUser, (req, res) => {
  res.render('tc');
});

router.get('/privacy', authenticateUser, (req, res) => {
  res.render('privacy');
});

router.get('/return', authenticateUser, (req, res) => {
  res.render('return');
});

module.exports = router;
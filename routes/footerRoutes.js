const express = require('express');
const router = express.Router();

router.get('/contact', (req, res) => {
  res.render('contact-us');
});

router.get('/tc', (req, res) => {
  res.render('tc');
});

router.get('/privacy', (req, res) => {
  res.render('privacy');
});

router.get('/return', (req, res) => {
  res.render('return');
});

module.exports = router;
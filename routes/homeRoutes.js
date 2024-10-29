const express = require('express');
const { getHomepage } = require('../controllers/homeController');
const { authenticateUser } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticateUser, getHomepage);

router.get('/account', authenticateUser, (req, res) => {
  res.render('account', { user: req.user }); 
});

router.get('/cart', authenticateUser, (req, res) => {
  res.render('cart', { user: req.user });
});

router.get('/login-page', (req, res) => {
  res.render('login'); 
});

router.get('/create-account', (req, res) => {
  res.render('create-account'); 
});

module.exports = router;

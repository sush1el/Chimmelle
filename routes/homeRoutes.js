const express = require('express');
const { getHomepage } = require('../controllers/homeController');
const { getShopPage } = require('../controllers/shopController');
const { authenticateUser } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', authenticateUser, getHomepage);

router.get('/account', authenticateUser, (req, res) => {
  res.render('account', { user: req.user }); 
});

router.get('/cart', authenticateUser, (req, res) => {
  res.render('cart', { user: req.user });
});

router.get('/shop',authenticateUser, getShopPage);
module.exports = router;

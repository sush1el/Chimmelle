const express = require('express');
const { getHomepage } = require('../controllers/homeController');
const { getShopPage } = require('../controllers/shopController');
const { authenticateUser } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const router = express.Router();

router.get('/', authenticateUser, getHomepage);

router.get('/account', authenticateUser, async (req, res) => {
  try {
      const orders = await Order.find({
          user: req.user._id,
          status: 'confirmed',
          paymentStatus: 'paid'
      })
      .populate({
          path: 'items.product',
          select: 'name imageH price'
      })
      .sort({ createdAt: -1 });

      res.render('account', { 
          user: req.user, 
          orders: orders 
      });
  } catch (error) {
      // Handle error
  }
});

router.get('/cart', authenticateUser, (req, res) => {
  res.render('cart', { user: req.user });
});

router.get('/shop',authenticateUser, getShopPage);
module.exports = router;

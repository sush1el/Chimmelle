const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); 
const { authenticateUser } = require('../middleware/authMiddleware');

router.get('/product-page/:id', authenticateUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.render('product-page', { product, user: req.user });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).send('Error fetching product');
  }
});

module.exports = router;
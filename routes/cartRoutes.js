// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {cartController} = require('../controllers/cartController');
const {authenticateUser} = require('../middleware/authMiddleware');

// Define routes with proper middleware
router.get('/', authenticateUser, cartController.getCart);
router.post('/add', authenticateUser, cartController.addToCart);
router.put('/quantity', authenticateUser, cartController.updateQuantity);
router.put('/toggle-selection', authenticateUser, cartController.toggleSelection);
router.delete('/delete', authenticateUser, cartController.deleteFromCart);

module.exports = router;
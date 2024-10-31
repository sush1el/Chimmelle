// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const {cartController} = require('../controllers/cartController');
const {authenticateUser} = require('../middleware/authMiddleware');

// Define routes with proper middleware
router.get('/', authenticateUser, (req, res) => cartController.getCart(req, res));
router.post('/add', authenticateUser, (req, res) => cartController.addToCart(req, res));
router.put('/quantity', authenticateUser, (req, res) => cartController.updateQuantity(req, res));
router.put('/toggle-selection', authenticateUser, (req, res) => cartController.toggleSelection(req, res));
router.delete('/delete', authenticateUser, cartController.deleteFromCart);

module.exports = router;
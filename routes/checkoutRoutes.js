// routes/checkoutRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AddressController = require('../controllers/addressController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Main checkout page route
router.get('/checkout', authenticateUser, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.redirect('/login');
    }

    // Fetch user data including email and addresses
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.redirect('/login');
    }
    
    res.render('checkout', {
      user: user,
      pageTitle: 'Checkout'
    });
  } catch (error) {
    console.error('Checkout page error:', error);
    res.redirect('/cart');
  }
});

// Address API Endpoints
// Get all addresses
router.get('/api/addresses', authenticateUser, AddressController.getAddresses);

// Add new address
router.post('/api/addresses', authenticateUser, AddressController.addAddress);

// Update existing address
router.put('/api/addresses/:index', authenticateUser, AddressController.updateAddress);

// Delete address
router.delete('/api/addresses/:index', authenticateUser, AddressController.deleteAddress);

// Set default address
router.put('/api/addresses/:index/default', authenticateUser, AddressController.setDefaultAddress);

module.exports = router;
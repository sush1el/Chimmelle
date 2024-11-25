// checkoutRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const AddressController = require('../controllers/addressController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkoutController } = require('../controllers/checkoutController'); // Add this import


// Main checkout page route
router.get('/checkout', authenticateUser, async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login');
    }

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

router.post('/api/create-payment', authenticateUser, async (req, res) => {
  try {
    const { amount, items } = req.body;
    
    // Validate required fields
    if (!amount || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data - amount and items array are required'
      });
    }

    // Validate amount is a positive number
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount specified'
      });
    }

    // Create order with properly formatted items
    const order = await Order.create({
      user: req.user._id,
      items: items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        version: item.version // Now this is just the version string
      })),
      totalAmount: amount,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    });

    if (!order) {
      throw new Error('Failed to create order in database');
    }

    res.json({ 
      success: true, 
      orderId: order._id
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    // Include mongoose validation errors in the response
    const errorMessage = error.name === 'ValidationError' 
      ? Object.values(error.errors).map(err => err.message).join(', ')
      : error.message;
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage || 'Failed to create payment'
    });
  }
});

// Handle payment success
// In checkoutRoutes.js, update the payment-success route:
// In checkoutRoutes.js, update the payment-success route:
router.post('/api/payment-success/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      paymentIntentId, 
      selectedAddressIndex,
      gcashNumber,
      purchasedItems // Array of objects containing productId and version
    } = req.body;

    // Find the order and user
    const order = await Order.findById(orderId);
    const user = await User.findById(req.user._id);

    if (!order || !user) {
      throw new Error('Order or user not found');
    }

    // Check if order is already processed
    if (order.status === 'confirmed' && order.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Order already processed' });
    }

    // Get the selected address from user's addresses
    const selectedAddress = user.addresses[selectedAddressIndex];
    if (!selectedAddress) {
      throw new Error('Selected address not found');
    }

    // Update order details
    order.customerName = {
      firstName: user.firstName,
      lastName: user.lastName
    };
    order.shippingAddress = {
      street: selectedAddress.street,
      barangay: selectedAddress.barangay?.name || selectedAddress.barangay,
      city: selectedAddress.city?.name || selectedAddress.city,
      province: selectedAddress.province?.name || selectedAddress.province,
      region: selectedAddress.region?.name || selectedAddress.region,
      zipCode: selectedAddress.zipCode,
      phone: selectedAddress.phone
    };
    order.gcashNumber = gcashNumber;
    order.shippingStatus = 'preparing';
    order.status = 'confirmed';
    order.paymentStatus = 'paid';
    order.paymentDetails = {
      paymentIntentId: paymentIntentId,
      paymentMethod: 'gcash',
      paidAt: new Date()
    };

    await order.save();

    // Update product stock
    try {
      await checkoutController.updateProductStock(orderId);
    } catch (stockError) {
      console.error('Stock update error:', stockError);
    }

    // Filter out only the purchased items from the cart
    const currentCart = user.cart.items || [];
    const remainingItems = currentCart.filter(cartItem => {
      // Check if this cart item matches any of the purchased items
      // Only remove if both product ID AND version match
      return !purchasedItems.some(purchasedItem => 
        purchasedItem.productId === cartItem.product.toString() && 
        purchasedItem.version === cartItem.version
      );
    });

    // Update user's cart with remaining items
    await User.findByIdAndUpdate(req.user._id, {
      'cart.items': remainingItems
    });

    // Return the count of remaining items
    res.json({ 
      success: true,
      remainingItems: remainingItems.length
    });

  } catch (error) {
    console.error('Payment success handling error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process successful payment: ' + error.message 
    });
  }
});

router.get('/payment-success', authenticateUser, (req, res) => {
  res.render('payment-pages', {
      pageTitle: 'Payment Successful',
      user: req.user
  });
});

router.get('/payment-failed', authenticateUser, (req, res) => {
  res.render('payment-pages', {
      pageTitle: 'Payment Failed',
      user: req.user
  });
});

// Address API Endpoints
router.get('/api/addresses', authenticateUser, AddressController.getAddresses);
router.post('/api/addresses', authenticateUser, AddressController.addAddress);
router.put('/api/addresses/:index', authenticateUser, AddressController.updateAddress);
router.delete('/api/addresses/:index', authenticateUser, AddressController.deleteAddress);
router.put('/api/addresses/:index/default', authenticateUser, AddressController.setDefaultAddress);

module.exports = router;
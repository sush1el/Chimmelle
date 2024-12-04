// checkoutRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const AddressController = require('../controllers/addressController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { checkoutController } = require('../controllers/checkoutController'); // Add this import
const nodemailer = require('nodemailer');

// Configure Nodemailer transporter using Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});


async function sendOrderReceiptEmail(user, order) {
  try {
    // Fetch product details for each item
    const itemsWithDetails = await Promise.all(order.items.map(async (item) => {
      const product = await Product.findById(item.product).select('name');
      return {
        ...item.toObject(), // Convert mongoose document to plain object
        productName: product ? product.name : 'Unknown Product'
      };
    }));

    // Format order items for email
    const itemsHtml = itemsWithDetails.map(item => `
      <tr>
        <td>${item.productName} (${item.version})</td>
        <td>${item.quantity}</td>
        <td>₱ ${item.price.toFixed(2)}</td>
        <td>₱ ${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta name='viewport' content='width=device-width, initial-scale=1'>

    <script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script>
    <title>Order Receipt - Chimelle Shop</title>
    <style>
        body {
            font-family: 'Montserrat';
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff0f5;
        }
        .receipt-container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        h1, h2, h3 {
            color: #da9e9f;
        }
        h1 {
            text-align: center;
            font-size: 28px;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 22px;
            border-bottom: 2px solid #da9e9f;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        h3 {
            font-size: 18px;
            margin-top: 25px;
        }
        p {
            margin-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            border: 1px solid #da9e9f;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color:#da9e9f;
            color: #ffffff;
        }
        .total {
            font-weight: bold;
            font-size: 18px;
            color: #da9e9f;
            font-style: italic ;
            margin-bottom: 40px;
        
        }
        .thank-you {
            text-align: center;
            margin-top: 10px;
            margin-bottom: 10px;
            font-style: italic;
            color:#da9e9f;
        }

     

.social-links {
    display: flex; 
    justify-content: center; 
    align-items: center; 
    gap: 20px; 
}

.social-links a {
    color: #da9e9f;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
}

.social-icon {
    font-size: 24px;
    transition: transform 0.3s ease, color 0.3s ease;
}

.social-icon:hover {
    color: #da9e9f;
    transform: scale(1.2); 
}

    </style>
</head>
<body>

  <div class="receipt-container">
    
        <h1><i class='fas fa-receipt'></i> Order Receipt</h1>
        <p>Thank you for your purchase, ${user.firstName} ${user.lastName}!</p>
        
        <h2>Order Details</h2>
        <p><b>Order ID:</b> ${order._id}</p>
        <p><b>Date:</b> ${new Date().toLocaleString()}</p>

        <h3>Shipping Address</h3>
        <p>
            ${order.shippingAddress.street}, 
            ${order.shippingAddress.barangay}, 
            ${order.shippingAddress.city}, 
            ${order.shippingAddress.province} 
            ${order.shippingAddress.zipCode}
        </p>

        <h3>Order Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <p class="total">Total Amount: ₱ ${order.totalAmount.toFixed(2)}</p>

        <div class = "footer">


        <p class="thank-you"> Thank you for shopping with Chimelle Shop!</p>

        <div class="social-links">
            <a href="https://www.facebook.com/chimelleshop" aria-label="Visit our Facebook page" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-facebook social-icon"></i>
            </a>
            <a href="https://x.com/chimelleshop" aria-label="Visit our Twitter page" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-twitter social-icon"></i>
            </a>
        </div>
    </div>
  </div>
</body>
    `;

    // Send email
    await transporter.sendMail({
      from: '"Chimelle Shop" <noreply@chimelleshop.com>',
      to: user.email,
      subject: `Order Receipt - Order #${order._id}`,
      html: emailHtml
    });

    console.log(`Order receipt email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending order receipt email:', error);
  }
}


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

    // Instead of creating an order, just return a success response
    res.json({ 
      success: true
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process payment request'
    });
  }
});

// Update the payment-success route to create the order
router.post('/api/payment-success/:orderId', authenticateUser, async (req, res) => {
  try {
    const { 
      paymentIntentId, 
      selectedAddressIndex,
      gcashNumber,
      purchasedItems,
      deliveryMethod,
      amount
    } = req.body;

    // Find the user
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new Error('User not found');
    }

    // Get the selected address from user's addresses
    const selectedAddress = user.addresses[selectedAddressIndex];
    if (!selectedAddress) {
      throw new Error('Selected address not found');
    }

    // Check if an order with this payment intent already exists
    const existingOrder = await Order.findOne({
      'paymentDetails.paymentIntentId': paymentIntentId
    });

    if (existingOrder) {
      return res.json({ 
        success: true,
        orderId: existingOrder._id,
        remainingItems: user.cart.items.length,
        alreadyProcessed: true
      });
    }

    // Create order with properly formatted items
    const order = await Order.create({
      user: req.user._id,
      items: purchasedItems.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        version: item.version
      })),
      totalAmount: amount,
      status: 'confirmed',
      paymentStatus: 'paid',
      customerName: {
        firstName: user.firstName,
        lastName: user.lastName
      },
      customerEmail: user.email,
      shippingAddress: {
        street: selectedAddress.street,
        barangay: selectedAddress.barangay?.name || selectedAddress.barangay,
        city: selectedAddress.city?.name || selectedAddress.city,
        province: selectedAddress.province?.name || selectedAddress.province,
        region: selectedAddress.region?.name || selectedAddress.region,
        zipCode: selectedAddress.zipCode,
        phone: selectedAddress.phone
      },
      gcashNumber: gcashNumber,
      deliveryMethod: deliveryMethod,
      shippingStatus: 'preparing',
      paymentDetails: {
        paymentIntentId: paymentIntentId,
        paymentMethod: 'gcash',
        paidAt: new Date()
      }
    });

    // Update product stock
    try {
      await checkoutController.updateProductStock(order._id);
    } catch (stockError) {
      console.error('Stock update error:', stockError);
    }

    // Filter out only the purchased items from the cart
    const currentCart = user.cart.items || [];
    const remainingItems = currentCart.filter(cartItem => {
      // Check if this cart item matches any of the purchased items
      return !purchasedItems.some(purchasedItem => 
        purchasedItem.productId === cartItem.product.toString() && 
        purchasedItem.version === cartItem.version
      );
    });

    // Update user's cart with remaining items
    await User.findByIdAndUpdate(req.user._id, {
      'cart.items': remainingItems
    });

    // Send order receipt email only if this is the first time processing the order
    await sendOrderReceiptEmail(user, order);

    // Return the count of remaining items
    res.json({ 
      success: true,
      orderId: order._id,
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
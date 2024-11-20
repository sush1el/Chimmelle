const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');


const checkoutController = {
  async initiateCheckout(req, res) {
    try {
      // Find the user and populate their cart with selected items
      const user = await User.findById(req.user._id)
        .populate({
          path: 'cart.items.product',
          select: 'name price image' // Only select necessary product details
        });
       
      // Filter only selected items
      const selectedItems = user.cart.itms.filter(item => item.selected);
  
      // Validate that there are selected items
      if (selectedItems.length === 0) {
        return res.status(400).json({ 
          message: 'No items selected for checkout' 
        });
      }

      if (req.headers['content-type'] === 'application/json') {
        return res.json({ redirectUrl: '/checkout' });
      }
  
      // Calculate total price
      const total = selectedItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0);
  
      // Prepare checkout data to pass to the checkout page
      const checkoutData = {
        user: {
          email: user.email,
          addresses: user.addresses
        },
        items: selectedItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          total: item.product.price * item.quantity
        })),
        cartTotal: total
      };
  
      // Render checkout page with prepared data
      res.render('checkout', { 
        checkoutData,
        user: req.user 
      });
    } catch (error) {
      // Error handling
    }
  },
  async updateProductStock(orderId) {
    try {
      // Find the order and populate product details
      const order = await Order.findById(orderId)
        .populate('items.product');

      if (!order) {
        throw new Error('Order not found');
      }

      const updateErrors = [];

      // Update stock for each item in the order
      for (const item of order.items) {
        try {
          const product = await Product.findById(item.product._id);
          
          if (!product) {
            throw new Error(`Product ${item.product._id} not found`);
          }

          // Find the version that matches the order
          const versionIndex = product.versions.findIndex(v => 
            v.version === item.version
          );

          if (versionIndex === -1) {
            throw new Error(`Version ${item.version} not found for product ${product.name}`);
          }

          // Check if enough stock is available
          if (product.versions[versionIndex].quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name} - ${item.version}`);
          }

          // Update the stock
          product.versions[versionIndex].quantity -= item.quantity;
          await product.save();

        } catch (itemError) {
          updateErrors.push({
            productId: item.product._id,
            version: item.version,
            error: itemError.message
          });
        }
      }

      // If any updates failed, throw an error with details
      if (updateErrors.length > 0) {
        // Update order status to indicate stock update failure
        await Order.findByIdAndUpdate(orderId, {
          status: 'stockUpdateFailed',
          stockUpdateErrors: updateErrors
        });
        
        throw new Error(`Failed to update stock for some items: ${JSON.stringify(updateErrors)}`);
      }

      // Update order status to indicate successful stock update
      await Order.findByIdAndUpdate(orderId, {
        status: 'processing',
        stockUpdateStatus: 'completed'
      });

    } catch (error) {
      console.error('Stock update error:', error);
      throw error;
    }
  },
  async processCheckout(req, res) {
    try {
      const { 
        addressId, 
        deliveryOption, 
        paymentMethod 
      } = req.body;

      // Find the user and populate their cart
      const user = await User.findById(req.user._id)
        .populate('cart.items.product');

      // Filter selected items
      const selectedItems = user.cart.items.filter(item => item.selected);

      // Create new order
      const newOrder = new Order({
        user: user._id,
        items: selectedItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: user.addresses.id(addressId),
        deliveryMethod: deliveryOption,
        paymentMethod: paymentMethod,
        totalAmount: selectedItems.reduce((sum, item) => 
          sum + (item.product.price * item.quantity), 0)
      });

      // Save the order
      await newOrder.save();

      // Remove selected items from cart
      user.cart.items = user.cart.items.filter(item => !item.selected);
      await user.save();

      // Redirect to order confirmation or success page
      res.redirect(`/orders/${newOrder._id}`);
    } catch (error) {
      console.error('Checkout processing error:', error);
      res.status(500).json({ 
        message: 'Error processing checkout', 
        error: error.message 
      });
    }
  }
};

module.exports = { checkoutController };
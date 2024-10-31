const User = require('../models/User');
const Product = require('../models/Product');

const cartController = {
  // Get cart contents
  async getCart(req, res) {
    try {
      const user = await User.findById(req.user._id)
        .populate('cart.items.product');
      
      res.json(user.cart);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ message: 'Error retrieving cart', error: error.message });
    }
  },

  // Add item to cart
  async addToCart(req, res) {
    try {
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const user = await User.findById(req.user._id);
      await user.addToCart(productId);
      
      // Fetch updated user with populated cart
      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
      
      res.json({
        message: 'Item added to cart successfully',
        cart: updatedUser.cart
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ message: 'Error adding item to cart', error: error.message });
    }
  },

  // Update item quantity
  async updateQuantity(req, res) {
    try {
      const { productId, quantity } = req.body;
      
      if (!productId || !quantity) {
        return res.status(400).json({ message: 'Product ID and quantity are required' });
      }

      if (quantity < 1) {
        return res.status(400).json({ message: 'Quantity must be at least 1' });
      }

      const user = await User.findById(req.user._id);
      await user.updateCartItemQuantity(productId, quantity);
      
      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
      
      res.json(updatedUser.cart);
    } catch (error) {
      console.error('Update quantity error:', error);
      res.status(500).json({ message: 'Error updating quantity', error: error.message });
    }
  },

  // Toggle item selection
  async toggleSelection(req, res) {
    try {
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      const user = await User.findById(req.user._id);
      await user.toggleCartItemSelection(productId);
      
      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
      
      res.json(updatedUser.cart);
    } catch (error) {
      console.error('Toggle selection error:', error);
      res.status(500).json({ message: 'Error toggling selection', error: error.message });
    }
  },
  async deleteFromCart(req, res) {
    try {
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the item exists in the cart
      const itemIndex = user.cart.items.findIndex(
        item => item.product.toString() === productId.toString()
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }
      
      // Remove the item from the cart
      user.cart.items.splice(itemIndex, 1);
      await user.save();
      
      // Return updated cart with populated products
      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
      
      res.json({
        message: 'Item removed from cart successfully',
        cart: updatedUser.cart
      });
    } catch (error) {
      console.error('Delete from cart error:', error);
      res.status(500).json({ message: 'Error removing item from cart', error: error.message });
    }
  }
};


module.exports = { cartController };
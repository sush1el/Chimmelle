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
        const { productId, version, quantity = 1 } = req.body;  // Extract quantity with default value of 1
        
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // If product has versions, verify the version selection
        if (product.versions && product.versions.length > 0) {
            if (!version) {
                return res.status(400).json({ 
                    message: 'Version selection is required for this product',
                    versions: product.versions
                });
            }

            const selectedVersion = product.versions.find(v => v.version === version);
            if (!selectedVersion) {
                return res.status(400).json({ message: 'Invalid version selected' });
            }

            if (selectedVersion.quantity === 0) {
                return res.status(400).json({ message: 'Selected version is out of stock' });
            }

            // Check if requested quantity is available
            if (quantity > selectedVersion.quantity) {
                return res.status(400).json({ 
                    message: `Only ${selectedVersion.quantity} items available in stock`
                });
            }
        }

        const user = await User.findById(req.user._id);
        await user.addToCart(productId, version, quantity);  // Pass quantity to addToCart
        
        const updatedUser = await User.findById(user._id)
            .populate('cart.items.product');
        
        res.json({
            message: 'Item added to cart successfully',
            cart: updatedUser.cart
        });
        
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ 
            message: 'You must be logged in to add items to cart', 
            error: error.message 
        });
    }
},

  // Update item quantity
  async updateQuantity(req, res) {
    try {
      const { cartItemId, quantity } = req.body;

      const user = await User.findById(req.user._id);
      await user.updateCartItemQuantity(cartItemId, quantity);

      const updatedUser = await User.findById(user._id).populate('cart.items.product');
      res.json({
        message: 'Quantity updated successfully',
        cart: updatedUser.cart
      });
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
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const cartItem = user.cart.items.find(
        item => item.product.toString() === productId.toString()
      );

      if (!cartItem) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }

      cartItem.selected = !cartItem.selected;
      await user.save();
      
      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
      
      res.json({
        message: 'Selection toggled successfully',
        cart: updatedUser.cart
      });
    } catch (error) {
      console.error('Toggle selection error:', error);
      res.status(500).json({ 
        message: 'Error toggling selection', 
        error: error.message 
      });
    }
  },

  async deleteFromCart(req, res) {
    try {
      const cartItemId = req.params.cartItemId; // Get cartItemId from URL params
      
      if (!cartItemId) {
        return res.status(400).json({ message: 'Cart Item ID is required' });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the item exists in the cart
      const itemIndex = user.cart.items.findIndex(
        item => item.cartItemId.toString() === cartItemId.toString()
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
  },
  async changeVersion(req, res) {
    try {
      const { productId, cartItemId, currentVersion, newVersion } = req.body;
      
      if (!productId || !newVersion || !currentVersion) {
        return res.status(400).json({ 
          message: 'Product ID, current version, and new version are required' 
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const cartItem = user.cart.items.find(
        item => item.cartItemId.toString() === cartItemId.toString()
      );

      if (!cartItem) {
        return res.status(404).json({ message: 'Item not found in cart' });
      }

      // Verify the product and version
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const selectedVersion = product.versions.find(v => v.version === newVersion);
      if (!selectedVersion) {
        return res.status(400).json({ message: 'Invalid version selected' });
      }

      if (selectedVersion.quantity === 0) {
        return res.status(400).json({ message: 'Selected version is out of stock' });
      }

      cartItem.version = newVersion;
      await user.save();

      const updatedUser = await User.findById(user._id)
        .populate('cart.items.product');
        
      res.json({
        message: 'Version updated successfully',
        cart: updatedUser.cart
      });
    } catch (error) {
      console.error('Change version error:', error);
      res.status(500).json({ 
        message: 'Error changing version', 
        error: error.message 
      });
    }
  }
};


module.exports = { cartController };
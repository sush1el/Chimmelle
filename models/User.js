const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Updated Cart Item Schema to include version
const CartItemSchema = new mongoose.Schema({
  cartItemId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  selected: { type: Boolean, default: true },
  version: { type: String, required: false } // Added version field
});

// Address Schema remains the same
const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  region: { 
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  province: { 
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  city: { 
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  barangay: { 
    code: { type: String, required: true },
    name: { type: String, required: true }
  },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Schema remains the same
const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  verified: { type: Boolean, default: false },
  addresses: [AddressSchema],
  defaultAddress: { type: mongoose.Schema.Types.ObjectId },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastActive: {
    type: Date,
    default: Date.now
  },
  cart: {
    items: [CartItemSchema],
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Existing middleware remains the same
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.pre('save', function(next) {
  this.lastActive = Date.now();
  
  if (this.isModified('cart.items')) {
    this.cart.updatedAt = Date.now();
  }
  
  next();
});

// Updated cart methods to handle versions
UserSchema.methods.addToCart = async function(productId, version, quantity = 1) {
  const cartItemIndex = this.cart.items.findIndex(item => 
      item.product.toString() === productId && 
      (!version || item.version === version)
  );

  if (cartItemIndex >= 0) {
      // If item exists, update quantity
      this.cart.items[cartItemIndex].quantity += quantity;
  } else {
      // If item doesn't exist, add new item with specified quantity
      this.cart.items.push({
          product: productId,
          version: version,
          quantity: quantity,
          selected: true
      });
  }
  return this.save();
};

UserSchema.methods.updateCartItemQuantity = async function(cartItemId, quantity) {
  const item = this.cart.items.find(item => item.cartItemId.toString() === cartItemId.toString());

  if (item) {
    item.quantity = quantity;
    return this.save();
  }
  throw new Error('Item not found in cart');
};

UserSchema.methods.toggleCartItemSelection = async function(productId, version = null) {
  const item = this.cart.items.find(
    item => item.product.toString() === productId.toString() &&
           item.version === version // Match both product ID and version
  );

  if (item) {
    item.selected = !item.selected;
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

UserSchema.methods.toggleCartItemSelection = async function(productId) {
  const cartItem = this.cart.items.find(
    item => item.product.toString() === productId.toString()
  );
  
  if (!cartItem) {
    throw new Error('Item not found in cart');
  }
  
  cartItem.selected = !cartItem.selected;
  return this.save();
};

// New method to update item version
UserSchema.methods.updateCartItemVersion = async function(cartItemId, newVersion) {
  const item = this.cart.items.find(item => item.cartItemId.toString() === cartItemId.toString());

  if (item) {
    item.version = newVersion;
    return this.save();
  }
  throw new Error('Item not found in cart');
};
const User = mongoose.model('User', UserSchema);
module.exports = User;
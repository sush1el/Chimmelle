const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Cart Item Schema (now embedded in User)
const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  selected: { type: Boolean, default: true }
});

// Address Schema
const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  barangay: { type: String, required: true },
  phone: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Schema
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
  // Embedded cart
  cart: {
    items: [CartItemSchema],
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Update lastActive timestamp
UserSchema.pre('save', function(next) {
  this.lastActive = Date.now();
  
  // Update cart timestamp if cart items were modified
  if (this.isModified('cart.items')) {
    this.cart.updatedAt = Date.now();
  }
  
  next();
});

// Cart helper methods
UserSchema.methods.addToCart = async function(productId) {
  const existingItemIndex = this.cart.items.findIndex(
    item => item.product.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    this.cart.items[existingItemIndex].quantity += 1;
  } else {
    this.cart.items.push({
      product: productId,
      quantity: 1,
      selected: true
    });
  }

  return this.save();
};

UserSchema.methods.updateCartItemQuantity = async function(productId, quantity) {
  const item = this.cart.items.find(
    item => item.product.toString() === productId.toString()
  );

  if (item) {
    item.quantity = quantity;
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

UserSchema.methods.toggleCartItemSelection = async function(productId) {
  const item = this.cart.items.find(
    item => item.product.toString() === productId.toString()
  );

  if (item) {
    item.selected = !item.selected;
    return this.save();
  }
  
  throw new Error('Item not found in cart');
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
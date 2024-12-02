const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// Updated Cart Item Schema to include version
const CartItemSchema = new mongoose.Schema({
  cartItemId: { 
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(), // Automatically generate a unique ID
    required: true  // Make it required
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  selected: { type: Boolean, default: true },
  version: { type: String, required: false }
});

// Add this index to the CartItemSchema
CartItemSchema.index({ cartItemId: 1 }, { 
  unique: true, 
  sparse: true  
});

// Address Schema
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
  cart: {
    items: { 
      type: [CartItemSchema],
      default: () => [] // Use a function to return a new empty array each time
    },
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Middleware for hashing password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Middleware for updating timestamps
UserSchema.pre('save', function(next) {
  this.lastActive = Date.now();
  
  if (this.isModified('cart.items')) {
    this.cart.updatedAt = Date.now();
  }
  
  next();
});

// Methods for managing the cart
UserSchema.methods.addToCart = async function(productId, version, quantity = 1) {
  if (quantity < 1) throw new Error('Quantity must be at least 1');
  
  const itemIndex = this.cart.items.findIndex(
    item => item.product.toString() === productId && (!version || item.version === version)
  );

  if (itemIndex >= 0) {
    this.cart.items[itemIndex].quantity += quantity;
  } else {
    this.cart.items.push({
      cartItemId: new mongoose.Types.ObjectId(),
      product: productId,
      version,
      quantity,
      selected: true
    });
  }
  this.cart.updatedAt = Date.now();
  return this.save();
};

UserSchema.methods.updateCartItemQuantity = async function(cartItemId, quantity) {
  if (quantity < 1) throw new Error('Quantity must be at least 1');
  
  const item = this.cart.items.find(item => item.cartItemId.toString() === cartItemId.toString());
  if (item) {
    item.quantity = quantity;
    this.cart.updatedAt = Date.now();
    return this.save();
  }
  throw new Error('Item not found in cart');
};

UserSchema.methods.toggleCartItemSelection = async function(productId, version = null) {
  const item = this.cart.items.find(
    item => item.product.toString() === productId.toString() &&
           (!version || item.version === version)
  );
  if (!item) throw new Error('Item not found in cart');
  
  item.selected = !item.selected;
  this.cart.updatedAt = Date.now();
  return this.save();
};

UserSchema.methods.updateCartItemVersion = async function(cartItemId, newVersion) {
  const item = this.cart.items.find(item => item.cartItemId.toString() === cartItemId.toString());
  if (item) {
    item.version = newVersion;
    this.cart.updatedAt = Date.now();
    return this.save();
  }
  throw new Error('Item not found in cart');
};

UserSchema.methods.removeCartItem = async function(cartItemId) {
  this.cart.items = this.cart.items.filter(item => item.cartItemId.toString() !== cartItemId.toString());
  this.cart.updatedAt = Date.now();
  return this.save();
};

// Model Export
const User = mongoose.model('User', UserSchema);
module.exports = User;

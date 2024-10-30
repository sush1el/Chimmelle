const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Address Schema
const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  barangay: { type: String, required: true }, 
  city: { type: String, required: true },
  zipCode: { type: String, required: true }, 
  country: { type: String, required: true },
  phone: { type: String, required: true }, 
});

// Cart Item Schema
const CartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
});

// User Schema
const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  verified: { type: Boolean, default: false },
  addresses: [AddressSchema],
  defaultAddress: { type: mongoose.Schema.Types.ObjectId }, // Reference to the default address
  cart: [CartItemSchema], 
  lastActive: {
      type: Date,
      default: Date.now
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
  next();
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
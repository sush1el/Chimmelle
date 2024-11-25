const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: Number,
    price: Number,
    version: String
  }],
  customerName: {
    firstName: String,
    lastName: String
  },
  shippingAddress: {
    street: String,
    barangay: String,
    city: String,
    province: String,
    region: String,
    zipCode: String,
    phone: String
  },
  gcashNumber: {
    type: String,
    required: function() {
      // Only require gcashNumber when order is being confirmed
      return this.status === 'confirmed';
    }
  },
  shippingStatus: {
    type: String,
    enum: ['preparing', 'shipped', 'delivered'],
    default: 'preparing'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentDetails: {
    paymentIntentId: String,
    paymentMethod: String,
    paidAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
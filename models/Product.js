const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, required: true },
  artist: { type: String, required: true },
  availability: { type: String, required: true },
  description: { type: Array, required: true }, // Now an array
  inclusions: { type: Array, required: true },
  imageH: { type: String, required: true },
  versions: [
    {
      version: { type: String, required: true },
      quantity: { type: Number, required: true },
      image: { type: Array, required: true },
    },
  ],
  // New fields for homepage customization
  homepageSection: {
    type: String,
    enum: ['new arrivals', 'best sellers', 'trending', 'featured', null], // Allow these categories or none
    default: null, // Default to no specific section
  },
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;

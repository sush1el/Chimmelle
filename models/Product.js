const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  type: { type: String, required: true },
  artist: { type: String, required: true },
  description: { type: Array, required: true },  // Now an array
  inclusions: { type: Array, required: true },
  imageH: { type: String, required: true },
  versions: [
    {
      version: { type: String, required: true },
      quantity: { type: Number, required: true },
      image: { type: Array, required: true }
    }
  ]
});

const Product = mongoose.model('Product', ProductSchema);

module.exports = Product;

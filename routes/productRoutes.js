const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); 
const { authenticateUser } = require('../middleware/authMiddleware');

router.get('/product-page/:id', authenticateUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.render('product-page', { product, user: req.user });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).send('Error fetching product');
  }
});

router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.q.trim();
    
    // If search query is empty, redirect to shop or return empty results
    if (!searchQuery) {
      return res.render('search-results', { 
        products: [], 
        searchQuery: '',
        user: req.user 
      });
    }

    // Search across multiple fields with case-insensitive partial matching
    const products = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { artist: { $regex: searchQuery, $options: 'i' } },
        { type: { $regex: searchQuery, $options: 'i' } }
      ]
    });

    // If no products found, render search results with empty array
    res.render('search-results', { 
      products, 
      searchQuery,
      user: req.user 
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).render('error', { 
      message: 'An error occurred during search', 
      user: req.user 
    });
  }
});

router.get('/api/search', async (req, res) => {
  try {
      const searchQuery = req.query.q.trim();
      
      // If search query is too short, return empty array
      if (searchQuery.length < 2) {
          return res.json([]);
      }

      // Search across multiple fields with case-insensitive partial matching
      const products = await Product.find({
          $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { artist: { $regex: searchQuery, $options: 'i' } },
              { type: { $regex: searchQuery, $options: 'i' } }
          ]
      }).limit(5); // Limit to 5 results for dropdown

      res.json(products);
  } catch (err) {
      console.error('Search API error:', err);
      res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
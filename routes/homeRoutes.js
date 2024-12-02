const express = require('express');
const { getHomepage } = require('../controllers/homeController');
const { getShopPage } = require('../controllers/shopController');
const { authenticateUser } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const router = express.Router();

router.get('/', authenticateUser, getHomepage);

router.get('/account', authenticateUser, async (req, res) => {
  try {
      const orders = await Order.find({
          user: req.user._id,
          status: 'confirmed',
          paymentStatus: 'paid'
      })
      .populate({
          path: 'items.product',
          select: 'name imageH price'
      })
      .sort({ createdAt: -1 });

      res.render('account', { 
          user: req.user, 
          orders: orders 
      });
  } catch (error) {
      // Handle error
  }
});

router.get('/cart', authenticateUser, (req, res) => {
  res.render('cart', { user: req.user });
});

router.get('/artists', authenticateUser, async (req, res) => {
  try {
      // Fetch unique artists from Products, sorted alphabetically
      const artists = await Product.distinct('artist').sort();
      res.render('artists', { 
          user: req.user, 
          artists: artists 
      });
  } catch (error) {
      console.error('Error fetching artists:', error);
      res.status(500).send('Error loading artists page');
  }
});

router.get('/shop-artist', authenticateUser, async (req, res) => {
  try {
    const { artist } = req.query;

    if (!artist) {
      return res.status(400).send('Artist parameter is required');
    }

    // Fetch products for the specific artist
    const products = await Product.find({ artist: artist });

    // Fetch unique product types for this artist
    const types = await Product.distinct('type', { artist: artist });

    // Count products by type and availability
    const typeCounts = await Product.aggregate([
      { $match: { artist: artist } },
      { 
        $group: { 
          _id: '$type', 
          count: { $sum: 1 },
          onHandCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'on-hand'] }, 1, 0] } 
          },
          preorderCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'pre-order'] }, 1, 0] } 
          }
        } 
      }
    ]);

    // Calculate price range
    const priceStats = await Product.aggregate([
      { $match: { artist: artist } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('shop-artist', { 
      user: req.user, 
      artist: artist,
      products: products,
      types: types,
      typeCounts: typeCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 }
    });
  } catch (error) {
    console.error('Error fetching shop artist page:', error);
    res.status(500).send('Error loading shop artist page');
  }
});

router.get('/albums', authenticateUser, async (req, res) => {
  try {
    // Fetch all products that are albums
    const products = await Product.find({ type: { $regex: /album/i } });

    // Fetch unique artists with albums
    const artists = await Product.distinct('artist', { type: { $regex: /album/i } }).sort();

    // Count albums by artist and availability
    const artistCounts = await Product.aggregate([
      { $match: { type: { $regex: /album/i } } },
      { 
        $group: { 
          _id: '$artist', 
          count: { $sum: 1 },
          onHandCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'on-hand'] }, 1, 0] } 
          },
          preorderCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'pre-order'] }, 1, 0] } 
          }
        } 
      }
    ]);

    // Calculate price range for albums
    const priceStats = await Product.aggregate([
      { $match: { type: { $regex: /album/i } } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('albums', { 
      user: req.user, 
      products: products,
      artists: artists,
      artistCounts: artistCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      pageTitle: 'Albums'
    });
  } catch (error) {
    console.error('Error fetching albums page:', error);
    res.status(500).send('Error loading albums page');
  }
});

router.get('/preorder', authenticateUser, async (req, res) => {
  try {
    // Fetch all products that are pre-order
    const products = await Product.find({ availability: 'pre-order' });

    // Fetch unique artists with pre-order items
    const artists = await Product.distinct('artist', { availability: 'pre-order' }).sort();

    // Count pre-order items by artist
    const artistCounts = await Product.aggregate([
      { $match: { availability: 'pre-order' } },
      { 
        $group: { 
          _id: '$artist', 
          count: { $sum: 1 },
          onHandCount: { $sum: 0 },  // Use $sum: 0 instead of a static number
          preorderCount: { $sum: 1 }
        } 
      }
    ]);

    // Calculate price range for pre-order items
    const priceStats = await Product.aggregate([
      { $match: { availability: 'pre-order' } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('albums', { 
      user: req.user, 
      products: products,
      artists: artists,
      artistCounts: artistCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      pageTitle: 'Pre-order'
    });
  } catch (error) {
    console.error('Error fetching pre-order page:', error);
    res.status(500).send(`Error loading pre-order page: ${error.message}`);
  }
});

router.get('/onhand', authenticateUser, async (req, res) => {
  try {
    // Fetch all products that are on-hand
    const products = await Product.find({ availability: 'on-hand' });

    // Fetch unique artists with on-hand items
    const artists = await Product.distinct('artist', { availability: 'on-hand' }).sort();

    // Count on-hand items by artist
    const artistCounts = await Product.aggregate([
      { $match: { availability: 'on-hand' } },
      { 
        $group: { 
          _id: '$artist', 
          count: { $sum: 1 },
          onHandCount: { $sum: 1 },
          preorderCount: { $sum: 0 }  // Use $sum: 0 instead of a static number
        } 
      }
    ]);

    // Calculate price range for on-hand items
    const priceStats = await Product.aggregate([
      { $match: { availability: 'on-hand' } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('albums', { 
      user: req.user, 
      products: products,
      artists: artists,
      artistCounts: artistCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      pageTitle: 'On Hand'
    });
  } catch (error) {
    console.error('Error fetching on-hand page:', error);
    res.status(500).send(`Error loading on-hand page: ${error.message}`);
  }
});

router.get('/lightsticks', authenticateUser, async (req, res) => {
  try {
    // Fetch all products that are lightsticks
    const products = await Product.find({ type: { $regex: /lightstick/i } });

    // Fetch unique artists with lightsticks
    const artists = await Product.distinct('artist', { type: { $regex: /lightstick/i } }).sort();

    // Count lightsticks by artist and availability
    const artistCounts = await Product.aggregate([
      { $match: { type: { $regex: /lightstick/i } } },
      { 
        $group: { 
          _id: '$artist', 
          count: { $sum: 1 },
          onHandCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'on-hand'] }, 1, 0] } 
          },
          preorderCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'pre-order'] }, 1, 0] } 
          }
        } 
      }
    ]);

    // Calculate price range for lightsticks
    const priceStats = await Product.aggregate([
      { $match: { type: { $regex: /lightstick/i } } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('albums', { 
      user: req.user, 
      products: products,
      artists: artists,
      artistCounts: artistCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      pageTitle: 'Lightsticks'
    });
  } catch (error) {
    console.error('Error fetching lightsticks page:', error);
    res.status(500).send('Error loading lightsticks page');
  }
});

router.get('/merchandise', authenticateUser, async (req, res) => {
  try {
    // Fetch all products that are merchandise
    const products = await Product.find({ type: { $regex: /merchandise/i } });

    // Fetch unique artists with merchandise
    const artists = await Product.distinct('artist', { type: { $regex: /merchandise/i } }).sort();

    // Count merchandise by artist and availability
    const artistCounts = await Product.aggregate([
      { $match: { type: { $regex: /merchandise/i } } },
      { 
        $group: { 
          _id: '$artist', 
          count: { $sum: 1 },
          onHandCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'on-hand'] }, 1, 0] } 
          },
          preorderCount: { 
            $sum: { $cond: [{ $eq: ['$availability', 'pre-order'] }, 1, 0] } 
          }
        } 
      }
    ]);

    // Calculate price range for merchandise
    const priceStats = await Product.aggregate([
      { $match: { type: { $regex: /merchandise/i } } },
      { 
        $group: { 
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        } 
      }
    ]);

    res.render('albums', { 
      user: req.user, 
      products: products,
      artists: artists,
      artistCounts: artistCounts,
      totalProducts: products.length,
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      pageTitle: 'Merchandise'
    });
  } catch (error) {
    console.error('Error fetching merchandise page:', error);
    res.status(500).send('Error loading merchandise page');
  }
});

router.get('/shop',authenticateUser, getShopPage);

module.exports = router;

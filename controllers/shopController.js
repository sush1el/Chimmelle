const Product = require('../models/Product');

exports.getShopPage = async (req, res) => {
  try {
      // Get filter parameters from query string
      const { availability, type, minPrice, maxPrice, artist } = req.query; // Changed 'category' to 'type'
      const sort = req.query.sort || 'name_asc';
      
      // Build base filter object (exclude deleted products)
      let filters = { isDeleted: false };
      
      // Add availability filter
      if (availability) {
          const availabilityArray = Array.isArray(availability) ? availability : [availability];
          filters.availability = { $in: availabilityArray };
      }
      
      // Add type filter (previously category)
      if (type) {
          const typeArray = Array.isArray(type) ? type : [type];
          filters.type = { $in: typeArray };
      }
      
      // Add price range filter
      if (minPrice || maxPrice) {
          filters.price = {};
          if (minPrice) filters.price.$gte = Number(minPrice);
          if (maxPrice) filters.price.$lte = Number(maxPrice);
      }
      
      // Add artist filter
      if (artist) {
          const artistArray = Array.isArray(artist) ? artist : [artist];
          filters.artist = { $in: artistArray };
      }

      // Build sort object
      let sortOption = {};
      switch (sort) {
          case 'name_desc':
              sortOption = { name: -1 };
              break;
          case 'price_asc':
              sortOption = { price: 1 };
              break;
          case 'price_desc':
              sortOption = { price: -1 };
              break;
          default: // name_asc
              sortOption = { name: 1 };
      }
      
      // Get all unique types and their counts
      const typeCounts = await Product.aggregate([
          { $match: { ...filters } }, // Apply filters including isDeleted: false
          { $group: {
              _id: '$type',
              count: { $sum: 1 }
          }},
          { $sort: { _id: 1 } }
      ]);

      // Get products with filters and sorting
      const products = await Product.find(filters).sort(sortOption);
      
      // Get counts for each filter option
      const counts = {
          availability: {
              'on-hand': await Product.countDocuments({ ...filters, availability: 'on-hand' }),
              'pre-order': await Product.countDocuments({ ...filters, availability: 'pre-order' })
          },
          types: typeCounts, // Changed from category to types
          artists: await Product.aggregate([
              { $match: { ...filters } }, // Apply filters including isDeleted: false
              { $group: {
                  _id: '$artist',
                  count: { $sum: 1 }
              }},
              { $sort: { _id: 1 } }
          ])
      };

      res.render('shop', { 
          products,
          counts,
          filters: req.query,
          user: req.user,
          currentSort: sort
      });
  } catch (error) {
      console.error('Error loading shop page:', error);
      res.status(500).send('Server error while loading shop page');
  }
};

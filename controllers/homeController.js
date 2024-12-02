const Product = require('../models/Product');

exports.getHomepage = async (req, res) => {
    try {
        const newArrivals = await Product.find({ homepageSection: 'new arrivals' }).limit(10);
        const bestSellers = await Product.find({ homepageSection: 'best sellers' }).limit(10);
        const trending = await Product.find({ homepageSection: 'trending' }).limit(10);
        const featuredProducts = await Product.find({ homepageSection: 'featured' }).limit(10);

        const products = await Product.find({});
    
        res.render('homepage', { products, newArrivals, bestSellers, trending, featuredProducts, user: req.user });

    } catch (error) {
        console.error('Error loading homepage:', error);    
        res.status(500).send('Server error while loading homepage');
    }
};

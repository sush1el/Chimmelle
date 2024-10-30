const Product = require('../models/Product');

exports.getHomepage = async (req, res) => {
    try {
        const products = await Product.find();
        res.render('homepage', { products, user: req.user }); 
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.status(500).send('Server error while loading homepage');
    }
};

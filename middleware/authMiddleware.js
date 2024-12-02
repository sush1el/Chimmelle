const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticateUser = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.user = null; // Explicitly set req.user to null if no token
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password'); // Attach user data to req if token is valid
    } catch (err) {
        console.error('Token verification failed:', err);
        req.user = null; // Invalidate req.user if token verification fails
    }   

    next(); // Continue even if req.user is null
};

// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.requireAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/login-page');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Extra check: token must be an admin token and not expired
        if (!decoded.isAdmin || decoded.exp < Date.now() / 1000) {
            res.clearCookie('token');
            return res.redirect('/login-page');
        }

        // Fetch admin details
        const admin = await Admin.findById(decoded.userId);
        if (!admin) {
            res.clearCookie('token');
            return res.redirect('/login-page');
        }

        // Attach admin info to request
        req.admin = admin;
        next();

    } catch (error) {
        console.error('Admin authentication error:', error);
        res.clearCookie('token');
        res.redirect('/login-page');
    }
};
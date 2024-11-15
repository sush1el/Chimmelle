// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.requireAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/login?error=Please log in as admin');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's an admin token
        if (!decoded.isAdmin) {
            return res.redirect('/?error=Unauthorized access');
        }

        // Fetch admin details
        const admin = await Admin.findById(decoded.userId);
        if (!admin) {
            res.clearCookie('token');
            return res.redirect('/login?error=Admin account not found');
        }

        // Attach admin info to request
        req.admin = admin;
        next();

    } catch (error) {
        console.error('Admin authentication error:', error);
        res.clearCookie('token');
        res.redirect('/login?error=Authentication failed');
    }
};
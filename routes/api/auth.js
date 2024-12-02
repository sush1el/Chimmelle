// auth.js
const express = require('express');
const { 
    register, 
    adminLogin, // Changed from login to adminLogin
    verifyUser, 
    forgotPassword, 
    resetPassword, 
    checkVerification,
} = require('../../controllers/authController');
const router = express.Router();

// API routes
router.post('/register', register);
router.post('/login', adminLogin); // Changed to use adminLogin handler
router.get('/logout', (req, res) => {
    // Clear the authentication token
    res.clearCookie('token');
    
    // Set cache control headers to prevent caching of authenticated pages
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    res.redirect('/');
});
router.get('/verify/:userId/:uniqueString', verifyUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/check-verification/:userId', checkVerification);

module.exports = router;
// adminRoutes.js
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { createAdmin } = require('../controllers/authController');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/resources/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

// Admin dashboard route
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        const admin = req.admin;
        
        // Initialize admins as an empty array by default
        let admins = [];
        
        // Only fetch admin list if the current user is a super_admin
        if (admin.role === 'super_admin') {
            admins = await Admin.find({}, '-password');
        }
        
        res.render('adminDash', {
            admin: {
                _id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            products: products,
            admins: admins, // Pass the admins array to the template
            title: 'Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { 
            message: 'Error loading admin dashboard'
        });
    }
});

// Add product form route
router.get('/add-product', requireAdmin, async (req, res) => {
    try {
        const admin = req.admin;
        res.render('addProduct', {
            admin: {
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            title: 'Add Product'
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).render('error', { 
            message: 'Error loading add product form'
        });
    }
});

// Handle product creation
router.post('/add-product', requireAdmin, upload.any(), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        
        // Process main image
        const mainImage = req.files.find(file => file.fieldname === 'imageH');
        if (!mainImage) {
            throw new Error('Main image is required');
        }
        productData.imageH = '/resources/' + mainImage.filename;

        // Process version images
        productData.versions = productData.versions.map((version, index) => {
            // Find all images for this version
            const versionImages = req.files
                .filter(file => file.fieldname === `versionImages_${index}`)
                .map(file => '/resources/' + file.filename);
            
            if (versionImages.length === 0) {
                throw new Error(`Images are required for version ${index + 1}`);
            }
            
            return {
                ...version,
                image: versionImages
            };
        });

        const product = new Product(productData);
        await product.save();

        res.json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding product'
        });
    }
});
// Get product for editing
router.get('/edit-product/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('error', { 
                message: 'Product not found'
            });
        }
        res.render('editProduct', { product });
    } catch (error) {
        res.status(500).render('error', { 
            message: 'Error loading product'
        });
    }
});

// Update product
router.put('/edit-product/:id', requireAdmin, upload.fields([
    { name: 'imageH', maxCount: 1 },
    { name: 'versionImages', maxCount: 10 }
]), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        const oldProduct = await Product.findById(req.params.id);

        // Handle main image update
        if (req.files['imageH']) {
            // Delete old image
            if (oldProduct.imageH) {
                await fs.unlink('public' + oldProduct.imageH).catch(err => console.error('Error deleting old image:', err));
            }
            productData.imageH = '/resources/' + req.files['imageH'][0].filename;
        }

        // Handle version images update
        if (req.files['versionImages']) {
            productData.versions = productData.versions.map((version, index) => {
                const versionImages = req.files['versionImages']
                    .filter(img => img.fieldname === `versions[${index}][image]`)
                    .map(img => '/resources/' + img.filename);
                
                // Delete old version images
                if (oldProduct.versions[index]) {
                    oldProduct.versions[index].image.forEach(async (img) => {
                        await fs.unlink('public' + img).catch(err => console.error('Error deleting old version image:', err));
                    });
                }
                
                return {
                    ...version,
                    image: versionImages
                };
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true }
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product'
        });
    }
});

// Delete product
router.delete('/delete-product/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        // Delete main image
        if (product.imageH) {
            await fs.unlink('public' + product.imageH).catch(err => console.error('Error deleting main image:', err));
        }

        // Delete version images
        for (const version of product.versions) {
            for (const img of version.image) {
                await fs.unlink('public' + img).catch(err => console.error('Error deleting version image:', err));
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting product'
        });
    }
});
// Get product for editing
router.get('/edit-product/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('error', { 
                message: 'Product not found'
            });
        }
        res.render('editProduct', { product });
    } catch (error) {
        res.status(500).render('error', { 
            message: 'Error loading product'
        });
    }
});

// Update product
router.put('/edit-product/:id', requireAdmin, upload.fields([
    { name: 'imageH', maxCount: 1 },
    { name: 'versionImages', maxCount: 10 }
]), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        const oldProduct = await Product.findById(req.params.id);

        // Handle main image update
        if (req.files['imageH']) {
            // Delete old image
            if (oldProduct.imageH) {
                await fs.unlink('public' + oldProduct.imageH).catch(err => console.error('Error deleting old image:', err));
            }
            productData.imageH = '/resources/' + req.files['imageH'][0].filename;
        }

        // Handle version images update
        if (req.files['versionImages']) {
            productData.versions = productData.versions.map((version, index) => {
                const versionImages = req.files['versionImages']
                    .filter(img => img.fieldname === `versions[${index}][image]`)
                    .map(img => '/resources/' + img.filename);
                
                // Delete old version images
                if (oldProduct.versions[index]) {
                    oldProduct.versions[index].image.forEach(async (img) => {
                        await fs.unlink('public' + img).catch(err => console.error('Error deleting old version image:', err));
                    });
                }
                
                return {
                    ...version,
                    image: versionImages
                };
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true }
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product'
        });
    }
});

router.post('/create-admin', requireAdmin, async (req, res) => {
    try {
      await createAdmin(req, res);
    } catch (error) {
      console.error('Create admin route error:', error);
      res.status(500).json({ msg: 'Server error in create admin route' });
    }
  });
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        const admin = req.admin;
        
        let admins = [];
        if (admin.role === 'super_admin') {
            admins = await Admin.find({}, '-password');
        }
        
        res.render('adminDash', {
            admin: {
                _id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            products: products,
            admins: admins,
            title: 'Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { 
            message: 'Error loading admin dashboard'
        });
    }
});

// Delete admin (only accessible by super_admin)
router.delete('/delete-admin/:id', requireAdmin, async (req, res) => {
    try {
        // Check if the requester is a super_admin
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super administrators can delete admin accounts'
            });
        }

        // Prevent super_admin from deleting their own account
        if (req.admin._id.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Find and delete the admin
        const adminToDelete = await Admin.findById(req.params.id);
        if (!adminToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Administrator not found'
            });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Administrator account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting administrator account'
        });
    }
});

module.exports = router;
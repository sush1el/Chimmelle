const User = require('../models/User');

class AddressController {
    // Validate address data
    static validateAddress(address) {
        const requiredFields = ['street', 'city', 'zipCode', 'country', 'barangay', 'phone'];
        const missingFields = requiredFields.filter(field => !address[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        if (address.zipCode.length < 3 || address.zipCode.length > 10) {
            throw new Error('Invalid zip code format');
        }
    }

    static async addAddress(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Address data is required'
                });
            }

            this.validateAddress(req.body);

            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const MAX_ADDRESSES = 10;
            if (user.addresses.length >= MAX_ADDRESSES) {
                return res.status(400).json({
                    success: false,
                    error: `Maximum number of addresses (${MAX_ADDRESSES}) reached`
                });
            }

            const newAddress = {
                ...req.body,
                isDefault: user.addresses.length === 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            user.addresses.push(newAddress);
            await user.save();

            res.status(201).json({
                success: true,
                message: 'Address added successfully',
                address: newAddress
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    static async updateAddress(req, res) {
        try {
            if (!req.body || Object.keys(req.body).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Address data is required'
                });
            }

            this.validateAddress(req.body);

            const index = parseInt(req.params.index);
            if (isNaN(index)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid address index'
                });
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (index < 0 || index >= user.addresses.length) {
                return res.status(404).json({
                    success: false,
                    error: 'Address not found'
                });
            }

            const updatedAddress = {
                ...req.body,
                isDefault: user.addresses[index].isDefault,
                createdAt: user.addresses[index].createdAt,
                updatedAt: new Date()
            };

            user.addresses[index] = updatedAddress;
            await user.save();

            res.json({
                success: true,
                message: 'Address updated successfully',
                address: updatedAddress
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    static async deleteAddress(req, res) {
        try {
            const index = parseInt(req.params.index);
            if (isNaN(index)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid address index'
                });
            }

            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (index < 0 || index >= user.addresses.length) {
                return res.status(404).json({
                    success: false,
                    error: 'Address not found'
                });
            }

            if (user.addresses[index].isDefault && user.addresses.length > 1) {
                const newDefaultIndex = index === 0 ? 1 : 0;
                user.addresses[newDefaultIndex].isDefault = true;
            }

            user.addresses.splice(index, 1);
            await user.save();

            res.json({
                success: true,
                message: 'Address deleted successfully'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    static async getAddresses(req, res) {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                addresses: user.addresses
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    static async setDefaultAddress(req, res) {
        try {
            const index = parseInt(req.params.index);
            if (isNaN(index)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid address index'
                });
            }
    
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
    
            if (index < 0 || index >= user.addresses.length) {
                return res.status(404).json({
                    success: false,
                    error: 'Address not found'
                });
            }
    
            // Set the defaultAddress to the selected address's _id
            user.defaultAddress = user.addresses[index]._id;
            await user.save();
    
            res.json({
                success: true,
                message: 'Default address updated successfully',
                address: user.addresses[index]
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = AddressController;
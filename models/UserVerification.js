const mongoose = require('mongoose');

const UserVerificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uniqueString: {
        type: String,
        required: true
    },
    createdAt: { 
        type: Date,
        default: Date.now,
        required: true
    },
    expiresAt: { 
        type: Date,
        required: true
    }
});

const UserVerification = mongoose.model('UserVerification', UserVerificationSchema);

module.exports = UserVerification;
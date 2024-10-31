const User = require("../models/User");
const UserVerification = require('../models/UserVerification');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// Email transporter setup
let transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: process.env.MAILTRAP_PORT,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.log('Transporter error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
  if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
  if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
  if (!hasNumbers) errors.push('Password must contain at least one number');
  if (!hasSpecialChar) errors.push('Password must contain at least one special character');

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Send verification email
const sendVerificationEmail = async (user, res) => {
  try {
    const currentUrl = 'http://localhost:5000';
    const uniqueString = uuidv4() + user._id;
    const hashedUniqueString = await bcrypt.hash(uniqueString, 10);
    
    console.log('Verification Details:', {
      userId: user._id,
      email: user.email,
      uniqueStringLength: uniqueString.length,
      hashedStringLength: hashedUniqueString.length
    });

    // Delete any existing verification records for this user
    await UserVerification.deleteOne({ userId: user._id });

    const newVerification = new UserVerification({
      userId: user._id,
      uniqueString: hashedUniqueString,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000) // 1 hour expiry
    });

    const savedVerification = await newVerification.save();
    console.log('Saved verification record:', savedVerification);

    const verificationUrl = `${currentUrl}/api/auth/verify/${user._id}/${uniqueString}`;
    console.log('Verification URL:', verificationUrl);

    const mailOptions = {
      from: process.env.MAILTRAP_USER,
      to: user.email,
      subject: 'Verify Your Email',
      html: `
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your account:</p>
        <a href="${verificationUrl}">Verify Account</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    throw error;
  }
};

// Register user
exports.register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        msg: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
      verified: false
    });

    const savedUser = await user.save();
    await sendVerificationEmail(savedUser, res);
    res.status(201).json({ 
      msg: 'Registration successful! Please check your email to verify your account.',
      userId: savedUser._id
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ msg: 'Server error during registration' });
  }
};

// Verify user
exports.verifyUser = async (req, res) => {
  try {
    const { userId, uniqueString } = req.params;
    console.log('Verification attempt:', { userId, uniqueStringLength: uniqueString?.length });

    if (!userId || !uniqueString) {
      throw new Error('Missing verification parameters');
    }

    const [user, verificationRecord] = await Promise.all([
      User.findById(userId),
      UserVerification.findOne({ userId })
    ]);

    console.log('Found records:', {
      userFound: !!user,
      verificationFound: !!verificationRecord,
      verified: user?.verified,
      expiryTime: verificationRecord?.expiresAt
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!verificationRecord) {
      throw new Error('Verification record not found');
    }

    if (new Date() > new Date(verificationRecord.expiresAt)) {
      await Promise.all([
        UserVerification.deleteOne({ userId }),
        User.deleteOne({ _id: userId })
      ]);
      return res.redirect('/verified?error=true&message=Verification link has expired. Please sign up again.');
    }

    const isValid = await bcrypt.compare(uniqueString, verificationRecord.uniqueString);
    console.log('String verification:', { isValid });

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    const [updatedUser] = await Promise.all([
      User.findByIdAndUpdate(
        userId, 
        { verified: true }, 
        { new: true }
      ),
      UserVerification.deleteOne({ userId })
    ]);

    console.log('Updated user:', {
      id: updatedUser._id,
      verified: updatedUser.verified
    });

    if (!updatedUser.verified) {
      throw new Error('Failed to update user verification status');
    }

    return res.redirect('/verified?success=true');

  } catch (error) {
    console.error('Verification error:', error);
    return res.redirect(`/verified?error=true&message=${encodeURIComponent(error.message)}`);
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(401).json({ 
        msg: 'Email not verified. Please check your email for verification link.',
        needsVerification: true 
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error during login' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: 'No account found with that email' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save hashed token to user
    user.resetPasswordToken = await bcrypt.hash(resetToken, 10);
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `http://localhost:5000/reset-password/${resetToken}`;

    // Send email
    const mailOptions = {
      from: process.env.MAILTRAP_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ msg: 'Password reset email sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ msg: 'Error sending password reset email' });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(400).json({ msg: 'Invalid reset token' });
    }

    if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ msg: 'Reset token has expired' });
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        msg: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Update password and clear reset token
    user.password = password; // Password will be hashed by pre-save middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password successfully reset' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Error resetting password' });
  }
};

exports.getResetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token before rendering the page
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.resetPasswordToken) {
      return res.redirect('/forgot-password?error=Invalid or expired reset link');
    }

    if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
      return res.redirect('/forgot-password?error=Reset link has expired');
    }

    // If token is valid, render the reset password page with the token
    res.render('reset-password', { 
      token,
      error: req.query.error,
      success: req.query.success
    });

  } catch (error) {
    console.error('Get reset password page error:', error);
    res.redirect('/forgot-password?error=Invalid reset link');
  }
};

// Update the existing resetPassword method
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ msg: 'Invalid reset token' });
    }

    if (!user.resetPasswordExpires || Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ msg: 'Reset token has expired' });
    }

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        msg: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Update password and clear reset token
    user.password = password; // Password will be hashed by pre-save middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password successfully reset' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ msg: 'Error resetting password' });
  }
};
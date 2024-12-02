const User = require("../models/User");
const Admin = require("../models/Admin");
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
      from: 'Chimelle Shop <noreply@chimelleshop.com',
      to: user.email,
      subject: 'Verify Your Email',
      html: `
        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta name='viewport' content='width=device-width, initial-scale=1'>

    <script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script>
  
    <title>Password Reset - Chimelle Shop</title>
         <style>

        body {
            font-family: 'Montserrat';
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fafafa;
        }

        .email-container {
            background-color: white;
            padding: 40px;
            width: 450px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: solid 2px #da9e9f;
        }

        .logo img {
            width: 100px;
            height: auto;
            margin-bottom: 10px;
        }

        h1 {
            color: #da9e9f;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
        }

        p {
            margin-bottom: 20px;
            color: #666;
            text-align: justify;
            line-height: 1.5;
        }

        .button {
            display: inline-block;
            background-color:#da9e9f;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            text-align: center;
            margin: 20px 0;
            width: 100%;
            max-width: 200px;
        }

        .button:hover {
            background-color: #c47e7f
        }

        .button-container {
            text-align: center;
            margin: 30px 0;
        }

        .footer p {
            text-align: center !important;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #da9e9f;
        }

        .social-links {
    margin: 20px 0;
    text-align: center !important;
}

.social-links a {
    margin: 0 10px;
    color: #da9e9f;
    text-decoration: none;
}

.social-icon {
    font-size: 24px;
    transition: transform 0.3s ease, color 0.3s ease;
}

.social-icon:hover {
    color: #da9e9f;
    transform: scale(1.2); /* Enlarges the logo */
}

.button-container i {
margin-right: 10px;
}


        @media (max-width: 480px) {
            body {
                padding: 10px;
            }

            .email-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <h1>Email Verification</h1>

        <p>You're receiving this message because you registered an account with Chimelle Shop. Please click the button below to verify your email address and activate your</p>

        <div class="button-container">
            <a href="${verificationUrl}" class="button"><i class="fa-solid fa-envelope"></i>Verify Email</a>
        </div>

        <p>This verification link will expire in 1 hour. If you did not create an account with us, please ignore this email or contact our support team if you have concerns.</p>

        <p>For security reasons, we recommend verifying your email promptly to secure your account.</p>

        <div class="footer">
            <p>Best regards,<br>The Chimelle Shop Team</p>
            
            <div class="social-links">
                <a href="https://www.facebook.com/chimelleshop" aria-label="Visit our Facebook page" target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-facebook social-icon"></i>
                </a>
                <a href="https://x.com/chimelleshop" aria-label="Visit our Twitter page" target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-twitter social-icon"></i>
                </a>
            </div>
        </div>
    </div>
</body>
</html>
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
      return res.redirect('/verified?error=true&message=Missing verification parameters');
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
      return res.redirect('/verified?error=true&message=User not found');
    }

    if (!verificationRecord) {
      return res.redirect('/verified?error=true&message=Verification record not found');
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
      return res.redirect('/verified?error=true&message=Invalid verification code');
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
      return res.redirect('/verified?error=true&message=Failed to update user verification status');
    }

    return res.redirect('/verified?success=true');

  } catch (error) {
    console.error('Verification error:', error);
    return res.redirect('/verified?error=true&message=Verification failed');
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
      from: 'Chimelle Shop <noreply@chimelleshop.com>',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta name='viewport' content='width=device-width, initial-scale=1'>

    <script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script>
  
    <title>Password Reset - Chimelle Shop</title>
         <style>

        body {
            font-family: 'Montserrat';
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fafafa;
        }

        .email-container {
            background-color: white;
            padding: 40px;
            width: 450px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: solid 2px #da9e9f;
        }

        .logo img {
            width: 100px;
            height: auto;
            margin-bottom: 10px;
        }

        h1 {
            color: #da9e9f;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
        }

        p {
            margin-bottom: 20px;
            color: #666;
            text-align: justify;
            line-height: 1.5;
        }

        .button {
            display: inline-block;
            background-color:#da9e9f;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            text-align: center;
            margin: 20px 0;
            width: 100%;
            max-width: 200px;
        }

        .button:hover {
            background-color: #c47e7f
        }

        .button-container {
            text-align: center;
            margin: 30px 0;
        }

        .footer p {
            text-align: center !important;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #da9e9f;
        }

        .social-links {
    margin: 20px 0;
    text-align: center !important;
}

.social-links a {
    margin: 0 10px;
    color: #da9e9f;
    text-decoration: none;
}

.social-icon {
    font-size: 24px;
    transition: transform 0.3s ease, color 0.3s ease;
}

.social-icon:hover {
    color: #da9e9f;
    transform: scale(1.2); /* Enlarges the logo */
}

.button-container i {
margin-right: 10px;
}


        @media (max-width: 480px) {
            body {
                padding: 10px;
            }

            .email-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>

        <div class="button-container">
            <a href="${resetUrl}" class="button"><i class="fa-solid fa-envelope"></i>Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>

    
        <div class="footer">
            <p>Best regards,<br>The Chimelle Shop Team</p>
            
            <div class="social-links">
                <a href="https://www.facebook.com/chimelleshop" aria-label="Visit our Facebook page" target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-facebook social-icon"></i>
                </a>
                <a href="https://x.com/chimelleshop" aria-label="Visit our Twitter page" target="_blank" rel="noopener noreferrer">
                    <i class="fa-brands fa-twitter social-icon"></i>
                </a>
            </div>
        </div>
    </div>
</body>
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

exports.checkVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ verified: false });
    }
    
    return res.json({ verified: user.verified });
  } catch (error) {
    console.error('Check verification error:', error);
    return res.status(500).json({ verified: false });
  }
};

// authController.js - Add this new admin login function
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // First check if it's an admin account
    let admin = await Admin.findOne({ email }).select('+password');
    
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Create admin token with role
      const token = jwt.sign(
        { 
          userId: admin._id,
          role: admin.role,
          isAdmin: true 
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ 
        success: true,
        isAdmin: true
      });
    }

    // If not an admin, proceed with regular user login
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

    const token = jwt.sign(
      { 
        userId: user._id,
        role: 'user',
        isAdmin: false
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ 
      success: true,
      isAdmin: false 
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ msg: 'Server error during login' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
      const { username, email, password } = req.body;

      // Check if requester is a super admin
      if (req.admin.role !== 'super_admin') {
          return res.status(403).json({ 
              success: false, 
              msg: 'Only super administrators can create admin accounts' 
          });
      }

            // Check if admin with the email already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
          return res.status(400).json({ 
              success: false, 
              msg: 'An admin account with this email already exists' 
          });
      }

      // Check if the email is already used by a regular user
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ 
              success: false, 
              msg: 'This email is already registered by a user' 
          });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new admin
      const newAdmin = new Admin({
          username,
          email,
          password: hashedPassword,
          role: 'admin'  // Default to regular admin, can be changed later if needed
      });

      await newAdmin.save();

      res.json({ 
          success: true, 
          msg: 'Admin account created successfully' 
      });
  } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ 
          success: false, 
          msg: 'Server error in creating admin account' 
      });
  }
}


const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens, generateAccessToken } = require('../utils/generateTokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

class AuthService {
  async register(userData) {
    const { name, email, password, contactNumber, designation } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
    
    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create user
    const user = new User({
      name,
      email,
      password,
      contactNumber,
      designation,
      emailVerificationToken,
      emailVerificationExpires
    });
    
    await user.save();
    
    // Send verification email
    await sendVerificationEmail(email, name, emailVerificationToken);
    
    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user._id
    };
  }
  
  async login(email, password) {
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }
    
    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }
    
    if (!user.isActive) {
      throw new Error('Your account has been deactivated');
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user._id);
    
    // Remove password from response
    user.password = undefined;
    
    return {
      user,
      accessToken,
      refreshToken
    };
  }
  
  async refreshToken(refreshToken) {
    const tokenDoc = await RefreshToken.findOne({ 
      token: refreshToken, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!tokenDoc) {
      throw new Error('Invalid or expired refresh token');
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(tokenDoc.userId);
    
    return { accessToken };
  }
  
  async logout(refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
    return { message: 'Logout successful' };
  }
  
  async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw new Error('Invalid or expired verification token');
    }
    
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    return { message: 'Email verified successfully' };
  }
  
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('User not found with this email');
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();
    
    // Send reset email
    await sendPasswordResetEmail(email, user.name, resetToken);
    
    return { message: 'Password reset email sent' };
  }
  
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }
    
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Invalidate all refresh tokens
    await RefreshToken.deleteMany({ userId: user._id });
    
    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
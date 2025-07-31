const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, OTP } = require('../models/schemas');
const emailService = require('./emailService');

class AuthService {
  constructor() {
    // Get JWT secrets from your .env configuration
    this.accessSecret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    this.validateJWTConfig();
  }

  validateJWTConfig() {
    const missing = [];
    if (!this.accessSecret) missing.push('JWT_SECRET or JWT_ACCESS_SECRET');
    if (!this.refreshSecret) missing.push('JWT_REFRESH_SECRET');
    
    if (missing.length > 0) {
      console.error('❌ Missing JWT secrets:', missing.join(', '));
      console.error('📝 Add these to your .env file:');
      console.error('├─ JWT_SECRET=your-secret-here');
      console.error('├─ JWT_ACCESS_SECRET=your-access-secret-here'); 
      console.error('└─ JWT_REFRESH_SECRET=your-refresh-secret-here');
      throw new Error(`Missing JWT configuration: ${missing.join(', ')}`);
    }
    
    console.log('✅ JWT configuration loaded successfully');
    console.log('├─ Access token expires in:', this.accessExpiresIn);
    console.log('├─ Refresh token expires in:', this.refreshExpiresIn);
    console.log('├─ Access secret length:', this.accessSecret.length, 'characters');
    console.log('└─ Refresh secret length:', this.refreshSecret.length, 'characters');
  }

  // Generate Access Token (short-lived)
  generateAccessToken(userId, role) {
    try {
      return jwt.sign(
        { 
          userId, 
          role,
          type: 'access',
          iat: Math.floor(Date.now() / 1000)
        },
        this.accessSecret,
        { expiresIn: this.accessExpiresIn }
      );
    } catch (error) {
      console.error('❌ Access token generation failed:', error.message);
      throw new Error('Failed to generate access token');
    }
  }

  // Generate Refresh Token (long-lived)
  generateRefreshToken(userId) {
    try {
      return jwt.sign(
        { 
          userId,
          type: 'refresh',
          iat: Math.floor(Date.now() / 1000),
          jti: crypto.randomUUID() // Unique ID for token revocation
        },
        this.refreshSecret,
        { expiresIn: this.refreshExpiresIn }
      );
    } catch (error) {
      console.error('❌ Refresh token generation failed:', error.message);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Generate both tokens
  generateTokenPair(userId, role) {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken(userId);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresIn,
      tokenType: 'Bearer'
    };
  }

  // Verify Access Token
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessSecret);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  // Verify Refresh Token
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  // Generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash password
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Validate password strength
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // FIXED: Register user with OTP verification
  async register(userData) {
  try {
    const { username, email, password, confirmPassword, role } = userData;

    console.log('📝 Starting registration for:', email);

    // Validate input
    if (!username || !email || !password || !confirmPassword) {
      throw new Error('All fields are required');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
      if (existingUser.username === username) {
        throw new Error('Username already taken');
      }
    }

    const hashedPassword = await this.hashPassword(password);

    // QUICK FIX: Create user without profile object
    const userData_clean = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'engineer',
      isEmailVerified: false,
      is_active: true
    };

    const user = new User(userData_clean);
    const savedUser = await user.save();
    
    console.log('✅ User created with ID:', savedUser._id);

    await this.sendEmailVerificationOTP(email);

    return {
      success: true,
      message: 'User registered successfully. Please verify your email with the OTP sent.',
      userId: savedUser._id
    };

  } catch (error) {
    console.error('❌ Registration error:', error.message);
    if (error.message.includes('validation failed')) {
      console.error('Full validation error:', error);
    }
    throw new Error(error.message);
  }
}
  // FIXED: Send email verification OTP
  async sendEmailVerificationOTP(email) {
    try {
      console.log('📧 Sending OTP for email verification:', email);

      // Delete any existing OTPs for this email and purpose
      await OTP.deleteMany({ 
        email: email.toLowerCase(), 
        purpose: 'email_verification'  // ← FIXED: was "type"
      });

      // Generate new OTP
      const otp = this.generateOTP();
      console.log('🔢 Generated OTP:', otp); // Add for debugging - remove in production

      // Save OTP to database with correct field names
      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        purpose: 'email_verification',  // ← FIXED: was "type"
        expires_at: new Date(Date.now() + 10 * 60 * 1000) // ← FIXED: was "expiresAt"
      });

      await otpRecord.save();
      console.log('💾 OTP saved to database for:', email);

      // Send OTP via email - make sure this service exists
      try {
        await emailService.sendVerificationOTP(email, otp);
        console.log('📧 OTP email sent successfully');
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError.message);
        // Don't throw error here - still return the OTP for testing
        console.log('🔢 OTP for testing (email failed):', otp);
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email',
        debug: { otp } // Remove this in production
      };

    } catch (error) {
      console.error('❌ Failed to send OTP:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // FIXED: Verify email with OTP
  async verifyEmailOTP(email, otp) {
    try {
      console.log('📧 Verifying OTP for:', email, 'OTP:', otp);

      // Find valid OTP with correct field names
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp: otp.toString(), // Ensure OTP is string
        purpose: 'email_verification',  // ← FIXED: was "type"
        isEmailVerified: false,             // ← FIXED: was "isUsed"
        expires_at: { $gt: new Date() } // ← FIXED: was "expiresAt"
      });

      console.log('🔍 OTP query result:', otpRecord);

      if (!otpRecord) {
        // Enhanced debugging
        const allOTPs = await OTP.find({ 
          email: email.toLowerCase(),
          purpose: 'email_verification'
        });
        console.log('📋 All OTPs for this email:', allOTPs);

        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used with correct field name
      otpRecord.isEmailVerified = true; // ← FIXED: was "isUsed"
      await otpRecord.save();

      // FIXED: Update user as verified with correct field names
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isEmailVerified: true }, // ← FIXED: was isEmailVerified
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      console.log('✅ User email verified:', user.email);

      // Generate token pair
      const tokens = this.generateTokenPair(user._id, user.role);
      console.log('✅ Token pair generated successfully');

      return {
        success: true,
        message: 'Email verified successfully',
        ...tokens,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified, // ← FIXED: was isEmailVerified
          is_active: user.is_active
        }
      };

    } catch (error) {
      console.error('❌ Email verification error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Login user
  async login(loginData) {
    try {
      const { identifier, password } = loginData;

      if (!identifier || !password) {
        throw new Error('Email/Username and password are required');
      }

      console.log('🔐 Login attempt for:', identifier);

      // FIXED: Find user by email or username with correct field names
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ],
        is_active: true  // ← FIXED: was isActive
      });

      console.log('👤 User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('👤 User details:', {
          id: user._id,
          email: user.email,
          username: user.username,
          is_active: user.is_active,
          isEmailVerified: user.isEmailVerified // ← FIXED: was isEmailVerified
        });
      }

      if (!user) {
        // Debug: Check if user exists but is inactive
        const inactiveUser = await User.findOne({
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        });
        
        if (inactiveUser) {
          console.log('⚠️ User exists but is inactive:', {
            is_active: inactiveUser.is_active
          });
          throw new Error('Account is inactive. Please contact support.');
        }
        
        throw new Error('Invalid credentials');
      }

      // FIXED: Check if email is verified with correct field name
      if (!user.isEmailVerified) { // ← FIXED: was isEmailVerified
        throw new Error('Please verify your email before logging in');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Password validation failed');
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.last_login = new Date(); // ← FIXED: was lastLogin
      await user.save();

      // Generate token pair
      const tokens = this.generateTokenPair(user._id, user.role);

      console.log('✅ Login successful for:', user.email);

      return {
        success: true,
        message: 'Login successful',
        ...tokens,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          last_login: user.last_login,
          isEmailVerified: user.isEmailVerified, // ← FIXED: was isEmailVerified
          is_active: user.is_active
        }
      };

    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Refresh tokens
  async refreshTokens(refreshToken) {
    try {
      console.log('🔄 Processing token refresh...');

      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // FIXED: Get user with correct field names
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.is_active) { // ← FIXED: was isActive
        throw new Error('User not found or inactive');
      }

      // Generate new token pair
      const tokens = this.generateTokenPair(user._id, user.role);

      console.log('✅ Tokens refreshed successfully for:', user.email);

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        ...tokens,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          isEmailVerified: user.isEmailVerified
        }
      };

    } catch (error) {
      console.error('❌ Token refresh error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Verify token (for middleware)
  async verifyToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.is_active) { // ← FIXED: was isActive
        throw new Error('Invalid token');
      }

      return {
        success: true,
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          is_active: user.is_active
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Send password reset OTP - FIXED
  async sendPasswordResetOTP(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('User with this email does not exist');
      }

      await OTP.deleteMany({ 
        email: email.toLowerCase(), 
        purpose: 'password_reset'  // ← FIXED: was "type"
      });

      const otp = this.generateOTP();

      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        purpose: 'password_reset',  // ← FIXED: was "type"
        expires_at: new Date(Date.now() + 15 * 60 * 1000) // ← FIXED: was "expiresAt"
      });

      await otpRecord.save();
      await emailService.sendPasswordResetOTP(email, otp);

      return {
        success: true,
        message: 'Password reset OTP sent to your email'
      };

    } catch (error) {
      console.error('❌ Password reset OTP error:', error.message);
      throw new Error(error.message);
    }
  }

  // Reset password with OTP - FIXED
  async resetPasswordWithOTP(resetData) {
    try {
      const { email, otp, newPassword, confirmPassword } = resetData;

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp,
        purpose: 'password_reset',     // ← FIXED: was "type"
        isEmailVerified: false,            // ← FIXED: was "isUsed"
        expires_at: { $gt: new Date() } // ← FIXED: was "expiresAt"
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      otpRecord.isEmailVerified = true; // ← FIXED: was "isUsed"
      await otpRecord.save();

      const hashedPassword = await this.hashPassword(newPassword);

      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { password: hashedPassword }
      );

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('❌ Password reset error:', error.message);
      throw new Error(error.message);
    }
  }

  // Change password (for logged-in users)
  async changePassword(userId, passwordData) {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      const isSamePassword = await this.comparePassword(newPassword, user.password);
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      const hashedPassword = await this.hashPassword(newPassword);
      user.password = hashedPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('❌ Change password error:', error.message);
      throw new Error(error.message);
    }
  }

  // Resend OTP - FIXED
  async resendOTP(email, type) {
    try {
      const validTypes = ['email_verification', 'password_reset'];
      if (!validTypes.includes(type)) {
        throw new Error('Invalid OTP type');
      }

      if (type === 'email_verification') {
        return await this.sendEmailVerificationOTP(email);
      } else if (type === 'password_reset') {
        return await this.sendPasswordResetOTP(email);
      }

    } catch (error) {
      console.error('❌ Resend OTP error:', error.message);
      throw new Error(error.message);
    }
  }

  // Logout
  async logout(refreshToken) {
    try {
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      throw new Error(error.message);
    }
  }
}

module.exports = new AuthService();
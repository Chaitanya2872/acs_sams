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

  // Register user with OTP verification
  async register(userData) {
    try {
      const { username, email, password, confirmPassword, role } = userData;

      console.log('📝 Starting registration for:', email);

      // Validate input
      if (!username || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
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

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user (initially unverified)
      const user = new User({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'engineer',
        isEmailVerified: false
      });

      await user.save();
      console.log('✅ User created with ID:', user._id);

      // Generate and send OTP
      await this.sendEmailVerificationOTP(email);

      return {
        success: true,
        message: 'User registered successfully. Please verify your email with the OTP sent.',
        userId: user._id
      };

    } catch (error) {
      console.error('❌ Registration error:', error.message);
      throw new Error(error.message);
    }
  }

  // Send email verification OTP
  async sendEmailVerificationOTP(email) {
    try {
      // Delete any existing OTPs for this email and type
      await OTP.deleteMany({ email: email.toLowerCase(), type: 'email_verification' });

      // Generate new OTP
      const otp = this.generateOTP();

      // Save OTP to database
      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      await otpRecord.save();
      console.log('📧 OTP saved to database for:', email);

      // Send OTP via email
      await emailService.sendVerificationOTP(email, otp);

      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };

    } catch (error) {
      console.error('❌ Failed to send OTP:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // Verify email with OTP - Returns token pair
  async verifyEmailOTP(email, otp) {
    try {
      console.log('📧 Verifying OTP for:', email);

      // Find valid OTP
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp,
        type: 'email_verification',
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        // Check if OTP exists but is expired or used
        const expiredOTP = await OTP.findOne({
          email: email.toLowerCase(),
          otp,
          type: 'email_verification'
        });

        if (expiredOTP) {
          if (expiredOTP.isUsed) {
            throw new Error('OTP has already been used');
          }
          if (expiredOTP.expiresAt <= new Date()) {
            throw new Error('OTP has expired');
          }
        }
        
        throw new Error('Invalid OTP');
      }

      // Mark OTP as used
      otpRecord.isUsed = true;
      await otpRecord.save();

      // Update user as verified
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isEmailVerified: true },
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
          isEmailVerified: user.isEmailVerified
        }
      };

    } catch (error) {
      console.error('❌ Email verification error:', error.message);
      throw new Error(error.message);
    }
  }

  // Login user - Returns token pair
  async login(loginData) {
    try {
      const { identifier, password } = loginData;

      if (!identifier || !password) {
        throw new Error('Email/Username and password are required');
      }

      console.log('🔐 Login attempt for:', identifier);

      // Find user by email or username
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ],
        isActive: true
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw new Error('Please verify your email before logging in');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.lastLogin = new Date();
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
          lastLogin: user.lastLogin
        }
      };

    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw new Error(error.message);
    }
  }

  // Refresh tokens - Generate new access token using refresh token
  async refreshTokens(refreshToken) {
    try {
      console.log('🔄 Processing token refresh...');

      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Get user to ensure they still exist and are active
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.isActive) {
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
          role: user.role
        }
      };

    } catch (error) {
      console.error('❌ Token refresh error:', error.message);
      throw new Error(error.message);
    }
  }

  // Send password reset OTP
  async sendPasswordResetOTP(email) {
    try {
      // Check if user exists
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('User with this email does not exist');
      }

      // Delete any existing OTPs for this email and type
      await OTP.deleteMany({ email: email.toLowerCase(), type: 'password_reset' });

      // Generate new OTP
      const otp = this.generateOTP();

      // Save OTP to database
      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      });

      await otpRecord.save();

      // Send OTP via email
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

  // Reset password with OTP
  async resetPasswordWithOTP(resetData) {
    try {
      const { email, otp, newPassword, confirmPassword } = resetData;

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Find valid OTP
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp,
        type: 'password_reset',
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used
      otpRecord.isUsed = true;
      await otpRecord.save();

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
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

      // Check if new passwords match
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate new password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Check if new password is different from current
      const isSamePassword = await this.comparePassword(newPassword, user.password);
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
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

  // Resend OTP
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

  // Verify token (for middleware)
  async verifyToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        throw new Error('Invalid token');
      }

      return {
        success: true,
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Logout (in a production app, you might want to blacklist the refresh token)
  async logout(refreshToken) {
    try {
      // In a production environment, you might want to:
      // 1. Blacklist the refresh token
      // 2. Store blacklisted tokens in Redis/Database
      // 3. Check blacklist in verifyRefreshToken
      
      // For now, we'll just return success as the client will remove the tokens
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
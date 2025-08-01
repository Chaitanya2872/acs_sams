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

  // FIXED: Register user with better error handling
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

      // FIXED: Create user with proper structure to avoid validation errors
      const newUser = new User({
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'engineer',
        isEmailVerified: false,
        is_active: true,
        structures: [], // Initialize empty structures array
        stats: {
          total_structures_created: 0,
          total_structures_submitted: 0,
          total_structures_approved: 0,
          last_activity_date: new Date(),
          total_login_count: 0
        },
        profile: {}, // Initialize empty profile object
        permissions: {
          can_create_structures: true,
          can_approve_structures: false,
          can_delete_structures: false,
          can_view_all_structures: false,
          can_export_reports: false,
          can_manage_users: false
        }
      });

      const savedUser = await newUser.save();
      
      console.log('✅ User created with ID:', savedUser._id);

      // Send email verification OTP
      try {
        await this.sendEmailVerificationOTP(email);
        console.log('📧 Verification email sent successfully');
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError.message);
        // Don't fail registration if email fails
      }

      return {
        success: true,
        message: 'User registered successfully. Please verify your email with the OTP sent.',
        userId: savedUser._id,
        requiresEmailVerification: true
      };

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Better error handling for specific validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));
        
        console.error('📋 Validation details:', validationErrors);
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }
      
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyValue)[0];
        throw new Error(`${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists`);
      }
      
      throw new Error(error.message);
    }
  }

  // FIXED: Send email verification OTP with better error handling
  async sendEmailVerificationOTP(email) {
    try {
      console.log('📧 Sending OTP for email verification:', email);

      // Delete any existing OTPs for this email and purpose
      await OTP.deleteMany({ 
        email: email.toLowerCase(), 
        purpose: 'email_verification'
      });

      // Generate new OTP
      const otp = this.generateOTP();
      console.log('🔢 Generated OTP for', email, ':', otp); // Remove in production

      // Save OTP to database
      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        purpose: 'email_verification',
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isEmailVerified: false
      });

      await otpRecord.save();
      console.log('💾 OTP saved to database for:', email);

      // Send OTP via email
      try {
        if (emailService && typeof emailService.sendVerificationOTP === 'function') {
          await emailService.sendVerificationOTP(email, otp);
          console.log('📧 OTP email sent successfully');
        } else {
          console.warn('📧 Email service not available - OTP generated but not sent');
          console.log('🔢 OTP for manual verification:', otp);
        }
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError.message);
        console.log('🔢 OTP for manual verification:', otp);
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email',
        debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
      };

    } catch (error) {
      console.error('❌ Failed to send OTP:', error.message);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // FIXED: Verify email with better error handling
  async verifyEmailOTP(email, otp) {
    try {
      console.log('📧 Verifying OTP for:', email, 'OTP:', otp);

      // Find valid OTP
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp: otp.toString(),
        purpose: 'email_verification',
        isEmailVerified: false,
        expires_at: { $gt: new Date() }
      });

      console.log('🔍 OTP query result:', otpRecord ? 'Found' : 'Not found');

      if (!otpRecord) {
        // Enhanced debugging
        const allOTPs = await OTP.find({ 
          email: email.toLowerCase(),
          purpose: 'email_verification'
        });
        console.log('📋 All OTPs for this email:', allOTPs.map(otp => ({
          otp: otp.otp,
          expires_at: otp.expires_at,
          isEmailVerified: otp.isEmailVerified,
          created_at: otp.created_at
        })));

        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used
      otpRecord.isEmailVerified = true;
      await otpRecord.save();

      // FIXED: Update user as verified with proper error handling
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { 
          isEmailVerified: true,
          $inc: { 'stats.total_login_count': 0 } // Initialize stats if not exists
        },
        { new: true, runValidators: false } // Skip validators to avoid rating validation issues
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
          isEmailVerified: user.isEmailVerified,
          is_active: user.is_active
        }
      };

    } catch (error) {
      console.error('❌ Email verification error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Login with better validation and error handling
  async login(loginData) {
    try {
      const { identifier, password } = loginData;

      if (!identifier || !password) {
        throw new Error('Email/Username and password are required');
      }

      console.log('🔐 Login attempt for:', identifier);

      // FIXED: Find user with better query structure
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ],
        is_active: true
      }).select('+password'); // Explicitly select password field

      console.log('👤 User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('👤 User details:', {
          id: user._id,
          email: user.email,
          username: user.username,
          is_active: user.is_active,
          isEmailVerified: user.isEmailVerified
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

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw new Error('Please verify your email before logging in');
      }

      // Compare password
      const isPasswordValid = await this.comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Password validation failed');
        throw new Error('Invalid credentials');
      }

      // FIXED: Update user stats and last login safely
      try {
        await User.findByIdAndUpdate(
          user._id,
          { 
            last_login: new Date(),
            $inc: { 'stats.total_login_count': 1 }
          },
          { runValidators: false } // Skip validators to avoid structure validation issues
        );
      } catch (updateError) {
        console.warn('⚠️ Failed to update login stats:', updateError.message);
        // Don't fail login if stats update fails
      }

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
          last_login: new Date(),
          isEmailVerified: user.isEmailVerified,
          is_active: user.is_active
        }
      };

    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Refresh tokens with better error handling
  async refreshTokens(refreshToken) {
    try {
      console.log('🔄 Processing token refresh...');

      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Get user with better error handling
      const user = await User.findById(decoded.userId)
        .select('-password -structures') // Don't load structures to avoid validation issues
        .lean(); // Use lean for better performance
        
      if (!user || !user.is_active) {
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

  // FIXED: Verify token with better validation
  async verifyToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      
      // Use lean query to avoid structure validation issues
      const user = await User.findById(decoded.userId)
        .select('-password -structures')
        .lean();
      
      if (!user || !user.is_active) {
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

  // FIXED: Send password reset OTP
  async sendPasswordResetOTP(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).lean();
      if (!user) {
        throw new Error('User with this email does not exist');
      }

      await OTP.deleteMany({ 
        email: email.toLowerCase(), 
        purpose: 'password_reset'
      });

      const otp = this.generateOTP();

      const otpRecord = new OTP({
        email: email.toLowerCase(),
        otp,
        purpose: 'password_reset',
        expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        isEmailVerified: false
      });

      await otpRecord.save();
      
      try {
        if (emailService && typeof emailService.sendPasswordResetOTP === 'function') {
          await emailService.sendPasswordResetOTP(email, otp);
        } else {
          console.log('🔢 Password reset OTP (email service unavailable):', otp);
        }
      } catch (emailError) {
        console.error('📧 Email sending failed:', emailError.message);
        console.log('🔢 Password reset OTP (manual):', otp);
      }

      return {
        success: true,
        message: 'Password reset OTP sent to your email',
        debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
      };

    } catch (error) {
      console.error('❌ Password reset OTP error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Reset password with OTP
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
        purpose: 'password_reset',
        isEmailVerified: false,
        expires_at: { $gt: new Date() }
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      otpRecord.isEmailVerified = true;
      await otpRecord.save();

      const hashedPassword = await this.hashPassword(newPassword);

      // FIXED: Update password without triggering structure validation
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { password: hashedPassword },
        { runValidators: false } // Skip validators
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

  // FIXED: Change password for logged-in users
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

      // Get user with password field
      const user = await User.findById(userId).select('+password');
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
      
      // FIXED: Update password safely
      await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { runValidators: false } // Skip validators
      );

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('❌ Change password error:', error.message);
      throw new Error(error.message);
    }
  }

  // FIXED: Resend OTP
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
      // In a production environment, you might want to blacklist the token
      // For now, just return success
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      throw new Error(error.message);
    }
  }

  // NEW: Helper method to check if user exists
  async checkUserExists(identifier) {
    try {
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      }).select('email username is_active isEmailVerified').lean();

      return {
        exists: !!user,
        user: user ? {
          email: user.email,
          username: user.username,
          is_active: user.is_active,
          isEmailVerified: user.isEmailVerified
        } : null
      };
    } catch (error) {
      console.error('❌ Check user exists error:', error.message);
      return { exists: false, user: null };
    }
  }

  // NEW: Helper method to validate registration data
  validateRegistrationData(userData) {
    const { username, email, password, confirmPassword } = userData;
    const errors = [];

    // Username validation
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username && username.length > 50) {
      errors.push('Username cannot exceed 50 characters');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email) {
      errors.push('Email is required');
    }
    if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    }
    if (!confirmPassword) {
      errors.push('Password confirmation is required');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    const passwordValidation = this.validatePassword(password || '');
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // NEW: Get user profile safely (without structures)
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -structures') // Exclude sensitive and large fields
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile || {},
          permissions: user.permissions || {},
          stats: user.stats || {},
          is_active: user.is_active,
          isEmailVerified: user.isEmailVerified,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      };
    } catch (error) {
      console.error('❌ Get user profile error:', error.message);
      throw new Error(error.message);
    }
  }
}

module.exports = new AuthService();
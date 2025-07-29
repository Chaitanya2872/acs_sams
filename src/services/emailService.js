const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  // Initialize email service using your .env variables
  async initializeTransporter() {
    try {
      console.log('📧 Initializing email service...');
      
      // Get email configuration from your .env file
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      const emailService = process.env.EMAIL_SERVICE || 'gmail';
      
      // Check if email credentials exist
      if (!emailUser || !emailPass) {
        console.warn('⚠️  Email credentials not found in .env file');
        console.warn('📧 EMAIL_USER or EMAIL_PASS is missing');
        this.isConfigured = false;
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailUser)) {
        console.warn('⚠️  Invalid email format in EMAIL_USER');
        this.isConfigured = false;
        return;
      }

      console.log(`📧 Email User: ${emailUser}`);
      console.log(`🔑 Email Service: ${emailService}`);
      console.log(`🔐 Password Length: ${emailPass.length} characters`);

      // Configure transporter for Gmail (based on your EMAIL_SERVICE=gmail)
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Using service instead of manual SMTP for simplicity
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Alternative manual configuration (if service doesn't work)
      // this.transporter = nodemailer.createTransporter({
      //   host: 'smtp.gmail.com',
      //   port: 587,
      //   secure: false,
      //   auth: {
      //     user: emailUser,
      //     pass: emailPass
      //   },
      //   tls: {
      //     rejectUnauthorized: false
      //   }
      // });

      // Test the connection
      await this.testConnection();
      
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isConfigured = false;
      
      // Provide specific help for common errors
      if (error.code === 'EAUTH') {
        console.log('\n🔧 Email Authentication Help:');
        console.log('1. Your Gmail App Password might be incorrect');
        console.log('2. Make sure 2FA is enabled on your Google account');
        console.log('3. Generate a new App Password: https://myaccount.google.com/apppasswords');
        console.log('4. Your current password has', process.env.EMAIL_PASS?.length || 0, 'characters (should be 16)');
        console.log('5. Update EMAIL_PASS in your .env file with the new App Password');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNECTION') {
        console.log('\n🔧 Connection Help:');
        console.log('1. Check your internet connection');
        console.log('2. Make sure Gmail SMTP is not blocked by your firewall');
      }
    }
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service connected successfully!');
      console.log(`📧 Ready to send emails from: ${process.env.EMAIL_USER}`);
    } catch (error) {
      console.error('❌ Email connection test failed:', error.message);
      throw error;
    }
  }

  // Send verification OTP
  async sendVerificationOTP(email, otp) {
    try {
      if (!this.isConfigured) {
        console.log('📧 Email service not configured, using console output:');
        console.log(`🔐 OTP for ${email}: ${otp}`);
        return {
          success: true,
          message: 'OTP logged to console (email service not configured)',
          messageId: `console_${Date.now()}`
        };
      }

      const mailOptions = {
        from: `"SAMS Verification" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'SAMS - Email Verification OTP',
        html: this.getVerificationEmailHTML(otp)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification OTP sent to ${email}`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        message: 'Verification OTP sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send verification OTP:', error.message);
      
      // Fallback to console logging
      console.log('📧 Fallback - OTP for console:');
      console.log(`🔐 Email: ${email}`);
      console.log(`🔐 OTP: ${otp}`);
      
      return {
        success: true,
        messageId: `fallback_${Date.now()}`,
        message: 'OTP sent (fallback mode - check console)'
      };
    }
  }

  // Send password reset OTP
  async sendPasswordResetOTP(email, otp) {
    try {
      if (!this.isConfigured) {
        console.log('📧 Email service not configured, using console output:');
        console.log(`🔐 Password Reset OTP for ${email}: ${otp}`);
        return {
          success: true,
          message: 'Password reset OTP logged to console',
          messageId: `console_${Date.now()}`
        };
      }

      const mailOptions = {
        from: `"SAMS Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'SAMS - Password Reset OTP',
        html: this.getPasswordResetEmailHTML(otp)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset OTP sent to ${email}`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        message: 'Password reset OTP sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send password reset OTP:', error.message);
      
      // Fallback to console logging
      console.log('📧 Fallback - Password Reset OTP for console:');
      console.log(`🔐 Email: ${email}`);
      console.log(`🔐 OTP: ${otp}`);
      
      return {
        success: true,
        messageId: `fallback_${Date.now()}`,
        message: 'Password reset OTP sent (fallback mode - check console)'
      };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, username, role) {
    try {
      if (!this.isConfigured) {
        console.log(`📧 Welcome email would be sent to ${email} for user ${username} with role ${role}`);
        return {
          success: true,
          message: 'Welcome email logged (email service not configured)'
        };
      }

      const mailOptions = {
        from: `"SAMS Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to SAMS, ${username}!`,
        html: this.getWelcomeEmailHTML(username, role)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}`);

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get verification email HTML template
  getVerificationEmailHTML(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SAMS Email Verification</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
          .container { background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2c5aa0; }
          .logo { color: #2c5aa0; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .otp-box { background: linear-gradient(135deg, #2c5aa0, #4a90a4); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
          .content { font-size: 16px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SAMS</div>
            <div class="subtitle">Structure Asset Maintenance Management System</div>
          </div>
          
          <div class="content">
            <h2>Welcome to SAMS!</h2>
            <p>Thank you for registering with SAMS. To complete your account verification, please use the OTP below:</p>
          </div>
          
          <div class="otp-box">
            <div style="font-size: 16px; margin-bottom: 15px; opacity: 0.9;">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 15px;">Valid for 10 minutes</div>
          </div>
          
          <div class="content">
            <p>Enter this code in the verification form to activate your account.</p>
          </div>
          
          <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
              <li>Never share this OTP with anyone</li>
              <li>This OTP expires in 10 minutes</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This is an automated email from SAMS. Please do not reply.</p>
            <p>&copy; 2025 SAMS - Structure Asset Maintenance Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get password reset email HTML template
  getPasswordResetEmailHTML(otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SAMS Password Reset</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
          .container { background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #dc3545; }
          .logo { color: #2c5aa0; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .otp-box { background: linear-gradient(135deg, #dc3545, #e74c3c); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
          .content { font-size: 16px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SAMS</div>
          </div>
          
          <div class="alert">
            <strong>Password Reset Request</strong>
          </div>
          
          <div class="content">
            <p>We received a request to reset your SAMS account password. Use the OTP below to reset your password:</p>
          </div>
          
          <div class="otp-box">
            <div style="font-size: 16px; margin-bottom: 15px;">Password Reset Code</div>
            <div class="otp-code">${otp}</div>
            <div style="font-size: 14px; margin-top: 15px;">Valid for 15 minutes</div>
          </div>
          
          <div class="content">
            <p>Enter this code along with your new password to complete the reset process.</p>
            <p><strong>If you didn't request this password reset, please ignore this email.</strong></p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 SAMS - Structure Asset Maintenance Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Get welcome email HTML template
  getWelcomeEmailHTML(username, role) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SAMS</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
          .container { background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #28a745; }
          .logo { color: #2c5aa0; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .welcome-badge { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px 30px; border-radius: 25px; display: inline-block; font-weight: bold; margin: 20px 0; }
          .content { font-size: 16px; margin: 20px 0; }
          .features { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { margin-bottom: 10px; padding-left: 20px; position: relative; }
          .feature-item:before { content: "✓"; position: absolute; left: 0; color: #28a745; font-weight: bold; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SAMS</div>
            <div class="welcome-badge">Welcome, ${username}!</div>
          </div>
          
          <div class="content">
            <h2>Your Account is Now Active</h2>
            <p>Congratulations! Your SAMS account has been successfully activated with the role: <strong>${role}</strong></p>
            
            <div class="features">
              <h3>What you can do with SAMS:</h3>
              <div class="feature-item">Create and manage structure inventories</div>
              <div class="feature-item">Conduct detailed structural inspections</div>
              <div class="feature-item">Track maintenance schedules and history</div>
              <div class="feature-item">Generate comprehensive reports</div>
              <div class="feature-item">Monitor structural health ratings</div>
              <div class="feature-item">Collaborate with team members</div>
            </div>
            
            <p>Start by logging in to your dashboard and exploring the system features.</p>
          </div>
          
          <div class="footer">
            <p>Need help? Contact our support team at support@sams.com</p>
            <p>&copy; 2025 SAMS - Structure Asset Maintenance Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration
  async testEmailConfig() {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          message: 'Email service is not configured. Check EMAIL_USER and EMAIL_PASS in .env file.',
          configured: false
        };
      }

      await this.testConnection();
      
      return {
        success: true,
        message: 'Email configuration is working correctly',
        configured: true
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        configured: false
      };
    }
  }
}

module.exports = new EmailService();
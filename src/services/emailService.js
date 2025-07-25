const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({ // Fixed: removed 'er' from createTransporter
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send email verification
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 */
const sendEmailVerification = async (email, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SAMS</h1>
          <p>Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering with SAMS. Please click the button below to verify your email address:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account with SAMS, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email Address - SAMS',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 */
const sendPasswordReset = async (email, token) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #dc3545; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
          <p>SAMS - Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password for your SAMS account.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
          <div class="warning">
            <p><strong>⚠️ Security Notice:</strong></p>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password won't be changed until you create a new one</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS Security" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request - SAMS',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send welcome email with temporary password
 * @param {string} email - Recipient email
 * @param {string} password - Temporary password
 */
const sendWelcomeEmail = async (email, password) => {
  const transporter = createTransporter();
  
  const loginUrl = `${process.env.CLIENT_URL}/login`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #28a745; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .credentials { 
          background-color: #e9ecef; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
          font-family: monospace; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to SAMS</h1>
          <p>Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <h2>Your Account Has Been Created</h2>
          <p>Welcome to the Structure Asset Maintenance Management System (SAMS). An administrator has created an account for you.</p>
          
          <h3>Your Login Credentials:</h3>
          <div class="credentials">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to SAMS</a>
          </div>
          
          <div class="warning">
            <p><strong>🔒 Important Security Notice:</strong></p>
            <ul>
              <li>This is a temporary password</li>
              <li>Please change your password immediately after logging in</li>
              <li>Keep your login credentials secure</li>
              <li>Never share your password with anyone</li>
            </ul>
          </div>
          
          <h3>Getting Started:</h3>
          <ol>
            <li>Click the login button above or visit the SAMS portal</li>
            <li>Enter your email and temporary password</li>
            <li>Complete your profile information</li>
            <li>Change your password to something secure</li>
            <li>Start managing structure assets!</li>
          </ol>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS Admin" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Welcome to SAMS - Your Account Details',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send structure submission notification
 * @param {string} email - Recipient email
 * @param {Object} structure - Structure data
 */
const sendStructureSubmissionNotification = async (email, structure) => {
  const transporter = createTransporter();
  
  const structureUrl = `${process.env.CLIENT_URL}/structures/${structure._id}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #17a2b8; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .structure-info { 
          background-color: #e9ecef; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Structure Submitted Successfully</h1>
          <p>SAMS - Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <h2>Your Structure Has Been Submitted</h2>
          <p>Your structure has been successfully submitted for review and is now in the system.</p>
          
          <div class="structure-info">
            <h3>Structure Details:</h3>
            <p><strong>ID:</strong> ${structure.structureIdentityNumber}</p>
            <p><strong>Type:</strong> ${structure.structureType}</p>
            <p><strong>Location:</strong> ${structure.cityName}, ${structure.stateCode}</p>
            <p><strong>Status:</strong> ${structure.status}</p>
            <p><strong>Priority Level:</strong> ${structure.priorityLevel}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${structureUrl}" class="button">View Structure Details</a>
          </div>
          
          <h3>What Happens Next?</h3>
          <ol>
            <li>Your structure will be reviewed by our team</li>
            <li>An inspector may be assigned if required</li>
            <li>You'll receive notifications about any status changes</li>
            <li>You can track progress in your dashboard</li>
          </ol>
          
          <p>Thank you for using SAMS to maintain your structure assets!</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS Notifications" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Structure Submitted - ${structure.structureIdentityNumber}`,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send inspection assignment notification
 * @param {string} email - Inspector email
 * @param {Object} structure - Structure data
 * @param {string} notes - Inspection notes
 */
const sendInspectionAssignmentNotification = async (email, structure, notes) => {
  const transporter = createTransporter();
  
  const structureUrl = `${process.env.CLIENT_URL}/structures/${structure._id}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #fd7e14; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #fd7e14; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .structure-info { 
          background-color: #e9ecef; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .notes { 
          background-color: #fff3cd; 
          border: 1px solid #ffeaa7; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Inspection Assignment</h1>
          <p>SAMS - Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <h2>You've Been Assigned a New Inspection</h2>
          <p>A new structure has been assigned to you for inspection. Please review the details below and proceed with the inspection process.</p>
          
          <div class="structure-info">
            <h3>Structure Details:</h3>
            <p><strong>ID:</strong> ${structure.structureIdentityNumber}</p>
            <p><strong>Type:</strong> ${structure.structureType}</p>
            <p><strong>Location:</strong> ${structure.cityName}, ${structure.stateCode}</p>
            <p><strong>Priority Level:</strong> ${structure.priorityLevel}</p>
            <p><strong>Current Score:</strong> ${structure.totalScore?.toFixed(2) || 'N/A'}</p>
          </div>
          
          ${notes ? `
          <div class="notes">
            <h3>Special Instructions:</h3>
            <p>${notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${structureUrl}" class="button">Start Inspection</a>
          </div>
          
          <h3>Inspection Process:</h3>
          <ol>
            <li>Review the structure details and ratings</li>
            <li>Conduct your physical inspection</li>
            <li>Update ratings and add your observations</li>
            <li>Upload inspection photos if required</li>
            <li>Submit your final inspection report</li>
          </ol>
          
          <p>Please complete this inspection in a timely manner. For any questions, contact the system administrator.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS Inspections" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `New Inspection Assignment - ${structure.structureIdentityNumber}`,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send critical structure alert
 * @param {string} email - Recipient email
 * @param {Object} structure - Structure data
 */
const sendCriticalStructureAlert = async (email, structure) => {
  const transporter = createTransporter();
  
  const structureUrl = `${process.env.CLIENT_URL}/structures/${structure._id}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button { 
          display: inline-block; 
          background-color: #dc3545; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .alert { 
          background-color: #f8d7da; 
          border: 1px solid #f5c6cb; 
          color: #721c24; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .structure-info { 
          background-color: #e9ecef; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 CRITICAL STRUCTURE ALERT</h1>
          <p>SAMS - Structure Asset Maintenance Management System</p>
        </div>
        <div class="content">
          <div class="alert">
            <h2>⚠️ IMMEDIATE ATTENTION REQUIRED</h2>
            <p>A structure in your system has been flagged as CRITICAL and requires immediate attention.</p>
          </div>
          
          <div class="structure-info">
            <h3>Critical Structure Details:</h3>
            <p><strong>ID:</strong> ${structure.structureIdentityNumber}</p>
            <p><strong>Type:</strong> ${structure.structureType}</p>
            <p><strong>Location:</strong> ${structure.cityName}, ${structure.stateCode}</p>
            <p><strong>Priority Level:</strong> <span style="color: #dc3545; font-weight: bold;">${structure.priorityLevel.toUpperCase()}</span></p>
            <p><strong>Total Score:</strong> <span style="color: #dc3545; font-weight: bold;">${structure.totalScore?.toFixed(2) || 'N/A'}</span></p>
            <p><strong>Status:</strong> ${structure.status}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${structureUrl}" class="button">Take Immediate Action</a>
          </div>
          
          <h3>Recommended Actions:</h3>
          <ul>
            <li>Conduct immediate safety assessment</li>
            <li>Assign qualified inspector if not already done</li>
            <li>Consider restricting access if necessary</li>
            <li>Plan urgent maintenance interventions</li>
            <li>Document all findings and actions taken</li>
          </ul>
          
          <p><strong>This alert was generated automatically based on the structure's condition ratings. Please take appropriate action promptly.</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2024 SAMS - Structure Asset Maintenance Management System</p>
          <p>This is an automated alert, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"SAMS Critical Alerts" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `🚨 CRITICAL ALERT - Structure ${structure.structureIdentityNumber}`,
    html: htmlContent,
    priority: 'high'
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Test email configuration
 */
const testEmailConfiguration = async () => {
  const transporter = createTransporter();
  
  try {
    await transporter.verify();
    console.log('✅ Email server connection successful');
    return { success: true, message: 'Email configuration is working' };
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return { success: false, message: 'Email configuration failed', error: error.message };
  }
};

module.exports = {
  sendEmailVerification,
  sendPasswordReset,
  sendWelcomeEmail,
  sendStructureSubmissionNotification,
  sendInspectionAssignmentNotification,
  sendCriticalStructureAlert,
  testEmailConfiguration
};
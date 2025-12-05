const nodemailer = require('nodemailer');

/**
 * Email utility for sending transactional emails
 */

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'test') {
    // Use mock transporter for tests
    return {
      sendMail: async () => ({ messageId: 'test-message-id' })
    };
  }

  // Production email configuration
  if (process.env.SMTP_HOST) {
    const transportConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

    // In development, accept self-signed certificates
    if (process.env.NODE_ENV === 'development') {
      transportConfig.tls = {
        rejectUnauthorized: false
      };
    }

    return nodemailer.createTransport(transportConfig);
  }

  // Development: Use ethereal email (test account)
  console.warn('SMTP not configured. Emails will be logged to console in development.');
  return null;
};

let transporter = createTransporter();

// For testing: allow transporter override
const setTransporter = (newTransporter) => {
  transporter = newTransporter;
};

const getTransporter = () => transporter;

/**
 * Send email
 */
const sendEmail = async (to, subject, html, options = {}) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Art Hub Milwaukee <noreply@arthubmke.com>',
    to,
    subject,
    html,
    ...options
  };

  if (!transporter) {
    console.log('📧 Email would be sent:');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html.substring(0, 100)}...`);
    return { messageId: 'dev-message-id' };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send bulk emails (for notifications)
 */
const sendBulkEmails = async (emails) => {
  const results = await Promise.allSettled(
    emails.map(({ to, subject, html, options }) =>
      sendEmail(to, subject, html, options)
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`📧 Bulk email results: ${successful} sent, ${failed} failed`);

  return { successful, failed, results };
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  setTransporter, // For testing
  getTransporter  // For testing
};

import nodemailer from 'nodemailer';

// Initialize transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For development, set to true in production
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
}

/**
 * Send email using Nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email configuration missing. Skipping email send.');
      return false;
    }

    const result = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME || 'DocuFlow'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      replyTo: options.replyTo,
    });

    console.log('Email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email configuration missing');
      return false;
    }

    await transporter.verify();
    console.log('Email configuration verified');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

/**
 * Send bulk emails
 */
export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const email of recipients) {
    try {
      await sendEmail({ to: email, subject, html });
      success++;
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

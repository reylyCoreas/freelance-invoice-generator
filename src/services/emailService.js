import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { pdfService } from './pdfService.js';
import { Invoice } from '../models/index.js';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      // In a real application, you would configure this with your email provider
      // For development, we'll use Ethereal Email (https://ethereal.email/)
      // or configure with environment variables for production
      
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Production email configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        
        logger.info('Email service initialized with production settings');
      } else {
        // Development configuration using Ethereal Email
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        logger.info('Email service initialized with test account', {
          user: testAccount.user,
          pass: testAccount.pass
        });
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendInvoiceEmail(invoiceId, emailOptions = {}) {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const invoice = Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const client = invoice.getClient();
      if (!client) {
        throw new Error('Client not found for invoice');
      }

      logger.info('Preparing to send invoice email', { invoiceId, clientEmail: client.email });

      // Generate PDF attachment if requested
      let attachments = [];
      if (emailOptions.attachPdf !== false) {
        try {
          const pdfBuffer = await pdfService.generateAndReturnPDF(invoiceId, emailOptions.templateId);
          attachments.push({
            filename: `invoice-${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        } catch (pdfError) {
          logger.error('Failed to generate PDF attachment:', pdfError);
          // Continue without attachment rather than failing the email
        }
      }

      // Prepare email recipients
      const recipients = this.prepareRecipients(emailOptions.to || client.email);
      const ccRecipients = emailOptions.cc ? this.prepareRecipients(emailOptions.cc) : [];
      const bccRecipients = emailOptions.bcc ? this.prepareRecipients(emailOptions.bcc) : [];

      // Prepare email content
      const subject = emailOptions.subject || `Invoice ${invoice.invoiceNumber} from ${process.env.BUSINESS_NAME || 'Your Business'}`;
      
      const defaultMessage = this.generateDefaultEmailContent(invoice, client);
      const htmlContent = this.generateEmailHTML(invoice, client, emailOptions.message || defaultMessage);
      
      // Email configuration
      const mailOptions = {
        from: `\"${process.env.BUSINESS_NAME || 'Your Business'}\" <${process.env.BUSINESS_EMAIL || 'noreply@yourbusiness.com'}>`,
        to: recipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: subject,
        text: emailOptions.message || defaultMessage,
        html: htmlContent,
        attachments: attachments
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      // Update invoice status
      if (invoice.status === 'draft') {
        invoice.updateStatus('sent');
        Invoice.update(invoiceId, invoice);
      }

      logger.info('Invoice email sent successfully', {
        invoiceId,
        messageId: result.messageId,
        recipients: recipients,
        attachmentCount: attachments.length
      });

      // Return result with preview URL for development
      const response = {
        success: true,
        messageId: result.messageId,
        recipients: recipients,
        attachmentCount: attachments.length,
        invoiceId: invoiceId
      };

      // Add preview URL for Ethereal Email in development
      if (process.env.NODE_ENV !== 'production' && result.messageId) {
        response.previewUrl = nodemailer.getTestMessageUrl(result);
        logger.info('Email preview URL:', { url: response.previewUrl });
      }

      return response;

    } catch (error) {
      logger.error('Failed to send invoice email:', error);
      throw error;
    }
  }

  prepareRecipients(recipients) {
    if (typeof recipients === 'string') {
      return recipients;
    }
    if (Array.isArray(recipients)) {
      return recipients.join(', ');
    }
    return '';
  }

  generateDefaultEmailContent(invoice, client) {
    return `Dear ${client.name},

Please find attached your invoice ${invoice.invoiceNumber} for the amount of ${invoice.currency === 'USD' ? '$' : invoice.currency}${invoice.total.toFixed(2)}.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${invoice.issueDate}
- Due Date: ${invoice.dueDate}
- Amount Due: ${invoice.currency === 'USD' ? '$' : invoice.currency}${invoice.total.toFixed(2)}

${invoice.notes ? `\nNotes:\n${invoice.notes}` : ''}

Thank you for your business!

Best regards,
${process.env.BUSINESS_NAME || 'Your Business'}
${process.env.BUSINESS_EMAIL || ''}
${process.env.BUSINESS_ADDRESS || ''}`;
  }

  generateEmailHTML(invoice, client, textMessage) {
    const lines = textMessage.split('\n');
    const htmlLines = lines.map(line => {
      if (line.trim() === '') return '<br>';
      if (line.includes('Invoice Details:')) return `<strong>${line}</strong>`;
      if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
      if (line.includes('Notes:')) return `<br><strong>${line}</strong>`;
      return line;
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .invoice-summary { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #666; }
            ul { padding-left: 0; list-style: none; }
            li { padding: 5px 0; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h2>Invoice ${invoice.invoiceNumber}</h2>
                <p>From: ${process.env.BUSINESS_NAME || 'Your Business'}</p>
            </div>
            
            <div class="content">
                ${htmlLines.map(line => `<p>${line}</p>`).join('')}
            </div>

            <div class="invoice-summary">
                <h3>Quick Summary</h3>
                <p><strong>Amount Due:</strong> ${invoice.currency === 'USD' ? '$' : invoice.currency}${invoice.total.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
                <p><strong>Payment Terms:</strong> ${invoice.paymentTerms} days</p>
            </div>

            <div class="footer">
                <p><small>This email was sent automatically from our invoice system. Please do not reply to this email.</small></p>
            </div>
        </div>
    </body>
    </html>`;
  }

  async sendBulkInvoiceEmails(invoiceIds, emailOptions = {}) {
    const results = [];
    
    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.sendInvoiceEmail(invoiceId, emailOptions);
        results.push({
          invoiceId,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        logger.error(`Failed to send email for invoice ${invoiceId}:`, error);
        results.push({
          invoiceId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async testEmailConfiguration() {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      await this.transporter.verify();
      
      logger.info('Email configuration test successful');
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      logger.error('Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(recipient) {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const mailOptions = {
        from: `\"${process.env.BUSINESS_NAME || 'Your Business'}\" <${process.env.BUSINESS_EMAIL || 'noreply@yourbusiness.com'}>`,
        to: recipient,
        subject: 'Test Email - Invoice System',
        text: 'This is a test email from your invoice system. If you received this, your email configuration is working correctly!',
        html: `
          <h2>Email Test Successful!</h2>
          <p>This is a test email from your invoice system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <hr>
          <small>Sent from ${process.env.BUSINESS_NAME || 'Your Business'} Invoice System</small>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      const response = {
        success: true,
        messageId: result.messageId,
        recipient: recipient
      };

      if (process.env.NODE_ENV !== 'production' && result.messageId) {
        response.previewUrl = nodemailer.getTestMessageUrl(result);
      }

      return response;
    } catch (error) {
      logger.error('Failed to send test email:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();

import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';
import { TemplateController } from '../controllers/templateController.js';
import { Invoice } from '../models/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFService {
  constructor() {
    this.templateController = new TemplateController();
    this.pdfOutputPath = path.join(__dirname, '../../generated-pdfs');
    this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.pdfOutputPath, { recursive: true });
    } catch (error) {
      logger.error('Error creating PDF output directory:', error);
    }
  }

  async generateInvoicePDF(invoiceId, templateId = null) {
    let browser = null;
    
    try {
      logger.info('Starting PDF generation for invoice', { invoiceId, templateId });
      
      // Get the rendered HTML content from the template controller
      const htmlContent = await this.templateController.renderInvoiceWithTemplate(invoiceId, templateId);
      
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 800 });
      
      // Set content and wait for all resources to load
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      // Generate PDF with A4 format and margins
      const pdfOptions = {
        format: 'A4',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        printBackground: true,
        preferCSSPageSize: false
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      
      // Save PDF to file system
      const invoice = Invoice.findById(invoiceId);
      const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const filepath = path.join(this.pdfOutputPath, filename);
      
      await fs.writeFile(filepath, pdfBuffer);
      
      // Update invoice with PDF path
      Invoice.update(invoiceId, { pdfPath: filepath });
      
      logger.info('PDF generated successfully', { 
        invoiceId, 
        filename, 
        size: pdfBuffer.length 
      });

      return {
        success: true,
        filename,
        filepath,
        buffer: pdfBuffer,
        size: pdfBuffer.length
      };

    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw error;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logger.error('Error closing browser:', closeError);
        }
      }
    }
  }

  async generateAndReturnPDF(invoiceId, templateId = null) {
    const result = await this.generateInvoicePDF(invoiceId, templateId);
    return result.buffer;
  }

  async getPDFStream(invoiceId, templateId = null) {
    const result = await this.generateInvoicePDF(invoiceId, templateId);
    return {
      stream: result.buffer,
      filename: result.filename,
      contentType: 'application/pdf'
    };
  }

  // Preview invoice HTML (for debugging)
  async previewInvoiceHTML(invoiceId, templateId = null) {
    try {
      const htmlContent = await this.templateController.renderInvoiceWithTemplate(invoiceId, templateId);
      return htmlContent;
    } catch (error) {
      logger.error('Error generating preview HTML:', error);
      throw error;
    }
  }

  // Batch PDF generation for multiple invoices
  async generateBatchPDFs(invoiceIds, templateId = null) {
    const results = [];
    
    for (const invoiceId of invoiceIds) {
      try {
        const result = await this.generateInvoicePDF(invoiceId, templateId);
        results.push({
          invoiceId,
          success: true,
          filename: result.filename,
          size: result.size
        });
      } catch (error) {
        logger.error(`Error generating PDF for invoice ${invoiceId}:`, error);
        results.push({
          invoiceId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Clean up old PDF files (optional maintenance function)
  async cleanupOldPDFs(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.pdfOutputPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const filepath = path.join(this.pdfOutputPath, file);
          const stats = await fs.stat(filepath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filepath);
            deletedCount++;
            logger.info('Deleted old PDF file', { file });
          }
        }
      }
      
      logger.info('PDF cleanup completed', { deletedCount, maxAgeHours });
      return { deletedCount };
      
    } catch (error) {
      logger.error('Error during PDF cleanup:', error);
      throw error;
    }
  }

  // Get PDF file info
  async getPDFInfo(invoiceId) {
    try {
      const invoice = Invoice.findById(invoiceId);
      if (!invoice || !invoice.pdfPath) {
        return null;
      }

      const stats = await fs.stat(invoice.pdfPath);
      return {
        exists: true,
        filepath: invoice.pdfPath,
        filename: path.basename(invoice.pdfPath),
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      logger.error('Error getting PDF info:', error);
      throw error;
    }
  }

  // Template validation for PDF generation
  async validateTemplateForPDF(templateId) {
    let browser = null;
    
    try {
      // Create sample HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Template Test</title>
          <style>body { font-family: Arial, sans-serif; }</style>
        </head>
        <body>
          <h1>Template Validation Test</h1>
          <p>This is a test to ensure the template can be rendered as PDF.</p>
        </body>
        </html>
      `;

      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent);
      
      // Try to generate a small test PDF
      await page.pdf({ format: 'A4' });
      
      return { valid: true };
      
    } catch (error) {
      logger.error('Template validation failed:', error);
      return { 
        valid: false, 
        error: error.message 
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

// Export a singleton instance
export const pdfService = new PDFService();

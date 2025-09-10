import { logger } from '../utils/logger.js';
import { Invoice, Client, Template } from '../models/index.js';
import { pdfService } from '../services/pdfService.js';
import { emailService } from '../services/emailService.js';
import { TemplateController } from './templateController.js';

export class InvoiceController {
  async getAllInvoices(req, res, next) {
    try {
      logger.info('Fetching all invoices', { query: req.query });
      
      const filters = {
        clientId: req.query.clientId,
        status: req.query.status
      };
      
      if (req.query.startDate && req.query.endDate) {
        filters.dateRange = {
          start: req.query.startDate,
          end: req.query.endDate
        };
      }
      
      let invoices = Invoice.findAll(filters);
      
      // Add client information to each invoice
      invoices = invoices.map(invoice => {
        const client = invoice.getClient();
        return {
          ...invoice,
          client: client ? {
            id: client.id,
            name: client.name,
            email: client.email,
            company: client.company
          } : null
        };
      });
      
      // Apply pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedInvoices = invoices.slice(startIndex, endIndex);
      
      // Calculate summary statistics
      const stats = {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
        statusBreakdown: {
          draft: invoices.filter(inv => inv.status === 'draft').length,
          sent: invoices.filter(inv => inv.status === 'sent').length,
          paid: invoices.filter(inv => inv.status === 'paid').length,
          overdue: invoices.filter(inv => inv.status === 'overdue').length,
          cancelled: invoices.filter(inv => inv.status === 'cancelled').length
        },
        paidAmount: invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total, 0),
        outstandingAmount: invoices
          .filter(inv => ['sent', 'overdue'].includes(inv.status))
          .reduce((sum, inv) => sum + inv.total, 0)
      };
      
      res.json({
        success: true,
        data: paginatedInvoices,
        pagination: {
          page,
          limit,
          total: invoices.length,
          pages: Math.ceil(invoices.length / limit),
          hasNext: endIndex < invoices.length,
          hasPrev: startIndex > 0
        },
        stats
      });
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      next(error);
    }
  }

  async getInvoiceById(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Fetching invoice by ID', { id });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // Add client information
      const client = invoice.getClient();
      const invoiceWithClient = {
        ...invoice,
        client: client
      };
      
      res.json({
        success: true,
        data: invoiceWithClient
      });
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      next(error);
    }
  }

  async createInvoice(req, res, next) {
    try {
      logger.info('Creating new invoice', { invoiceData: req.body });
      
      // Verify client exists
      const client = Client.findById(req.body.clientId);
      if (!client) {
        return res.status(400).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Process line items - calculate totals
      const processedItems = req.body.items.map(item => ({
        ...item,
        total: item.quantity * item.rate
      }));
      
      const invoiceData = {
        ...req.body,
        items: processedItems
      };
      
      const invoice = Invoice.create(invoiceData);
      
      // Add client information to response
      const invoiceWithClient = {
        ...invoice,
        client: client
      };
      
      logger.info('Invoice created successfully', { invoiceId: invoice.id });
      
      res.status(201).json({
        success: true,
        data: invoiceWithClient,
        message: 'Invoice created successfully'
      });
    } catch (error) {
      logger.error('Error creating invoice:', error);
      next(error);
    }
  }

  async updateInvoice(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Updating invoice', { id, updateData: req.body });
      
      const existingInvoice = Invoice.findById(id);
      if (!existingInvoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // If clientId is being updated, verify the new client exists
      if (req.body.clientId && req.body.clientId !== existingInvoice.clientId) {
        const client = Client.findById(req.body.clientId);
        if (!client) {
          return res.status(400).json({
            success: false,
            error: 'Client not found'
          });
        }
      }
      
      // Process line items if they're being updated
      let updateData = { ...req.body };
      if (req.body.items) {
        updateData.items = req.body.items.map(item => ({
          ...item,
          total: item.quantity * item.rate
        }));
      }
      
      const updatedInvoice = Invoice.update(id, updateData);
      
      // Add client information
      const client = updatedInvoice.getClient();
      const invoiceWithClient = {
        ...updatedInvoice,
        client: client
      };
      
      logger.info('Invoice updated successfully', { invoiceId: id });
      
      res.json({
        success: true,
        data: invoiceWithClient,
        message: 'Invoice updated successfully'
      });
    } catch (error) {
      logger.error('Error updating invoice:', error);
      next(error);
    }
  }

  async deleteInvoice(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Deleting invoice', { id });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // Prevent deletion of paid invoices
      if (invoice.status === 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete a paid invoice'
        });
      }
      
      const deleted = Invoice.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      logger.info('Invoice deleted successfully', { invoiceId: id });
      
      res.json({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      logger.info('Updating invoice status', { id, status });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // Update status with timestamp tracking
      invoice.updateStatus(status);
      const updatedInvoice = Invoice.update(id, invoice);
      
      // Add client information
      const client = updatedInvoice.getClient();
      const invoiceWithClient = {
        ...updatedInvoice,
        client: client
      };
      
      logger.info('Invoice status updated successfully', { invoiceId: id, newStatus: status });
      
      res.json({
        success: true,
        data: invoiceWithClient,
        message: `Invoice status updated to ${status}`
      });
    } catch (error) {
      logger.error('Error updating invoice status:', error);
      next(error);
    }
  }

  async generatePDF(req, res, next) {
    try {
      const { id } = req.params;
      const { templateId, download } = req.query;
      logger.info('Generating PDF for invoice', { id, templateId });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // Generate PDF using the PDF service
      const pdfResult = await pdfService.getPDFStream(id, templateId);
      
      // Update invoice status to 'sent' if it was draft
      if (invoice.status === 'draft') {
        invoice.updateStatus('sent');
        Invoice.update(id, invoice);
      }
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', pdfResult.contentType);
      res.setHeader('Content-Disposition', 
        download === 'true' 
          ? `attachment; filename="${pdfResult.filename}"` 
          : `inline; filename="${pdfResult.filename}"`
      );
      
      // Send the PDF buffer
      res.send(pdfResult.stream);
    } catch (error) {
      logger.error('Error generating PDF:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async sendEmail(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Sending invoice email', { id, emailData: req.body });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      // Send email using the email service
      const emailResult = await emailService.sendInvoiceEmail(id, req.body);
      
      logger.info('Invoice email sent successfully', { 
        invoiceId: id, 
        messageId: emailResult.messageId 
      });
      
      res.json({
        success: true,
        message: 'Invoice email sent successfully',
        data: emailResult
      });
    } catch (error) {
      logger.error('Error sending invoice email:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to send invoice email',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async previewInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const { templateId, format } = req.query;
      logger.info('Previewing invoice', { id, templateId, format });
      
      const invoice = Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found'
        });
      }
      
      const templateController = new TemplateController();
      
      if (format === 'html') {
        // Return HTML preview
        const htmlContent = await templateController.renderInvoiceWithTemplate(id, templateId);
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        // Return JSON with rendered data for debugging
        const client = invoice.getClient();
        const template = templateId ? Template.findById(templateId) : Template.findById(invoice.templateId) || Template.findDefault();
        
        const previewData = {
          invoice: {
            ...invoice,
            client: client
          },
          template: {
            id: template.id,
            name: template.name,
            description: template.description
          },
          businessInfo: {
            name: process.env.BUSINESS_NAME || 'Your Business Name',
            email: process.env.BUSINESS_EMAIL || 'your-email@example.com',
            address: process.env.BUSINESS_ADDRESS || 'Your Business Address'
          },
          calculations: {
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            discountAmount: invoice.discountAmount,
            total: invoice.total
          }
        };
        
        res.json({
          success: true,
          data: previewData
        });
      }
    } catch (error) {
      logger.error('Error previewing invoice:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to preview invoice',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

}

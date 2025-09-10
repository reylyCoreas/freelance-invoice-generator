import { logger } from '../utils/logger.js';
import { Template, Invoice, Client } from '../models/index.js';
import handlebars from 'handlebars';
import { format } from 'date-fns';

export class TemplateController {
  async getAllTemplates(req, res, next) {
    try {
      logger.info('Fetching all templates');
      
      const templates = Template.findAll();
      
      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Error fetching templates:', error);
      next(error);
    }
  }

  async getTemplateById(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Fetching template by ID', { id });
      
      const template = Template.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error fetching template:', error);
      next(error);
    }
  }

  async createTemplate(req, res, next) {
    try {
      logger.info('Creating new template', { templateData: req.body });
      
      // Check if template with same name already exists
      const existingTemplate = Template.findAll().find(t => t.name === req.body.name);
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          error: 'A template with this name already exists'
        });
      }
      
      // Validate Handlebars template syntax
      try {
        handlebars.compile(req.body.htmlContent);
      } catch (hbError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Handlebars template syntax',
          details: hbError.message
        });
      }
      
      const template = Template.create(req.body);
      
      logger.info('Template created successfully', { templateId: template.id });
      
      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });
    } catch (error) {
      logger.error('Error creating template:', error);
      next(error);
    }
  }

  async updateTemplate(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Updating template', { id, updateData: req.body });
      
      const existingTemplate = Template.findById(id);
      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      // Check if name is being updated and if it conflicts with another template
      if (req.body.name && req.body.name !== existingTemplate.name) {
        const nameConflict = Template.findAll().find(t => t.id !== id && t.name === req.body.name);
        if (nameConflict) {
          return res.status(400).json({
            success: false,
            error: 'A template with this name already exists'
          });
        }
      }
      
      // Validate Handlebars template syntax if being updated
      if (req.body.htmlContent) {
        try {
          handlebars.compile(req.body.htmlContent);
        } catch (hbError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid Handlebars template syntax',
            details: hbError.message
          });
        }
      }
      
      const updatedTemplate = Template.update(id, req.body);
      
      logger.info('Template updated successfully', { templateId: id });
      
      res.json({
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      });
    } catch (error) {
      logger.error('Error updating template:', error);
      next(error);
    }
  }

  async deleteTemplate(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Deleting template', { id });
      
      const template = Template.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      // Prevent deletion of the default template if it's the only one
      if (template.isDefault) {
        const allTemplates = Template.findAll();
        if (allTemplates.length === 1) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete the only default template'
          });
        }
      }
      
      // Check if any invoices are using this template
      const invoicesUsingTemplate = Invoice.findAll().filter(inv => inv.templateId === id);
      if (invoicesUsingTemplate.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete template that is being used by ${invoicesUsingTemplate.length} invoice(s)`,
          invoiceCount: invoicesUsingTemplate.length
        });
      }
      
      const deleted = Template.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      logger.info('Template deleted successfully', { templateId: id });
      
      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting template:', error);
      next(error);
    }
  }

  async previewTemplate(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Previewing template', { id });
      
      const template = Template.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }
      
      // Create sample data for preview
      const sampleData = {
        businessName: process.env.BUSINESS_NAME || 'Sample Business Name',
        businessAddress: process.env.BUSINESS_ADDRESS || '123 Business St, City, State 12345',
        businessEmail: process.env.BUSINESS_EMAIL || 'business@example.com',
        invoiceNumber: 'INV-2024-0001',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        paymentTerms: 30,
        currency: process.env.CURRENCY || 'USD',
        taxRate: (parseFloat(process.env.TAX_RATE || '0.08') * 100).toFixed(0),
        client: {
          name: 'Sample Client',
          company: 'Client Company Inc.',
          email: 'client@example.com',
          address: {
            street: '456 Client Ave',
            city: 'Client City',
            state: 'CS',
            zip: '54321'
          }
        },
        items: [
          {
            description: 'Web Development Services',
            details: 'Frontend and backend development',
            quantity: 40,
            rate: 75,
            total: 3000
          },
          {
            description: 'UI/UX Design',
            details: 'User interface and experience design',
            quantity: 20,
            rate: 65,
            total: 1300
          }
        ],
        subtotal: 4300,
        discountAmount: 0,
        taxAmount: 344,
        total: 4644,
        notes: 'Thank you for your business! Payment is due within 30 days of invoice date.'
      };
      
      try {
        // Compile the template with sample data
        const compiledTemplate = handlebars.compile(template.htmlContent);
        const htmlContent = compiledTemplate({
          ...sampleData,
          css: template.cssContent
        });
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } catch (renderError) {
        logger.error('Error rendering template:', renderError);
        res.status(400).json({
          success: false,
          error: 'Error rendering template',
          details: renderError.message
        });
      }
    } catch (error) {
      logger.error('Error previewing template:', error);
      next(error);
    }
  }

  // Helper method to render an invoice with a specific template
  async renderInvoiceWithTemplate(invoiceId, templateId = null) {
    const invoice = Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    const client = invoice.getClient();
    if (!client) {
      throw new Error('Client not found for invoice');
    }
    
    const template = templateId ? Template.findById(templateId) : Template.findById(invoice.templateId) || Template.findDefault();
    if (!template) {
      throw new Error('Template not found');
    }
    
    // Prepare template data
    const templateData = {
      businessName: process.env.BUSINESS_NAME || 'Your Business Name',
      businessAddress: process.env.BUSINESS_ADDRESS || 'Your Business Address',
      businessEmail: process.env.BUSINESS_EMAIL || 'your-email@example.com',
      invoiceNumber: invoice.invoiceNumber,
      issueDate: format(new Date(invoice.issueDate), 'MMMM d, yyyy'),
      dueDate: format(new Date(invoice.dueDate), 'MMMM d, yyyy'),
      paymentTerms: invoice.paymentTerms,
      currency: invoice.currency === 'USD' ? '$' : invoice.currency,
      taxRate: (invoice.taxRate * 100).toFixed(0),
      client: client,
      items: invoice.items,
      subtotal: invoice.subtotal.toFixed(2),
      discountAmount: invoice.discountAmount.toFixed(2),
      taxAmount: invoice.taxAmount.toFixed(2),
      total: invoice.total.toFixed(2),
      notes: invoice.notes,
      css: template.cssContent
    };
    
    // Compile and render template
    const compiledTemplate = handlebars.compile(template.htmlContent);
    return compiledTemplate(templateData);
  }
}

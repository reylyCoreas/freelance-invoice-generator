import express from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';
import { validateRequest, validateParams, validateQuery, invoiceValidation, emailValidation } from '../validation/schemas.js';

const router = express.Router();
const invoiceController = new InvoiceController();

// GET /api/invoices - Get all invoices
router.get('/', 
  validateQuery(invoiceValidation.query),
  invoiceController.getAllInvoices
);

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', 
  validateParams(invoiceValidation.params),
  invoiceController.getInvoiceById
);

// POST /api/invoices - Create new invoice
router.post('/', 
  validateRequest(invoiceValidation.create),
  invoiceController.createInvoice
);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', 
  validateParams(invoiceValidation.params),
  validateRequest(invoiceValidation.update),
  invoiceController.updateInvoice
);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', 
  validateParams(invoiceValidation.params),
  invoiceController.deleteInvoice
);

// PATCH /api/invoices/:id/status - Update invoice status
router.patch('/:id/status', 
  validateParams(invoiceValidation.params),
  validateRequest(invoiceValidation.statusUpdate),
  invoiceController.updateStatus
);

// POST /api/invoices/:id/generate-pdf - Generate PDF for invoice
router.post('/:id/generate-pdf', 
  validateParams(invoiceValidation.params),
  invoiceController.generatePDF
);

// POST /api/invoices/:id/send-email - Send invoice via email
router.post('/:id/send-email', 
  validateParams(invoiceValidation.params),
  validateRequest(emailValidation.sendInvoice),
  invoiceController.sendEmail
);

// GET /api/invoices/:id/preview - Preview invoice
router.get('/:id/preview', 
  validateParams(invoiceValidation.params),
  invoiceController.previewInvoice
);

export default router;

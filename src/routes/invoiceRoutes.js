import express from 'express';
import { InvoiceController } from '../controllers/invoiceController.js';

const router = express.Router();
const invoiceController = new InvoiceController();

// GET /api/invoices - Get all invoices
router.get('/', invoiceController.getAllInvoices);

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', invoiceController.getInvoiceById);

// POST /api/invoices - Create new invoice
router.post('/', invoiceController.createInvoice);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', invoiceController.updateInvoice);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', invoiceController.deleteInvoice);

// POST /api/invoices/:id/generate-pdf - Generate PDF for invoice
router.post('/:id/generate-pdf', invoiceController.generatePDF);

// POST /api/invoices/:id/send-email - Send invoice via email
router.post('/:id/send-email', invoiceController.sendEmail);

// GET /api/invoices/:id/preview - Preview invoice
router.get('/:id/preview', invoiceController.previewInvoice);

export default router;

import express from 'express';
import { ClientController } from '../controllers/clientController.js';

const router = express.Router();
const clientController = new ClientController();

// GET /api/clients - Get all clients
router.get('/', clientController.getAllClients);

// GET /api/clients/:id - Get specific client
router.get('/:id', clientController.getClientById);

// POST /api/clients - Create new client
router.post('/', clientController.createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', clientController.updateClient);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', clientController.deleteClient);

// GET /api/clients/:id/invoices - Get all invoices for a client
router.get('/:id/invoices', clientController.getClientInvoices);

export default router;

import express from 'express';
import { ClientController } from '../controllers/clientController.js';
import { validateRequest, validateParams, clientValidation } from '../validation/schemas.js';

const router = express.Router();
const clientController = new ClientController();

// GET /api/clients - Get all clients
router.get('/', clientController.getAllClients);

// GET /api/clients/:id - Get specific client
router.get('/:id', 
  validateParams(clientValidation.params),
  clientController.getClientById
);

// POST /api/clients - Create new client
router.post('/', 
  validateRequest(clientValidation.create),
  clientController.createClient
);

// PUT /api/clients/:id - Update client
router.put('/:id', 
  validateParams(clientValidation.params),
  validateRequest(clientValidation.update),
  clientController.updateClient
);

// DELETE /api/clients/:id - Delete client
router.delete('/:id', 
  validateParams(clientValidation.params),
  clientController.deleteClient
);

// GET /api/clients/:id/invoices - Get all invoices for a client
router.get('/:id/invoices', 
  validateParams(clientValidation.params),
  clientController.getClientInvoices
);

export default router;

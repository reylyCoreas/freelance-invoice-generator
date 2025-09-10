import { logger } from '../utils/logger.js';
import { Client, Invoice } from '../models/index.js';

export class ClientController {
  async getAllClients(req, res, next) {
    try {
      logger.info('Fetching all clients');
      
      const clients = Client.findAll();
      
      // Add invoice count and total for each client
      const clientsWithStats = clients.map(client => {
        const invoices = client.getInvoices();
        const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        const paidAmount = invoices
          .filter(invoice => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.total, 0);
        
        return {
          ...client,
          stats: {
            totalInvoices: invoices.length,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            outstandingAmount: totalAmount - paidAmount,
            lastInvoiceDate: invoices.length > 0 ? invoices[0].issueDate : null
          }
        };
      });
      
      res.json({
        success: true,
        data: clientsWithStats,
        count: clientsWithStats.length
      });
    } catch (error) {
      logger.error('Error fetching clients:', error);
      next(error);
    }
  }

  async getClientById(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Fetching client by ID', { id });
      
      const client = Client.findById(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Add client statistics
      const invoices = client.getInvoices();
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const paidAmount = invoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.total, 0);
      
      const clientWithStats = {
        ...client,
        stats: {
          totalInvoices: invoices.length,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          outstandingAmount: totalAmount - paidAmount,
          lastInvoiceDate: invoices.length > 0 ? invoices[0].issueDate : null
        }
      };
      
      res.json({
        success: true,
        data: clientWithStats
      });
    } catch (error) {
      logger.error('Error fetching client:', error);
      next(error);
    }
  }

  async createClient(req, res, next) {
    try {
      logger.info('Creating new client', { clientData: req.body });
      
      // Check if client with same email already exists
      const existingClient = Client.findAll().find(c => c.email === req.body.email);
      if (existingClient) {
        return res.status(400).json({
          success: false,
          error: 'A client with this email already exists'
        });
      }
      
      const client = Client.create(req.body);
      
      logger.info('Client created successfully', { clientId: client.id });
      
      res.status(201).json({
        success: true,
        data: client,
        message: 'Client created successfully'
      });
    } catch (error) {
      logger.error('Error creating client:', error);
      next(error);
    }
  }

  async updateClient(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Updating client', { id, updateData: req.body });
      
      const existingClient = Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Check if email is being updated and if it conflicts with another client
      if (req.body.email && req.body.email !== existingClient.email) {
        const emailConflict = Client.findAll().find(c => c.id !== id && c.email === req.body.email);
        if (emailConflict) {
          return res.status(400).json({
            success: false,
            error: 'A client with this email already exists'
          });
        }
      }
      
      const updatedClient = Client.update(id, req.body);
      
      logger.info('Client updated successfully', { clientId: id });
      
      res.json({
        success: true,
        data: updatedClient,
        message: 'Client updated successfully'
      });
    } catch (error) {
      logger.error('Error updating client:', error);
      next(error);
    }
  }

  async deleteClient(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Deleting client', { id });
      
      const client = Client.findById(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      // Check if client has any invoices
      const invoices = client.getInvoices();
      if (invoices.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete client with existing invoices. This client has ${invoices.length} invoice(s).`,
          invoiceCount: invoices.length
        });
      }
      
      const deleted = Client.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      logger.info('Client deleted successfully', { clientId: id });
      
      res.json({
        success: true,
        message: 'Client deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting client:', error);
      next(error);
    }
  }

  async getClientInvoices(req, res, next) {
    try {
      const { id } = req.params;
      logger.info('Fetching invoices for client', { id });
      
      const client = Client.findById(id);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }
      
      const invoices = client.getInvoices();
      
      // Calculate client summary
      const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
      const paidAmount = invoices
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.total, 0);
      
      const summary = {
        totalInvoices: invoices.length,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        outstandingAmount: totalAmount - paidAmount,
        statusBreakdown: {
          draft: invoices.filter(inv => inv.status === 'draft').length,
          sent: invoices.filter(inv => inv.status === 'sent').length,
          paid: invoices.filter(inv => inv.status === 'paid').length,
          overdue: invoices.filter(inv => inv.status === 'overdue').length,
          cancelled: invoices.filter(inv => inv.status === 'cancelled').length
        }
      };
      
      res.json({
        success: true,
        data: {
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
            company: client.company
          },
          invoices: invoices,
          summary: summary
        }
      });
    } catch (error) {
      logger.error('Error fetching client invoices:', error);
      next(error);
    }
  }
}

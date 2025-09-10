import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { pool } from '../config/database.js';
import { logger } from '../utils/logger.js';

// PostgreSQL-backed models

// Client Model (PostgreSQL-backed)
export class Client {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone || '';
    this.address = data.address || {};
    this.company = data.company || '';
    this.taxId = data.tax_id || data.taxId || '';
    this.paymentTerms = data.payment_terms || data.paymentTerms || 30;
    this.currency = data.currency || 'USD';
    this.notes = data.notes || '';
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  static async findAll(userId = null) {
    try {
      let query = 'SELECT * FROM clients';
      let params = [];
      
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { rows } = await pool.query(query, params);
      return rows.map(row => new Client(row));
    } catch (error) {
      logger.error('Error finding clients:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM clients WHERE id = $1',
        [id]
      );
      return rows.length > 0 ? new Client(rows[0]) : null;
    } catch (error) {
      logger.error('Error finding client by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    return await this.findAll(userId);
  }

  static async searchByName(userId, searchTerm) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM clients 
         WHERE user_id = $1 
         AND (name ILIKE $2 OR company ILIKE $2 OR email ILIKE $2)
         ORDER BY name ASC`,
        [userId, `%${searchTerm}%`]
      );
      return rows.map(row => new Client(row));
    } catch (error) {
      logger.error('Error searching clients:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO clients (user_id, name, email, phone, company, tax_id, address, payment_terms, currency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          data.userId,
          data.name,
          data.email,
          data.phone || null,
          data.company || null,
          data.taxId || null,
          JSON.stringify(data.address || {}),
          data.paymentTerms || 30,
          data.currency || 'USD',
          data.notes || null
        ]
      );
      return new Client(rows[0]);
    } catch (error) {
      logger.error('Error creating client:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      const fields = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        tax_id: data.taxId,
        address: data.address ? JSON.stringify(data.address) : undefined,
        payment_terms: data.paymentTerms,
        currency: data.currency,
        notes: data.notes
      };

      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      });

      if (updates.length === 0) return null;

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      return rows.length > 0 ? new Client(rows[0]) : null;
    } catch (error) {
      logger.error('Error updating client:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM clients WHERE id = $1',
        [id]
      );
      return rowCount > 0;
    } catch (error) {
      logger.error('Error deleting client:', error);
      throw error;
    }
  }

  async getInvoices() {
    return await Invoice.findByClientId(this.id);
  }
}

// Invoice Model (PostgreSQL-backed)
export class Invoice {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id || data.userId;
    this.clientId = data.client_id || data.clientId;
    this.invoiceNumber = data.invoice_number || data.invoiceNumber;
    this.status = data.status || 'draft';
    this.issueDate = data.issue_date || data.issueDate;
    this.dueDate = data.due_date || data.dueDate;
    this.paymentTerms = data.payment_terms || data.paymentTerms || 30;
    this.items = data.items || [];
    this.subtotal = parseFloat(data.subtotal) || 0;
    this.taxRate = parseFloat(data.tax_rate || data.taxRate) || parseFloat(process.env.TAX_RATE || '0.08');
    this.taxAmount = parseFloat(data.tax_amount || data.taxAmount) || 0;
    this.discountAmount = parseFloat(data.discount_amount || data.discountAmount) || 0;
    this.total = parseFloat(data.total) || 0;
    this.currency = data.currency || process.env.CURRENCY || 'USD';
    this.notes = data.notes || '';
    this.templateId = data.template_id || data.templateId || 'default';
    this.pdfPath = data.pdf_path || data.pdfPath || '';
    this.sentAt = data.sent_at || data.sentAt;
    this.paidAt = data.paid_at || data.paidAt;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  static async generateInvoiceNumber() {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      const { rows } = await pool.query(
        'SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE $1',
        [`INV-${year}${month}-%`]
      );
      
      const count = parseInt(rows[0].count) + 1;
      return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
    } catch (error) {
      // Fallback to timestamp-based number
      return `INV-${Date.now()}`;
    }
  }

  static calculateDueDate(issueDate, paymentTerms) {
    const date = new Date(issueDate);
    date.setDate(date.getDate() + paymentTerms);
    return date.toISOString().split('T')[0];
  }

  static calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.rate)), 0);
  }

  static calculateTaxAmount(subtotal, taxRate) {
    return subtotal * parseFloat(taxRate);
  }

  static calculateTotal(subtotal, taxAmount, discountAmount = 0) {
    return subtotal + taxAmount - parseFloat(discountAmount || 0);
  }

  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM invoices';
      const conditions = [];
      const values = [];
      let paramCount = 1;

      if (filters.userId) {
        conditions.push(`user_id = $${paramCount++}`);
        values.push(filters.userId);
      }

      if (filters.clientId) {
        conditions.push(`client_id = $${paramCount++}`);
        values.push(filters.clientId);
      }

      if (filters.status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(filters.status);
      }

      if (filters.dateRange) {
        conditions.push(`issue_date >= $${paramCount++} AND issue_date <= $${paramCount++}`);
        values.push(filters.dateRange.start, filters.dateRange.end);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const { rows } = await pool.query(query, values);
      return rows.map(row => new Invoice(row));
    } catch (error) {
      logger.error('Error finding invoices:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM invoices WHERE id = $1',
        [id]
      );
      return rows.length > 0 ? new Invoice(rows[0]) : null;
    } catch (error) {
      logger.error('Error finding invoice by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    return await this.findAll({ userId });
  }

  static async findByClientId(clientId) {
    return await this.findAll({ clientId });
  }

  static async create(data) {
    try {
      // Calculate totals
      const subtotal = this.calculateSubtotal(data.items || []);
      const taxAmount = this.calculateTaxAmount(subtotal, data.taxRate || 0.08);
      const total = this.calculateTotal(subtotal, taxAmount, data.discountAmount);
      
      // Generate invoice number if not provided
      const invoiceNumber = data.invoiceNumber || await this.generateInvoiceNumber();
      
      // Calculate due date
      const dueDate = data.dueDate || this.calculateDueDate(data.issueDate, data.paymentTerms || 30);

      const { rows } = await pool.query(
        `INSERT INTO invoices (
          user_id, client_id, invoice_number, status, issue_date, due_date, 
          payment_terms, items, subtotal, tax_rate, tax_amount, discount_amount, 
          total, currency, notes, template_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          data.userId,
          data.clientId,
          invoiceNumber,
          data.status || 'draft',
          data.issueDate || new Date().toISOString().split('T')[0],
          dueDate,
          data.paymentTerms || 30,
          JSON.stringify(data.items || []),
          subtotal,
          data.taxRate || 0.08,
          taxAmount,
          data.discountAmount || 0,
          total,
          data.currency || 'USD',
          data.notes || null,
          data.templateId || 'default'
        ]
      );
      return new Invoice(rows[0]);
    } catch (error) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      // Handle items update with recalculation
      if (data.items) {
        const subtotal = this.calculateSubtotal(data.items);
        const taxRate = data.taxRate !== undefined ? parseFloat(data.taxRate) : undefined;
        const taxAmount = taxRate !== undefined ? this.calculateTaxAmount(subtotal, taxRate) : undefined;
        const discountAmount = data.discountAmount !== undefined ? parseFloat(data.discountAmount) : undefined;
        
        updates.push(`items = $${paramCount++}`);
        values.push(JSON.stringify(data.items));
        
        updates.push(`subtotal = $${paramCount++}`);
        values.push(subtotal);
        
        if (taxRate !== undefined) {
          updates.push(`tax_rate = $${paramCount++}`);
          values.push(taxRate);
          
          updates.push(`tax_amount = $${paramCount++}`);
          values.push(taxAmount);
        }
        
        if (discountAmount !== undefined) {
          updates.push(`discount_amount = $${paramCount++}`);
          values.push(discountAmount);
        }
        
        // Recalculate total (we'll need to fetch current values if not all provided)
        const currentInvoice = await this.findById(id);
        const currentTaxRate = taxRate !== undefined ? taxRate : currentInvoice.taxRate;
        const currentDiscountAmount = discountAmount !== undefined ? discountAmount : currentInvoice.discountAmount;
        const newTaxAmount = taxAmount !== undefined ? taxAmount : this.calculateTaxAmount(subtotal, currentTaxRate);
        const total = this.calculateTotal(subtotal, newTaxAmount, currentDiscountAmount);
        
        updates.push(`total = $${paramCount++}`);
        values.push(total);
      }

      const simpleFields = {
        client_id: data.clientId,
        status: data.status,
        issue_date: data.issueDate,
        due_date: data.dueDate,
        payment_terms: data.paymentTerms,
        currency: data.currency,
        notes: data.notes,
        template_id: data.templateId,
        pdf_path: data.pdfPath,
        sent_at: data.sentAt,
        paid_at: data.paidAt
      };

      Object.entries(simpleFields).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      });

      if (updates.length === 0) return null;

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      return rows.length > 0 ? new Invoice(rows[0]) : null;
    } catch (error) {
      logger.error('Error updating invoice:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM invoices WHERE id = $1',
        [id]
      );
      return rowCount > 0;
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      throw error;
    }
  }

  async getClient() {
    return await Client.findById(this.clientId);
  }

  async updateStatus(status) {
    const updateData = { status };
    
    if (status === 'sent' && !this.sentAt) {
      updateData.sentAt = new Date().toISOString();
    } else if (status === 'paid' && !this.paidAt) {
      updateData.paidAt = new Date().toISOString();
    }
    
    return await Invoice.update(this.id, updateData);
  }
}

// Template Model
export class Template {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.description = data.description || '';
    this.htmlContent = data.htmlContent;
    this.cssContent = data.cssContent || '';
    this.isDefault = data.isDefault || false;
    this.previewImage = data.previewImage || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static findAll() {
    return db.templates;
  }

  static findById(id) {
    return db.templates.find(template => template.id === id);
  }

  static findDefault() {
    return db.templates.find(template => template.isDefault) || db.templates[0];
  }

  static create(data) {
    const template = new Template(data);
    
    // If this is set as default, unset others
    if (template.isDefault) {
      db.templates.forEach(t => t.isDefault = false);
    }
    
    db.templates.push(template);
    return template;
  }

  static update(id, data) {
    const index = db.templates.findIndex(template => template.id === id);
    if (index === -1) return null;
    
    const updatedTemplate = new Template({
      ...db.templates[index],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    });
    
    // If this is set as default, unset others
    if (updatedTemplate.isDefault) {
      db.templates.forEach((t, i) => {
        if (i !== index) t.isDefault = false;
      });
    }
    
    db.templates[index] = updatedTemplate;
    return updatedTemplate;
  }

  static delete(id) {
    const index = db.templates.findIndex(template => template.id === id);
    if (index === -1) return false;
    
    db.templates.splice(index, 1);
    return true;
  }
}

// User Model (PostgreSQL-backed)
export class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password_hash || data.password;
    this.name = data.name;
    this.businessInfo = data.business_info || data.businessInfo || {};
    this.settings = data.settings || {};
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  static async findAll() {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      return rows.map(row => new User(row));
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, name, business_info, settings)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.email,
          data.password, // Should be hashed before calling this
          data.name,
          JSON.stringify(data.businessInfo || {}),
          JSON.stringify(data.settings || {})
        ]
      );
      return new User(rows[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (data.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(data.email);
      }
      if (data.password !== undefined) {
        updates.push(`password_hash = $${paramCount++}`);
        values.push(data.password);
      }
      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.businessInfo !== undefined) {
        updates.push(`business_info = $${paramCount++}`);
        values.push(JSON.stringify(data.businessInfo));
      }
      if (data.settings !== undefined) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(data.settings));
      }

      if (updates.length === 0) return null;

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );
      return rowCount > 0;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Get user's invoices
  async getInvoices() {
    return await Invoice.findByUserId(this.id);
  }

  // Get user's clients
  async getClients() {
    return await Client.findByUserId(this.id);
  }
}

// Initialize with default template if empty
if (db.templates.length === 0) {
  Template.create({
    id: 'default',
    name: 'Modern Professional',
    description: 'A clean, professional invoice template suitable for most businesses',
    isDefault: true,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{invoiceNumber}}</title>
    <style>
        {{{css}}}
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="business-info">
                <h1>{{businessName}}</h1>
                <p>{{businessAddress}}</p>
                <p>{{businessEmail}}</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
                <p><strong>Date:</strong> {{issueDate}}</p>
                <p><strong>Due Date:</strong> {{dueDate}}</p>
            </div>
        </div>

        <div class="client-info">
            <h3>Bill To:</h3>
            <div>
                <strong>{{client.name}}</strong><br>
                {{#if client.company}}{{client.company}}<br>{{/if}}
                {{#if client.address.street}}{{client.address.street}}<br>{{/if}}
                {{#if client.address.city}}{{client.address.city}}, {{client.address.state}} {{client.address.zip}}<br>{{/if}}
                {{client.email}}
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                {{#each items}}
                <tr>
                    <td>
                        <strong>{{this.description}}</strong>
                        {{#if this.details}}<br><small>{{this.details}}</small>{{/if}}
                    </td>
                    <td>{{this.quantity}}</td>
                    <td>{{currency}}{{this.rate}}</td>
                    <td>{{currency}}{{this.total}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>Subtotal:</span>
                <span>{{currency}}{{subtotal}}</span>
            </div>
            {{#if discountAmount}}
            <div class="totals-row">
                <span>Discount:</span>
                <span>-{{currency}}{{discountAmount}}</span>
            </div>
            {{/if}}
            <div class="totals-row">
                <span>Tax ({{taxRate}}%):</span>
                <span>{{currency}}{{taxAmount}}</span>
            </div>
            <div class="totals-row total">
                <span><strong>Total:</strong></span>
                <span><strong>{{currency}}{{total}}</strong></span>
            </div>
        </div>

        {{#if notes}}
        <div class="notes">
            <h4>Notes:</h4>
            <p>{{notes}}</p>
        </div>
        {{/if}}

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Payment Terms: {{paymentTerms}} days</p>
        </div>
    </div>
</body>
</html>
    `,
    cssContent: `
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .invoice-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eee;
        }

        .business-info h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
            font-size: 28px;
        }

        .invoice-info {
            text-align: right;
        }

        .invoice-info h2 {
            color: #3498db;
            margin: 0 0 15px 0;
            font-size: 36px;
            font-weight: 300;
        }

        .client-info {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 5px;
        }

        .client-info h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
        }

        .items-table th {
            background: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }

        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }

        .items-table tr:hover {
            background: #f8f9fa;
        }

        .totals {
            margin-left: auto;
            width: 300px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
        }

        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }

        .totals-row.total {
            border-top: 2px solid #3498db;
            margin-top: 15px;
            padding-top: 15px;
            font-size: 18px;
        }

        .notes {
            margin: 30px 0;
            padding: 20px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 5px;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
        }

        @media print {
            body { margin: 0; padding: 0; }
            .invoice-container { box-shadow: none; }
        }
    `
  });
}

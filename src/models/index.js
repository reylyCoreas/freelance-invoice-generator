import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// In-memory storage
export const db = {
  clients: [],
  invoices: [],
  templates: [],
  users: [] // For authentication
};

// Client Model
export class Client {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone || '';
    this.address = data.address || {};
    this.company = data.company || '';
    this.taxId = data.taxId || '';
    this.paymentTerms = data.paymentTerms || 30;
    this.currency = data.currency || 'USD';
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static findAll() {
    return db.clients;
  }

  static findById(id) {
    return db.clients.find(client => client.id === id);
  }

  static create(data) {
    const client = new Client(data);
    db.clients.push(client);
    return client;
  }

  static update(id, data) {
    const index = db.clients.findIndex(client => client.id === id);
    if (index === -1) return null;
    
    const updatedClient = new Client({
      ...db.clients[index],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    });
    
    db.clients[index] = updatedClient;
    return updatedClient;
  }

  static delete(id) {
    const index = db.clients.findIndex(client => client.id === id);
    if (index === -1) return false;
    
    db.clients.splice(index, 1);
    return true;
  }

  getInvoices() {
    return db.invoices.filter(invoice => invoice.clientId === this.id);
  }
}

// Invoice Model
export class Invoice {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.invoiceNumber = data.invoiceNumber || this.generateInvoiceNumber();
    this.clientId = data.clientId;
    this.status = data.status || 'draft'; // draft, sent, paid, overdue, cancelled
    this.issueDate = data.issueDate || new Date().toISOString().split('T')[0];
    this.dueDate = data.dueDate || this.calculateDueDate(data.paymentTerms || 30);
    this.paymentTerms = data.paymentTerms || 30;
    this.items = data.items || [];
    this.subtotal = data.subtotal || this.calculateSubtotal();
    this.taxRate = data.taxRate || parseFloat(process.env.TAX_RATE || '0.08');
    this.taxAmount = data.taxAmount || this.calculateTaxAmount();
    this.discountAmount = data.discountAmount || 0;
    this.total = data.total || this.calculateTotal();
    this.currency = data.currency || process.env.CURRENCY || 'USD';
    this.notes = data.notes || '';
    this.templateId = data.templateId || 'default';
    this.pdfPath = data.pdfPath || '';
    this.sentAt = data.sentAt || null;
    this.paidAt = data.paidAt || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = db.invoices.length + 1;
    return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
  }

  calculateDueDate(paymentTerms) {
    const issueDate = new Date(this.issueDate || new Date());
    issueDate.setDate(issueDate.getDate() + paymentTerms);
    return issueDate.toISOString().split('T')[0];
  }

  calculateSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  }

  calculateTaxAmount() {
    const subtotal = this.calculateSubtotal();
    return subtotal * this.taxRate;
  }

  calculateTotal() {
    const subtotal = this.calculateSubtotal();
    const taxAmount = subtotal * this.taxRate;
    return subtotal + taxAmount - (this.discountAmount || 0);
  }

  static findAll(filters = {}) {
    let invoices = db.invoices;
    
    if (filters.clientId) {
      invoices = invoices.filter(invoice => invoice.clientId === filters.clientId);
    }
    
    if (filters.status) {
      invoices = invoices.filter(invoice => invoice.status === filters.status);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      invoices = invoices.filter(invoice => {
        const issueDate = new Date(invoice.issueDate);
        return issueDate >= new Date(start) && issueDate <= new Date(end);
      });
    }

    return invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static findById(id) {
    return db.invoices.find(invoice => invoice.id === id);
  }

  static create(data) {
    const invoice = new Invoice(data);
    db.invoices.push(invoice);
    return invoice;
  }

  static update(id, data) {
    const index = db.invoices.findIndex(invoice => invoice.id === id);
    if (index === -1) return null;
    
    const updatedInvoice = new Invoice({
      ...db.invoices[index],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    });
    
    // Recalculate amounts if items changed
    if (data.items) {
      updatedInvoice.subtotal = updatedInvoice.calculateSubtotal();
      updatedInvoice.taxAmount = updatedInvoice.calculateTaxAmount();
      updatedInvoice.total = updatedInvoice.calculateTotal();
    }
    
    db.invoices[index] = updatedInvoice;
    return updatedInvoice;
  }

  static delete(id) {
    const index = db.invoices.findIndex(invoice => invoice.id === id);
    if (index === -1) return false;
    
    db.invoices.splice(index, 1);
    return true;
  }

  getClient() {
    return Client.findById(this.clientId);
  }

  updateStatus(status) {
    this.status = status;
    this.updatedAt = new Date().toISOString();
    
    if (status === 'sent' && !this.sentAt) {
      this.sentAt = new Date().toISOString();
    } else if (status === 'paid' && !this.paidAt) {
      this.paidAt = new Date().toISOString();
    }
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

// User Model (for authentication)
export class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.password = data.password; // Will be hashed
    this.name = data.name;
    this.businessInfo = data.businessInfo || {};
    this.settings = data.settings || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static findAll() {
    return db.users;
  }

  static findById(id) {
    return db.users.find(user => user.id === id);
  }

  static findByEmail(email) {
    return db.users.find(user => user.email === email);
  }

  static create(data) {
    const user = new User(data);
    db.users.push(user);
    return user;
  }

  static update(id, data) {
    const index = db.users.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    const updatedUser = new User({
      ...db.users[index],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    });
    
    db.users[index] = updatedUser;
    return updatedUser;
  }

  static delete(id) {
    const index = db.users.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    db.users.splice(index, 1);
    return true;
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

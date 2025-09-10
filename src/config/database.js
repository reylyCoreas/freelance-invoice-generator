import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

// Database configuration
const dbConfig = {
  // Railway automatically provides DATABASE_URL in production
  connectionString: process.env.DATABASE_URL,
  // Local development fallback
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'invoice_generator',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Database connection test
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connected successfully', { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables
export const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_info JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        tax_id VARCHAR(100),
        address JSONB DEFAULT '{}',
        payment_terms INTEGER DEFAULT 30,
        currency VARCHAR(10) DEFAULT 'USD',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        payment_terms INTEGER DEFAULT 30,
        items JSONB NOT NULL DEFAULT '[]',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
        tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        notes TEXT,
        template_id VARCHAR(100) DEFAULT 'default',
        pdf_path VARCHAR(500),
        sent_at TIMESTAMP,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        html_content TEXT NOT NULL,
        css_content TEXT DEFAULT '',
        is_default BOOLEAN DEFAULT FALSE,
        preview_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date)');
    
    // Triggers to update updated_at automatically
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    const tables = ['users', 'clients', 'invoices', 'templates'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    logger.info('✅ Database tables initialized successfully');
    
    // Insert default template if it doesn't exist
    await insertDefaultTemplate(client);
    
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Insert default template
const insertDefaultTemplate = async (client) => {
  try {
    const { rows } = await client.query('SELECT id FROM templates WHERE id = $1', ['default']);
    
    if (rows.length === 0) {
      await client.query(`
        INSERT INTO templates (id, name, description, is_default, html_content, css_content)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'default',
        'Modern Professional',
        'A clean, professional invoice template suitable for most businesses',
        true,
        getDefaultTemplate().html,
        getDefaultTemplate().css
      ]);
      
      logger.info('✅ Default template inserted');
    }
  } catch (error) {
    logger.error('Failed to insert default template:', error);
  }
};

// Default template content
const getDefaultTemplate = () => ({
  html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{invoiceNumber}}</title>
    <style>{{{css}}}</style>
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
                    <td>{{currency}}{{multiply this.quantity this.rate}}</td>
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
                <span>Tax ({{multiply taxRate 100}}%):</span>
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
</html>`,
  css: `body {
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
}`
});

// Graceful shutdown
export const closePool = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

export default pool;

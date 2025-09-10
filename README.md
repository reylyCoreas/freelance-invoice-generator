# Freelance Invoice Generator

A powerful tool for creating professional invoices for freelance websites and platforms.

## Overview

This tool simplifies the process of generating invoices for freelance work by providing:
- Professional invoice templates
- Support for multiple freelance platforms
- Customizable invoice formats
- Client and project management
- Tax calculation capabilities
- Export to various formats (PDF, HTML, etc.)

## Features

- 🧾 **Multiple Invoice Templates**: Choose from professional, modern designs
- 🏢 **Multi-Platform Support**: Works with popular freelance websites
- 💰 **Tax Calculations**: Automatic tax computation based on location
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 📄 **Export Options**: Generate PDFs, HTML, and printable formats
- 🔄 **Recurring Invoices**: Set up automatic recurring billing
- 📊 **Analytics**: Track your invoicing patterns and earnings

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd freelance-invoice-generator

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Usage

1. **Configure Your Business Information**
   - Set up your business details in the configuration
   - Add your logo and branding

2. **Create Client Profiles**
   - Add client information
   - Set default rates and terms

3. **Generate Invoices**
   - Select a template
   - Fill in project details
   - Generate and export your invoice

## Project Structure

```
# Freelance Invoice Generator

A comprehensive, full-stack invoice management system built with Node.js, Express, and modern web technologies. Create, manage, and send professional invoices with PDF generation, email functionality, and user authentication.

## 🌟 Features

### Core Functionality
- **Invoice Management**: Create, edit, view, and delete invoices with automatic calculations
- **Client Management**: Comprehensive client database with contact information and invoice history  
- **Template System**: Customizable invoice templates with Handlebars and CSS styling
- **PDF Generation**: High-quality PDF invoices using Puppeteer with professional formatting
- **Email Integration**: Send invoices directly to clients with PDF attachments
- **User Authentication**: JWT-based secure authentication system
- **Dashboard Analytics**: Real-time statistics and insights

### Advanced Features
- **Dynamic Calculations**: Automatic tax, discount, and total calculations
- **Status Tracking**: Track invoice status (draft, sent, paid, overdue, cancelled)
- **Template Preview**: Preview and test invoice templates before use
- **Responsive Design**: Modern, mobile-friendly web interface
- **API-First Architecture**: Complete RESTful API for all operations
- **Validation & Security**: Comprehensive input validation and security measures

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Modern web browser

### Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd freelance-invoice-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - API Endpoints: http://localhost:3000/api
   - Health Check: http://localhost:3000/health

## 📖 Usage

### Web Interface
1. **Registration/Login**: Create an account or log in to access the system
2. **Dashboard**: View statistics and quick actions
3. **Clients**: Add and manage your client database
4. **Invoices**: Create, edit, and manage invoices with line items
5. **Templates**: View and preview available invoice templates

### Creating Your First Invoice
1. Add a client (Clients → New Client)
2. Create invoice (Dashboard → Create New Invoice or Invoices → New Invoice)
3. Fill in invoice details and line items
4. Generate PDF or send via email
5. Track payment status

## 🎯 Completed Features

✅ **Database Layer**: In-memory storage with full CRUD operations  
✅ **Client Management**: Complete client lifecycle with statistics  
✅ **Invoice System**: Full invoice creation with line items and calculations  
✅ **Template Engine**: Handlebars-based templating with CSS styling  
✅ **PDF Generation**: Puppeteer-powered PDF creation  
✅ **Email Service**: Nodemailer integration with attachments  
✅ **Authentication**: JWT-based user authentication and authorization  
✅ **Frontend Interface**: Modern web interface with Tailwind CSS  
✅ **API Validation**: Comprehensive Joi validation schemas  
✅ **Security**: Rate limiting, input sanitization, and secure headers

## 🏗️ Architecture

The system follows a clean, modular architecture with separation of concerns:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external integrations
- **Models**: Define data structures and in-memory storage
- **Middleware**: Handle authentication, validation, and error processing
- **Routes**: Define API endpoints with proper validation
- **Frontend**: Single-page application with API integration
├── src/                    # Source code
├── templates/              # Invoice templates
├── assets/                 # Static assets (logos, images)
├── tests/                  # Test files
├── docs/                   # Documentation
└── README.md              # This file
```

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Configuration

Create a `.env` file in the root directory with your configuration:

```env
# Business Information
BUSINESS_NAME="Your Business Name"
BUSINESS_EMAIL="your-email@example.com"
BUSINESS_ADDRESS="Your Business Address"

# Tax Settings
TAX_RATE=0.08
CURRENCY="USD"

# Export Settings
DEFAULT_EXPORT_FORMAT="PDF"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
- Check the [documentation](docs/)
- Open an issue on GitHub
- Contact support at [your-email@example.com]

## Roadmap

- [ ] Integration with popular freelance platforms APIs
- [ ] Multi-currency support
- [ ] Advanced reporting and analytics
- [ ] Mobile app version
- [ ] Cloud storage integration
- [ ] Team collaboration features

---

Built with ❤️ for freelancers worldwide

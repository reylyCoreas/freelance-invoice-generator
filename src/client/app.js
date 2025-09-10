// Client-side application entry point
// This file contains only browser-compatible code

class InvoiceApp {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        // Initialize the application
        console.log('Invoice Generator App initialized');
        this.bindEvents();
        this.loadDashboardData();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
                this.updateActiveNav(e.target);
            });
        });

        // Modal controls
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // Auth buttons
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.showModal('login-modal');
        });
        
        document.getElementById('register-btn')?.addEventListener('click', () => {
            this.showModal('register-modal');
        });

        // Form submissions
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e.target);
        });

        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e.target);
        });

        // Quick actions
        document.querySelectorAll('.create-invoice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showModal('create-invoice-modal');
            });
        });

        document.querySelectorAll('.create-client-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showModal('create-client-modal');
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show target section
        document.getElementById(sectionId)?.classList.remove('hidden');

        // Load section-specific data
        switch(sectionId) {
            case 'invoices':
                this.loadInvoices();
                break;
            case 'clients':
                this.loadClients();
                break;
            case 'templates':
                this.loadTemplates();
                break;
            default:
                this.loadDashboardData();
        }
    }

    updateActiveNav(activeBtn) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('nav-active');
        });
        activeBtn.classList.add('nav-active');
    }

    showModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    closeModals() {
        document.querySelectorAll('[id$="-modal"]').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    async handleLogin(form) {
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Login successful!', 'success');
                this.closeModals();
                this.updateAuthState(result.user, result.token);
            } else {
                this.showToast(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister(form) {
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Registration successful!', 'success');
                this.closeModals();
                this.updateAuthState(result.user, result.token);
            } else {
                this.showToast(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Registration failed. Please try again.', 'error');
        }
    }

    updateAuthState(user, token) {
        if (token) {
            localStorage.setItem('authToken', token);
        }
        
        document.getElementById('auth-buttons').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-name').textContent = user.name;
    }

    async loadDashboardData() {
        try {
            const [invoices, clients] = await Promise.all([
                this.fetchData('/invoices'),
                this.fetchData('/clients')
            ]);

            document.getElementById('total-invoices').textContent = invoices.length || 0;
            document.getElementById('total-clients').textContent = clients.length || 0;
            
            const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
            document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
            
            const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
            document.getElementById('pending-invoices').textContent = pendingInvoices;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadInvoices() {
        try {
            const invoices = await this.fetchData('/invoices');
            this.renderInvoicesTable(invoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
        }
    }

    async loadClients() {
        try {
            const clients = await this.fetchData('/clients');
            this.renderClientsGrid(clients);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }

    async loadTemplates() {
        try {
            const templates = await this.fetchData('/templates');
            this.renderTemplatesGrid(templates);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    async fetchData(endpoint) {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${this.apiBase}${endpoint}`, { headers });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}`);
        }
        
        return response.json();
    }

    renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoices-table');
        if (!tbody) return;

        tbody.innerHTML = invoices.map(invoice => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${invoice.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invoice.client?.name || 'Unknown'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${invoice.total?.toFixed(2) || '0.00'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(invoice.status)}">
                        ${invoice.status || 'pending'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(invoice.createdAt).toLocaleDateString()}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-blue-600 hover:text-blue-900 mr-2">View</button>
                    <button class="text-green-600 hover:text-green-900 mr-2">PDF</button>
                    <button class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderClientsGrid(clients) {
        const grid = document.getElementById('clients-grid');
        if (!grid) return;

        grid.innerHTML = clients.map(client => `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${client.name}</h3>
                <p class="text-gray-600 mb-2">${client.company || 'No company'}</p>
                <p class="text-sm text-gray-500 mb-4">${client.email}</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500">${client.invoiceCount || 0} invoices</span>
                    <div class="space-x-2">
                        <button class="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderTemplatesGrid(templates) {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;

        grid.innerHTML = templates.map(template => `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${template.name}</h3>
                <p class="text-gray-600 mb-4">${template.description || 'No description'}</p>
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-500">Template</span>
                    <div class="space-x-2">
                        <button class="text-blue-600 hover:text-blue-800 text-sm">Preview</button>
                        <button class="text-green-600 hover:text-green-800 text-sm">Use</button>
                        <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusColor(status) {
        switch(status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 
            type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InvoiceApp();
});

export default InvoiceApp;

// Invoice Generator Frontend Application
class InvoiceApp {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.currentSection = 'dashboard';
        
        this.init();
    }

    async init() {
        this.bindEvents();
        
        // Check if user is already logged in
        if (this.token) {
            try {
                await this.checkAuth();
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        }
        
        this.updateAuthUI();
        await this.loadDashboardData();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Auth buttons
        document.getElementById('login-btn')?.addEventListener('click', () => this.showModal('login-modal'));
        document.getElementById('register-btn')?.addEventListener('click', () => this.showModal('register-modal'));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                this.hideModal(modal.id);
            });
        });

        // Form submissions
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('create-client-form')?.addEventListener('submit', (e) => this.handleCreateClient(e));
        document.getElementById('create-invoice-form')?.addEventListener('submit', (e) => this.handleCreateInvoice(e));

        // Quick action buttons
        document.querySelectorAll('.create-invoice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showCreateInvoice());
        });
        document.querySelectorAll('.create-client-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showModal('create-client-modal'));
        });
        document.querySelectorAll('.view-templates-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showSection('templates'));
        });

        // Invoice form interactions
        this.bindInvoiceFormEvents();
    }

    bindInvoiceFormEvents() {
        // Add item button
        document.getElementById('add-item')?.addEventListener('click', () => {
            this.addInvoiceItem();
        });

        // Calculate totals when items change
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[name="quantity"], input[name="rate"]')) {
                this.calculateItemTotal(e.target.closest('.invoice-item'));
            }
        });

        // Remove item
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-item, .remove-item *')) {
                const item = e.target.closest('.invoice-item');
                const container = document.getElementById('invoice-items');
                if (container.children.length > 1) {
                    item.remove();
                }
            }
        });
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(el => {
            el.classList.add('hidden');
        });

        // Show target section
        document.getElementById(section)?.classList.remove('hidden');

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('nav-active');
        });
        document.querySelector(`[data-section="${section}"]`)?.classList.add('nav-active');

        this.currentSection = section;

        // Load section data
        this.loadSectionData(section);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'invoices':
                await this.loadInvoices();
                break;
            case 'clients':
                await this.loadClients();
                break;
            case 'templates':
                await this.loadTemplates();
                break;
        }
    }

    showModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
        // Clear form data
        const form = document.querySelector(`#${modalId} form`);
        if (form) form.reset();
    }

    showLoading() {
        document.getElementById('loading-overlay')?.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-yellow-500'
        }[type] || 'bg-blue-500';

        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg fade-in`;
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toast.querySelector('button').addEventListener('click', () => toast.remove());

        document.getElementById('toast-container').appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    async apiRequest(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    async checkAuth() {
        try {
            const response = await this.apiRequest('/auth/check');
            this.currentUser = response.user;
            return true;
        } catch (error) {
            this.token = null;
            localStorage.removeItem('token');
            throw error;
        }
    }

    updateAuthUI() {
        const userInfo = document.getElementById('user-info');
        const authButtons = document.getElementById('auth-buttons');
        const userName = document.getElementById('user-name');

        if (this.currentUser) {
            userInfo?.classList.remove('hidden');
            authButtons?.classList.add('hidden');
            if (userName) userName.textContent = this.currentUser.name;
        } else {
            userInfo?.classList.add('hidden');
            authButtons?.classList.remove('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        try {
            this.showLoading();
            
            const response = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: formData.get('email'),
                    password: formData.get('password')
                })
            });

            this.token = response.data.token;
            this.currentUser = response.data.user;
            localStorage.setItem('token', this.token);
            
            this.hideModal('login-modal');
            this.updateAuthUI();
            this.showToast('Login successful!', 'success');
            
            await this.loadDashboardData();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        try {
            this.showLoading();
            
            const response = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    password: formData.get('password')
                })
            });

            this.token = response.data.token;
            this.currentUser = response.data.user;
            localStorage.setItem('token', this.token);
            
            this.hideModal('register-modal');
            this.updateAuthUI();
            this.showToast('Registration successful!', 'success');
            
            await this.loadDashboardData();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'info');
        this.showSection('dashboard');
    }

    async loadDashboardData() {
        try {
            const [invoicesResponse, clientsResponse] = await Promise.allSettled([
                this.apiRequest('/invoices'),
                this.apiRequest('/clients')
            ]);

            let invoices = [];
            let clients = [];

            if (invoicesResponse.status === 'fulfilled') {
                invoices = invoicesResponse.value.data || [];
            }
            if (clientsResponse.status === 'fulfilled') {
                clients = clientsResponse.value.data || [];
            }

            // Update stats
            document.getElementById('total-invoices').textContent = invoices.length;
            document.getElementById('total-clients').textContent = clients.length;
            
            const totalRevenue = invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + inv.total, 0);
            document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
            
            const pendingInvoices = invoices.filter(inv => ['sent', 'overdue'].includes(inv.status)).length;
            document.getElementById('pending-invoices').textContent = pendingInvoices;

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadInvoices() {
        try {
            const response = await this.apiRequest('/invoices');
            const invoices = response.data || [];
            
            const tableBody = document.getElementById('invoices-table');
            tableBody.innerHTML = '';

            if (invoices.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                            <i class="fas fa-file-invoice text-4xl mb-4 block"></i>
                            No invoices found. Create your first invoice to get started!
                        </td>
                    </tr>
                `;
                return;
            }

            invoices.forEach(invoice => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const statusColors = {
                    draft: 'bg-gray-100 text-gray-800',
                    sent: 'bg-blue-100 text-blue-800',
                    paid: 'bg-green-100 text-green-800',
                    overdue: 'bg-red-100 text-red-800',
                    cancelled: 'bg-gray-100 text-gray-800'
                };

                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${invoice.invoiceNumber}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.client ? invoice.client.name : 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        $${invoice.total.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[invoice.status]}">
                            ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-900" onclick="app.viewInvoice('${invoice.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-green-600 hover:text-green-900" onclick="app.downloadPDF('${invoice.id}')">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="text-purple-600 hover:text-purple-900" onclick="app.emailInvoice('${invoice.id}')">
                                <i class="fas fa-envelope"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to load invoices:', error);
            this.showToast('Failed to load invoices', 'error');
        }
    }

    async loadClients() {
        try {
            const response = await this.apiRequest('/clients');
            const clients = response.data || [];
            
            const grid = document.getElementById('clients-grid');
            grid.innerHTML = '';

            if (clients.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <i class="fas fa-users text-4xl text-gray-400 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                        <p class="text-gray-500 mb-4">Add your first client to start creating invoices.</p>
                        <button class="create-client-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <i class="fas fa-plus mr-2"></i>Add Client
                        </button>
                    </div>
                `;
                return;
            }

            clients.forEach(client => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow';
                
                const stats = client.stats || {};
                
                card.innerHTML = `
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900">${client.name}</h3>
                            ${client.company ? `<p class="text-sm text-gray-600">${client.company}</p>` : ''}
                            <p class="text-sm text-gray-600">${client.email}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-900" onclick="app.editClient('${client.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-500">Total Invoices</p>
                            <p class="font-semibold">${stats.totalInvoices || 0}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Total Amount</p>
                            <p class="font-semibold">$${(stats.totalAmount || 0).toFixed(2)}</p>
                        </div>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Failed to load clients:', error);
            this.showToast('Failed to load clients', 'error');
        }
    }

    async loadTemplates() {
        try {
            const response = await this.apiRequest('/templates');
            const templates = response.data || [];
            
            const grid = document.getElementById('templates-grid');
            grid.innerHTML = '';

            templates.forEach(template => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow';
                
                card.innerHTML = `
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">${template.name}</h3>
                        <p class="text-sm text-gray-600">${template.description}</p>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-2">
                            ${template.isDefault ? '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Default</span>' : ''}
                        </div>
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-900" onclick="app.previewTemplate('${template.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="text-purple-600 hover:text-purple-900" onclick="app.editTemplate('${template.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                grid.appendChild(card);
            });
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.showToast('Failed to load templates', 'error');
        }
    }

    async showCreateInvoice() {
        try {
            // Load clients for the dropdown
            const response = await this.apiRequest('/clients');
            const clients = response.data || [];
            
            const clientSelect = document.querySelector('#create-invoice-form select[name="clientId"]');
            clientSelect.innerHTML = '<option value="">Select a client</option>';
            
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} ${client.company ? `(${client.company})` : ''}`;
                clientSelect.appendChild(option);
            });
            
            // Set default due date (30 days from now)
            const dueDateInput = document.querySelector('#create-invoice-form input[name="dueDate"]');
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 30);
            dueDateInput.value = defaultDueDate.toISOString().split('T')[0];
            
            this.showModal('create-invoice-modal');
        } catch (error) {
            this.showToast('Failed to load clients for invoice creation', 'error');
        }
    }

    async handleCreateClient(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        try {
            this.showLoading();
            
            await this.apiRequest('/clients', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    company: formData.get('company'),
                    phone: formData.get('phone')
                })
            });
            
            this.hideModal('create-client-modal');
            this.showToast('Client created successfully!', 'success');
            
            if (this.currentSection === 'clients') {
                await this.loadClients();
            }
            await this.loadDashboardData();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleCreateInvoice(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        try {
            this.showLoading();
            
            // Collect invoice items
            const items = [];
            document.querySelectorAll('.invoice-item').forEach(item => {
                const description = item.querySelector('input[name="description"]').value;
                const quantity = parseFloat(item.querySelector('input[name="quantity"]').value);
                const rate = parseFloat(item.querySelector('input[name="rate"]').value);
                
                if (description && quantity && rate) {
                    items.push({
                        description,
                        quantity,
                        rate
                    });
                }
            });
            
            if (items.length === 0) {
                throw new Error('Please add at least one invoice item');
            }
            
            await this.apiRequest('/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    clientId: formData.get('clientId'),
                    dueDate: formData.get('dueDate'),
                    items: items,
                    notes: formData.get('notes')
                })
            });
            
            this.hideModal('create-invoice-modal');
            this.showToast('Invoice created successfully!', 'success');
            
            if (this.currentSection === 'invoices') {
                await this.loadInvoices();
            }
            await this.loadDashboardData();
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    addInvoiceItem() {
        const container = document.getElementById('invoice-items');
        const newItem = document.createElement('div');
        newItem.className = 'invoice-item grid grid-cols-12 gap-2 mb-2';
        newItem.innerHTML = `
            <div class="col-span-5">
                <input type="text" name="description" placeholder="Description" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            </div>
            <div class="col-span-2">
                <input type="number" name="quantity" placeholder="Qty" min="1" value="1" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            </div>
            <div class="col-span-2">
                <input type="number" name="rate" placeholder="Rate" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            </div>
            <div class="col-span-2">
                <input type="text" readonly placeholder="Total" class="item-total w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50">
            </div>
            <div class="col-span-1">
                <button type="button" class="remove-item w-full px-2 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(newItem);
    }

    calculateItemTotal(itemElement) {
        const quantity = parseFloat(itemElement.querySelector('input[name="quantity"]').value) || 0;
        const rate = parseFloat(itemElement.querySelector('input[name="rate"]').value) || 0;
        const total = quantity * rate;
        
        itemElement.querySelector('.item-total').value = total.toFixed(2);
    }

    async downloadPDF(invoiceId) {
        try {
            window.open(`${this.baseURL}/api/invoices/${invoiceId}/generate-pdf?download=true`, '_blank');
        } catch (error) {
            this.showToast('Failed to download PDF', 'error');
        }
    }

    async viewInvoice(invoiceId) {
        try {
            window.open(`${this.baseURL}/api/invoices/${invoiceId}/preview?format=html`, '_blank');
        } catch (error) {
            this.showToast('Failed to view invoice', 'error');
        }
    }

    async previewTemplate(templateId) {
        try {
            window.open(`${this.baseURL}/api/templates/${templateId}/preview`, '_blank');
        } catch (error) {
            this.showToast('Failed to preview template', 'error');
        }
    }

    async emailInvoice(invoiceId) {
        // This would typically open an email modal with options
        this.showToast('Email functionality not implemented in this demo', 'info');
    }

    editClient(clientId) {
        this.showToast('Client editing not implemented in this demo', 'info');
    }

    editTemplate(templateId) {
        this.showToast('Template editing not implemented in this demo', 'info');
    }
}

// Initialize the application
const app = new InvoiceApp();

'use strict';

(() => {
    const STORAGE_KEY = 'glasspro_customers';

    let customers = [];
    let editingCustomerId = null;

    const $ = (id) => document.getElementById(id);

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function loadCustomers() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            customers = saved ? JSON.parse(saved) : [];

            if (!Array.isArray(customers)) {
                customers = [];
            }
        } catch (error) {
            console.error('Unable to load customers:', error);
            customers = [];
        }
    }

    function saveCustomers() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
            return true;
        } catch (error) {
            console.error('Unable to save customers:', error);
            window.showToast?.('Unable to save customer records.', 'error');
            return false;
        }
    }

    function createId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return 'customer-' + Date.now() + '-' +
            Math.random().toString(36).slice(2, 9);
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(Number(amount) || 0);
    }

    function formatDate(value) {
        if (!value) return '—';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return '—';

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function renderStatistics() {
        const individuals = customers.filter(
            customer => customer.type === 'individual'
        ).length;

        const businesses = customers.filter(
            customer => customer.type === 'business'
        ).length;

        const outstanding = customers.reduce(
            (total, customer) =>
                total + Math.max(0, Number(customer.outstandingBalance) || 0),
            0
        );

        if ($('customerTotal')) {
            $('customerTotal').textContent = customers.length;
        }

        if ($('customerIndividual')) {
            $('customerIndividual').textContent = individuals;
        }

        if ($('customerBusiness')) {
            $('customerBusiness').textContent = businesses;
        }

        if ($('customerOutstanding')) {
            $('customerOutstanding').textContent = formatMoney(outstanding);
        }

        if ($('totalCustomers')) {
            $('totalCustomers').textContent = customers.length;
        }
    }

    function renderTable() {
        const tbody = $('customersTableBody');
        if (!tbody) return;

        const search = ($('customerSearch')?.value || '')
            .trim()
            .toLowerCase();

        const typeFilter = $('customerTypeFilter')?.value || '';

        const filtered = customers.filter(customer => {
            const searchable = [
                customer.name,
                customer.contactPerson,
                customer.phone,
                customer.email,
                customer.code,
                customer.address
            ].join(' ').toLowerCase();

            const matchesSearch = searchable.includes(search);
            const matchesType = !typeFilter || customer.type === typeFilter;

            return matchesSearch && matchesType;
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        ${customers.length
                            ? 'No customers match your search.'
                            : 'No customers registered yet. Click Add Customer to get started.'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(customer => {
            const typeLabel = customer.type === 'business'
                ? 'Business'
                : 'Individual';

            const purchases = Number(customer.totalPurchases) || 0;
            const outstanding = Number(customer.outstandingBalance) || 0;

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(customer.name)}</strong>
                        <div class="table-subtext">
                            ${escapeHTML(customer.code || '')}
                        </div>
                    </td>
                    <td>${escapeHTML(customer.phone || '—')}</td>
                    <td>${escapeHTML(customer.email || '—')}</td>
                    <td>
                        <span class="status-badge ${
                            customer.type === 'business'
                                ? 'status-pending'
                                : 'status-completed'
                        }">
                            ${typeLabel}
                        </span>
                    </td>
                    <td>${formatMoney(purchases)}</td>
                    <td>
                        <strong>${formatMoney(outstanding)}</strong>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button type="button"
                                    class="btn-small"
                                    data-action="edit-customer"
                                    data-id="${escapeHTML(customer.id)}">
                                Edit
                            </button>
                            <button type="button"
                                    class="btn-small btn-danger"
                                    data-action="delete-customer"
                                    data-id="${escapeHTML(customer.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderCustomers() {
        renderStatistics();
        renderTable();
    }

    function openCustomerModal(customer = null) {
        editingCustomerId = customer?.id || null;

        const isEditing = Boolean(customer);

        const overlay = $('modalOverlay');
        const title = $('modalTitle');
        const subtitle = $('modalSubtitle');
        const body = $('modalBody');
        const footer = $('modalFooter');

        if (!overlay || !title || !body || !footer) {
            window.showToast?.('The customer form could not be opened.', 'error');
            return;
        }

        title.textContent = isEditing ? 'Edit Customer' : 'Add New Customer';

        if (subtitle) {
            subtitle.textContent = isEditing
                ? 'Update the customer information below.'
                : 'Enter the details of the new customer.';
        }

        body.innerHTML = `
            <form id="customerForm">
                <div class="form-grid">

                    <div class="form-group">
                        <label for="customerType">Customer Type *</label>
                        <select id="customerType" required>
                            <option value="individual"
                                ${customer?.type === 'individual' ? 'selected' : ''}>
                                Individual Customer
                            </option>
                            <option value="business"
                                ${customer?.type === 'business' ? 'selected' : ''}>
                                Business Customer
                            </option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="customerName">
                            <span id="customerNameLabel">
                                ${customer?.type === 'business'
                                    ? 'Business Name'
                                    : 'Customer Name'}
                            </span> *
                        </label>
                        <input type="text"
                               id="customerName"
                               maxlength="150"
                               required
                               value="${escapeHTML(customer?.name || '')}"
                               placeholder="Enter name">
                    </div>

                    <div class="form-group">
                        <label for="customerContactPerson">
                            Contact Person
                        </label>
                        <input type="text"
                               id="customerContactPerson"
                               maxlength="120"
                               value="${escapeHTML(customer?.contactPerson || '')}"
                               placeholder="Contact person (optional)">
                    </div>

                    <div class="form-group">
                        <label for="customerPhone">Phone Number *</label>
                        <input type="tel"
                               id="customerPhone"
                               maxlength="40"
                               required
                               value="${escapeHTML(customer?.phone || '')}"
                               placeholder="Enter phone number">
                    </div>

                    <div class="form-group">
                        <label for="customerEmail">Email Address</label>
                        <input type="email"
                               id="customerEmail"
                               maxlength="150"
                               value="${escapeHTML(customer?.email || '')}"
                               placeholder="Enter email address">
                    </div>

                    <div class="form-group">
                        <label for="customerOpeningBalance">
                            Opening Outstanding Balance (₦)
                        </label>
                        <input type="number"
                               id="customerOpeningBalance"
                               min="0"
                               step="0.01"
                               value="${Number(customer?.outstandingBalance) || 0}"
                               placeholder="0.00">
                        <small>
                            Enter an existing unpaid amount, if applicable.
                        </small>
                    </div>

                    <div class="form-group full-width">
                        <label for="customerAddress">Address</label>
                        <textarea id="customerAddress"
                                  rows="3"
                                  maxlength="500"
                                  placeholder="Enter customer address">${escapeHTML(customer?.address || '')}</textarea>
                    </div>

                    <div class="form-group full-width">
                        <label for="customerNotes">Additional Notes</label>
                        <textarea id="customerNotes"
                                  rows="3"
                                  maxlength="1000"
                                  placeholder="Optional customer notes">${escapeHTML(customer?.notes || '')}</textarea>
                    </div>

                </div>
            </form>
        `;

        footer.innerHTML = `
            <button type="button"
                    class="btn btn-secondary"
                    id="customerFormCancel">
                Cancel
            </button>
            <button type="submit"
                    form="customerForm"
                    class="btn btn-primary">
                ${isEditing ? 'Save Changes' : 'Save Customer'}
            </button>
        `;

        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        $('customerType')?.addEventListener('change', updateCustomerNameLabel);

        $('customerFormCancel')?.addEventListener('click', closeCustomerModal);

        $('customerForm')?.addEventListener('submit', saveCustomer);

        setTimeout(() => $('customerName')?.focus(), 50);
    }

    function updateCustomerNameLabel() {
        const type = $('customerType')?.value;
        const label = $('customerNameLabel');

        if (label) {
            label.textContent = type === 'business'
                ? 'Business Name'
                : 'Customer Name';
        }
    }

    function closeCustomerModal() {
        const overlay = $('modalOverlay');

        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }

        editingCustomerId = null;
    }

    function saveCustomer(event) {
        event.preventDefault();

        const type = $('customerType')?.value;
        const name = $('customerName')?.value.trim();
        const phone = $('customerPhone')?.value.trim();
        const email = $('customerEmail')?.value.trim();
        const balance = Number($('customerOpeningBalance')?.value || 0);

        if (!name || !phone) {
            window.showToast?.('Please enter the customer name and phone number.', 'error');
            return;
        }

        if (!['individual', 'business'].includes(type)) {
            window.showToast?.('Please select a valid customer type.', 'error');
            return;
        }

        if (!Number.isFinite(balance) || balance < 0) {
            window.showToast?.('Enter a valid outstanding balance.', 'error');
            return;
        }

        const duplicate = customers.find(customer =>
            customer.id !== editingCustomerId &&
            customer.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
        );

        if (duplicate) {
            window.showToast?.('A customer with this phone number already exists.', 'error');
            return;
        }

        const existing = customers.find(
            customer => customer.id === editingCustomerId
        );

        const customerData = {
            id: editingCustomerId || createId(),
            code: existing?.code || (
                'CUS-' + Date.now().toString().slice(-8)
            ),
            type,
            name,
            contactPerson: $('customerContactPerson')?.value.trim() || '',
            phone,
            email,
            address: $('customerAddress')?.value.trim() || '',
            notes: $('customerNotes')?.value.trim() || '',
            outstandingBalance: balance,
            totalPurchases: Number(existing?.totalPurchases) || 0,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingCustomerId) {
            customers = customers.map(customer =>
                customer.id === editingCustomerId
                    ? customerData
                    : customer
            );
        } else {
            customers.unshift(customerData);
        }

        if (!saveCustomers()) return;

        closeCustomerModal();
        renderCustomers();

        window.showToast?.(
            editingCustomerId
                ? 'Customer updated successfully.'
                : 'Customer added successfully.',
            'success'
        );

        editingCustomerId = null;
    }

    function editCustomer(id) {
        const customer = customers.find(item => item.id === id);

        if (!customer) {
            window.showToast?.('Customer record not found.', 'error');
            return;
        }

        openCustomerModal(customer);
    }

    function deleteCustomer(id) {
        const customer = customers.find(item => item.id === id);

        if (!customer) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete ${customer.name}?`
        );

        if (!confirmed) return;

        customers = customers.filter(item => item.id !== id);

        if (!saveCustomers()) return;

        renderCustomers();

        window.showToast?.('Customer deleted successfully.', 'success');
    }

    function handleActions(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === 'new-customer') {
            openCustomerModal();
        }

        if (action === 'edit-customer' && id) {
            editCustomer(id);
        }

        if (action === 'delete-customer' && id) {
            deleteCustomer(id);
        }
    }

    function initialize() {
        loadCustomers();
        renderCustomers();

        document.addEventListener('click', handleActions);

        $('customerSearch')?.addEventListener('input', renderTable);
        $('customerTypeFilter')?.addEventListener('change', renderTable);

        document.addEventListener('pageChanged', (event) => {
            if (event.detail?.page === 'customers') {
                renderCustomers();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();

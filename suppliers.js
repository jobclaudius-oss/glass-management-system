'use strict';

(() => {
    const STORAGE_KEY = 'glasspro_suppliers';
    const $ = id => document.getElementById(id);

    let suppliers = [];

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function readSuppliers() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function saveSuppliers() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
            return true;
        } catch {
            window.showToast?.('Unable to save supplier information.', 'error');
            return false;
        }
    }

    function getProducts() {
        return window.GlassStore?.getProducts?.() || [];
    }

    function renderStats() {
        if ($('supplierTotal')) {
            $('supplierTotal').textContent = suppliers.length;
        }

        if ($('supplierActive')) {
            $('supplierActive').textContent =
                suppliers.filter(s => s.status === 'Active').length;
        }

        if ($('supplierInactive')) {
            $('supplierInactive').textContent =
                suppliers.filter(s => s.status === 'Inactive').length;
        }

        if ($('supplierNavCount')) {
            $('supplierNavCount').textContent = suppliers.length;
        }
    }

    function renderSuppliers() {
        const tbody = $('suppliersTableBody');
        if (!tbody) return;

        const search = ($('supplierSearch')?.value || '')
            .toLowerCase().trim();

        const filtered = suppliers.filter(supplier => {
            return [
                supplier.name,
                supplier.contactPerson,
                supplier.phone,
                supplier.email,
                supplier.code
            ].some(value => String(value || '').toLowerCase().includes(search));
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        ${suppliers.length
                            ? 'No suppliers match your search.'
                            : 'No suppliers registered yet. Add your first supplier.'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(supplier => `
            <tr>
                <td>
                    <strong>${escapeHTML(supplier.code)}</strong>
                </td>
                <td>
                    <strong>${escapeHTML(supplier.name)}</strong>
                    <div class="table-subtext">
                        ${escapeHTML(supplier.address || 'No address')}
                    </div>
                </td>
                <td>${escapeHTML(supplier.contactPerson)}</td>
                <td>
                    ${escapeHTML(supplier.phone)}
                    <div class="table-subtext">${escapeHTML(supplier.email)}</div>
                </td>
                <td>${escapeHTML(supplier.categories || 'Not specified')}</td>
                <td>
                    <span class="status-badge ${supplier.status === 'Active'
                        ? 'status-completed'
                        : 'status-cancelled'}">
                        ${escapeHTML(supplier.status)}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-small"
                            data-supplier-action="view"
                            data-id="${escapeHTML(supplier.id)}">View</button>

                        <button class="btn btn-small"
                            data-supplier-action="edit"
                            data-id="${escapeHTML(supplier.id)}">Edit</button>

                        <button class="btn btn-small"
                            data-supplier-action="delete"
                            data-id="${escapeHTML(supplier.id)}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderAll() {
        suppliers = readSuppliers();
        renderStats();
        renderSuppliers();
    }

    function generateCode() {
        return 'SUP-' + Date.now().toString().slice(-8);
    }

    function openSupplierModal(supplier = null) {
        const editing = Boolean(supplier);

        window.openModal?.(
            editing ? 'Edit Supplier' : 'Register New Supplier',
            'Enter the supplier company and contact information.'
        );

        $('modalBody').innerHTML = `
            <div class="form-grid">

                <div class="form-group">
                    <label for="supplierName">Company / Supplier Name *</label>
                    <input id="supplierName" type="text"
                        value="${escapeHTML(supplier?.name || '')}"
                        placeholder="Enter company name" required>
                </div>

                <div class="form-group">
                    <label for="supplierContact">Contact Person *</label>
                    <input id="supplierContact" type="text"
                        value="${escapeHTML(supplier?.contactPerson || '')}"
                        placeholder="Enter contact person's name" required>
                </div>

                <div class="form-group">
                    <label for="supplierPhone">Phone Number *</label>
                    <input id="supplierPhone" type="tel"
                        value="${escapeHTML(supplier?.phone || '')}"
                        placeholder="Enter phone number" required>
                </div>

                <div class="form-group">
                    <label for="supplierEmail">Email Address</label>
                    <input id="supplierEmail" type="email"
                        value="${escapeHTML(supplier?.email || '')}"
                        placeholder="supplier@example.com">
                </div>

                <div class="form-group">
                    <label for="supplierCategories">Products Supplied</label>
                    <input id="supplierCategories" type="text"
                        value="${escapeHTML(supplier?.categories || '')}"
                        placeholder="e.g. Clear Glass, Mirrors, Aluminium">
                </div>

                <div class="form-group">
                    <label for="supplierStatus">Supplier Status</label>
                    <select id="supplierStatus">
                        <option value="Active"
                            ${supplier?.status !== 'Inactive' ? 'selected' : ''}>
                            Active
                        </option>
                        <option value="Inactive"
                            ${supplier?.status === 'Inactive' ? 'selected' : ''}>
                            Inactive
                        </option>
                    </select>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label for="supplierAddress">Business Address</label>
                    <textarea id="supplierAddress" rows="2"
                        placeholder="Enter complete business address">${escapeHTML(supplier?.address || '')}</textarea>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label for="supplierNotes">Additional Notes</label>
                    <textarea id="supplierNotes" rows="3"
                        placeholder="Additional supplier information">${escapeHTML(supplier?.notes || '')}</textarea>
                </div>

            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="cancelSupplier">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" id="saveSupplier">
                ${editing ? 'Save Changes' : 'Register Supplier'}
            </button>
        `;

        $('cancelSupplier').addEventListener('click', () => {
            window.closeModal?.();
        });

        $('saveSupplier').addEventListener('click', () => {
            saveSupplier(supplier?.id || null);
        });
    }

    function saveSupplier(existingId = null) {
        const name = $('supplierName').value.trim();
        const contactPerson = $('supplierContact').value.trim();
        const phone = $('supplierPhone').value.trim();
        const email = $('supplierEmail').value.trim();

        if (!name || !contactPerson || !phone) {
            window.showToast?.(
                'Supplier name, contact person and phone number are required.',
                'error'
            );
            return;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            window.showToast?.('Enter a valid email address.', 'error');
            return;
        }

        const duplicate = suppliers.find(supplier =>
            String(supplier.phone).toLowerCase() === phone.toLowerCase() &&
            String(supplier.id) !== String(existingId)
        );

        if (duplicate) {
            window.showToast?.('This phone number is already registered.', 'error');
            return;
        }

        const existing = existingId
            ? suppliers.find(s => String(s.id) === String(existingId))
            : null;

        const supplier = {
            id: existing?.id || window.GlassStore.createId('supplier'),
            code: existing?.code || generateCode(),
            name,
            contactPerson,
            phone,
            email,
            categories: $('supplierCategories').value.trim(),
            status: $('supplierStatus').value,
            address: $('supplierAddress').value.trim(),
            notes: $('supplierNotes').value.trim(),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            const index = suppliers.findIndex(s =>
                String(s.id) === String(existingId)
            );
            suppliers[index] = supplier;
        } else {
            suppliers.unshift(supplier);
        }

        if (!saveSuppliers()) {
            renderAll();
            return;
        }

        window.closeModal?.();
        renderAll();

        window.showToast?.(
            existing ? 'Supplier updated successfully.' : 'Supplier registered successfully.',
            'success'
        );

        document.dispatchEvent(new CustomEvent('suppliersUpdated'));
    }

    function viewSupplier(supplier) {
        const suppliedProducts = getProducts().filter(product =>
            String(supplier.categories || '').toLowerCase()
                .includes(String(product.name || '').toLowerCase())
        );

        window.openModal?.('Supplier Details', supplier.name);

        $('modalBody').innerHTML = `
            <div class="form-grid">
                <div>
                    <strong>Supplier Code</strong>
                    <p>${escapeHTML(supplier.code)}</p>
                </div>
                <div>
                    <strong>Company Name</strong>
                    <p>${escapeHTML(supplier.name)}</p>
                </div>
                <div>
                    <strong>Contact Person</strong>
                    <p>${escapeHTML(supplier.contactPerson)}</p>
                </div>
                <div>
                    <strong>Phone</strong>
                    <p>${escapeHTML(supplier.phone)}</p>
                </div>
                <div>
                    <strong>Email</strong>
                    <p>${escapeHTML(supplier.email || 'Not provided')}</p>
                </div>
                <div>
                    <strong>Status</strong>
                    <p>${escapeHTML(supplier.status)}</p>
                </div>
                <div style="grid-column:1/-1;">
                    <strong>Products Supplied</strong>
                    <p>${escapeHTML(supplier.categories || 'Not specified')}</p>
                </div>
                <div style="grid-column:1/-1;">
                    <strong>Business Address</strong>
                    <p>${escapeHTML(supplier.address || 'Not provided')}</p>
                </div>
                <div style="grid-column:1/-1;">
                    <strong>Additional Notes</strong>
                    <p>${escapeHTML(supplier.notes || 'No notes available.')}</p>
                </div>
                <div style="grid-column:1/-1;">
                    <strong>Matching Inventory Products</strong>
                    <p>${suppliedProducts.length
                        ? suppliedProducts.map(p => escapeHTML(p.name)).join(', ')
                        : 'No matching inventory product names found.'}</p>
                </div>
            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="closeSupplierDetails">
                Close
            </button>
        `;

        $('closeSupplierDetails').addEventListener('click', () => {
            window.closeModal?.();
        });
    }

    function deleteSupplier(supplier) {
        if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) {
            return;
        }

        suppliers = suppliers.filter(s =>
            String(s.id) !== String(supplier.id)
        );

        if (!saveSuppliers()) {
            renderAll();
            return;
        }

        renderAll();
        window.showToast?.('Supplier deleted successfully.', 'success');
    }

    function handleSupplierActions(event) {
        const button = event.target.closest('[data-supplier-action]');
        if (!button) return;

        const supplier = suppliers.find(s =>
            String(s.id) === String(button.dataset.id)
        );

        if (!supplier) return;

        const action = button.dataset.supplierAction;

        if (action === 'view') viewSupplier(supplier);
        if (action === 'edit') openSupplierModal(supplier);
        if (action === 'delete') deleteSupplier(supplier);
    }

    function bindEvents() {
        document.addEventListener('click', event => {
            if (event.target.closest('[data-action="new-supplier"]')) {
                openSupplierModal();
            }
        });

        $('suppliersTableBody')?.addEventListener('click', handleSupplierActions);

        $('supplierSearch')?.addEventListener('input', renderSuppliers);

        document.addEventListener('pageChanged', event => {
            if (event.detail?.page === 'suppliers') {
                renderAll();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        suppliers = readSuppliers();
        bindEvents();
        renderAll();
    });
})();

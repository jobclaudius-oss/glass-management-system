(() => {
    'use strict';

    const STORAGE_KEY = 'glasspro_installations';

    let installations = [];

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function loadInstallations() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || '[]'
            );

            installations = Array.isArray(saved) ? saved : [];
        } catch (error) {
            installations = [];
        }
    }

    function saveInstallations() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(installations)
        );
    }

    function getCustomers() {
        try {
            const saved = JSON.parse(
                localStorage.getItem('glasspro_customers') || '[]'
            );

            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function getCustomerName(customerId) {
        const customer = getCustomers().find(
            item => String(item.id) === String(customerId)
        );

        return customer ? customer.name : 'Customer unavailable';
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(Number(amount) || 0);
    }

    function formatDate(date) {
        if (!date) return '—';

        const parsed = new Date(`${date}T00:00:00`);

        return Number.isNaN(parsed.getTime())
            ? escapeHTML(date)
            : parsed.toLocaleDateString();
    }

    function createInstallationNumber() {
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('');

        const count = String(installations.length + 1).padStart(4, '0');

        return `INS-${datePart}-${count}`;
    }

    function statusClass(status) {
        return String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');
    }

    function renderInstallations() {
        const tableBody = $('#installationTableBody');

        if (!tableBody) return;

        const scheduled = installations.filter(
            item => item.status === 'Scheduled'
        ).length;

        const progress = installations.filter(
            item => item.status === 'In Progress'
        ).length;

        const completed = installations.filter(
            item => item.status === 'Completed'
        ).length;

        if ($('#installationScheduled')) {
            $('#installationScheduled').textContent = scheduled;
        }

        if ($('#installationProgress')) {
            $('#installationProgress').textContent = progress;
        }

        if ($('#installationCompleted')) {
            $('#installationCompleted').textContent = completed;
        }

        if (!installations.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-table">
                        No installation projects recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        const sorted = [...installations].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        tableBody.innerHTML = sorted.map(item => `
            <tr>
                <td>
                    <strong>${escapeHTML(item.installationNumber)}</strong>
                    <small>${formatDate(item.createdAt.slice(0, 10))}</small>
                </td>

                <td>${escapeHTML(getCustomerName(item.customerId))}</td>

                <td>${escapeHTML(item.location)}</td>

                <td>
                    ${formatDate(item.installationDate)}
                    <small>${escapeHTML(item.installationTime || '')}</small>
                </td>

                <td>${escapeHTML(item.technician || 'Unassigned')}</td>

                <td>${formatCurrency(item.charges)}</td>

                <td>
                    <span class="status-badge ${statusClass(item.status)}">
                        ${escapeHTML(item.status)}
                    </span>
                </td>

                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-secondary"
                                data-action="view-installation"
                                data-id="${escapeHTML(item.id)}">
                            View
                        </button>

                        <button class="btn btn-sm btn-primary"
                                data-action="edit-installation"
                                data-id="${escapeHTML(item.id)}">
                            Edit
                        </button>

                        <button class="btn btn-sm btn-danger"
                                data-action="delete-installation"
                                data-id="${escapeHTML(item.id)}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function showModal(title, subtitle, body, footer) {
        $('#modalTitle').textContent = title;
        $('#modalSubtitle').textContent = subtitle;
        $('#modalBody').innerHTML = body;
        $('#modalFooter').innerHTML = footer;

        window.openModal();
    }

    function openInstallationForm(existing = null) {
        const editing = Boolean(existing);
        const customers = getCustomers();

        if (!customers.length) {
            window.showToast(
                'Please add a customer before scheduling an installation.',
                'warning'
            );
            return;
        }

        const customerOptions = customers.map(customer => `
            <option value="${escapeHTML(customer.id)}"
                ${existing && String(existing.customerId) === String(customer.id) ? 'selected' : ''}>
                ${escapeHTML(customer.name)}
            </option>
        `).join('');

        const today = new Date().toISOString().slice(0, 10);

        const body = `
            <form id="installationForm">
                <div class="form-grid">

                    <div class="form-group">
                        <label for="installationCustomer">Customer *</label>
                        <select id="installationCustomer"
                                name="customerId" required>
                            <option value="">Select customer</option>
                            ${customerOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="installationTechnician">Technician</label>
                        <input type="text"
                               id="installationTechnician"
                               name="technician"
                               value="${existing ? escapeHTML(existing.technician) : ''}"
                               placeholder="Technician or team name">
                    </div>

                    <div class="form-group full-width">
                        <label for="installationLocation">Installation Address *</label>
                        <textarea id="installationLocation"
                                  name="location"
                                  rows="2"
                                  placeholder="Enter the full installation address"
                                  required>${existing ? escapeHTML(existing.location) : ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="installationDate">Installation Date *</label>
                        <input type="date"
                               id="installationDate"
                               name="installationDate"
                               min="${today}"
                               value="${existing ? escapeHTML(existing.installationDate) : today}"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="installationTime">Installation Time</label>
                        <input type="time"
                               id="installationTime"
                               name="installationTime"
                               value="${existing ? escapeHTML(existing.installationTime) : ''}">
                    </div>

                    <div class="form-group">
                        <label for="installationCharges">Installation Charges (₦) *</label>
                        <input type="number"
                               id="installationCharges"
                               name="charges"
                               min="0"
                               step="0.01"
                               value="${existing ? Number(existing.charges) : 0}"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="installationStatus">Job Status *</label>
                        <select id="installationStatus"
                                name="status" required>
                            <option value="Scheduled" ${existing?.status === 'Scheduled' || !existing ? 'selected' : ''}>Scheduled</option>
                            <option value="In Progress" ${existing?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${existing?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${existing?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <label for="installationDescription">Installation Description</label>
                        <textarea id="installationDescription"
                                  name="description"
                                  rows="3"
                                  placeholder="Describe the glass installation work...">${existing ? escapeHTML(existing.description) : ''}</textarea>
                    </div>

                    <div class="form-group full-width">
                        <label for="installationNotes">Additional Notes</label>
                        <textarea id="installationNotes"
                                  name="notes"
                                  rows="2"
                                  placeholder="Special instructions or additional information...">${existing ? escapeHTML(existing.notes) : ''}</textarea>
                    </div>

                </div>
            </form>
        `;

        const footer = `
            <button type="button"
                    class="btn btn-secondary"
                    id="cancelInstallation">
                Cancel
            </button>

            <button type="submit"
                    form="installationForm"
                    class="btn btn-primary">
                ${editing ? 'Save Changes' : 'Schedule Installation'}
            </button>
        `;

        showModal(
            editing ? 'Edit Installation' : 'Schedule Installation',
            'Enter the customer and installation project details.',
            body,
            footer
        );

        $('#cancelInstallation').addEventListener('click', () => {
            window.closeModal();
        });

        $('#installationForm').addEventListener('submit', event => {
            event.preventDefault();
            saveInstallation(existing);
        });
    }

    function saveInstallation(existing = null) {
        const form = $('#installationForm');

        if (!form) return;

        const data = new FormData(form);

        const customerId = String(data.get('customerId') || '');
        const location = String(data.get('location') || '').trim();
        const charges = Number(data.get('charges'));
        const status = String(data.get('status') || '');

        if (!customerId || !location || charges < 0 ||
            !Number.isFinite(charges)) {
            window.showToast(
                'Please complete all required fields correctly.',
                'error'
            );
            return;
        }

        const customerExists = getCustomers().some(
            customer => String(customer.id) === customerId
        );

        if (!customerExists) {
            window.showToast('Please select a valid customer.', 'error');
            return;
        }

        const validStatuses = [
            'Scheduled',
            'In Progress',
            'Completed',
            'Cancelled'
        ];

        if (!validStatuses.includes(status)) {
            window.showToast('Invalid installation status.', 'error');
            return;
        }

        const now = new Date().toISOString();

        const record = {
            id: existing
                ? existing.id
                : `installation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

            installationNumber: existing
                ? existing.installationNumber
                : createInstallationNumber(),

            customerId,
            technician: String(data.get('technician') || '').trim(),
            location,
            installationDate: String(data.get('installationDate') || ''),
            installationTime: String(data.get('installationTime') || ''),
            charges,
            status,
            description: String(data.get('description') || '').trim(),
            notes: String(data.get('notes') || '').trim(),

            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
        };

        const previous = [...installations];

        try {
            if (existing) {
                installations = installations.map(item =>
                    item.id === existing.id ? record : item
                );
            } else {
                installations.unshift(record);
            }

            saveInstallations();
            renderInstallations();

            document.dispatchEvent(
                new CustomEvent('installationsUpdated')
            );

            window.closeModal();

            window.showToast(
                existing
                    ? 'Installation updated successfully.'
                    : 'Installation scheduled successfully.',
                'success'
            );

        } catch (error) {
            installations = previous;

            window.showToast(
                'Unable to save the installation. Please try again.',
                'error'
            );
        }
    }

    function viewInstallation(item) {
        const body = `
            <div class="details-grid">

                <div>
                    <span>Installation ID</span>
                    <strong>${escapeHTML(item.installationNumber)}</strong>
                </div>

                <div>
                    <span>Customer</span>
                    <strong>${escapeHTML(getCustomerName(item.customerId))}</strong>
                </div>

                <div class="full-width">
                    <span>Installation Address</span>
                    <strong>${escapeHTML(item.location)}</strong>
                </div>

                <div>
                    <span>Installation Date</span>
                    <strong>${formatDate(item.installationDate)}</strong>
                </div>

                <div>
                    <span>Installation Time</span>
                    <strong>${escapeHTML(item.installationTime || 'Not specified')}</strong>
                </div>

                <div>
                    <span>Technician</span>
                    <strong>${escapeHTML(item.technician || 'Unassigned')}</strong>
                </div>

                <div>
                    <span>Installation Charges</span>
                    <strong>${formatCurrency(item.charges)}</strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>${escapeHTML(item.status)}</strong>
                </div>

                <div class="full-width">
                    <span>Description</span>
                    <strong>${escapeHTML(item.description || 'No description provided.')}</strong>
                </div>

                <div class="full-width">
                    <span>Additional Notes</span>
                    <strong>${escapeHTML(item.notes || 'No additional notes.')}</strong>
                </div>

            </div>
        `;

        showModal(
            'Installation Details',
            item.installationNumber,
            body,
            `
                <button class="btn btn-secondary"
                        id="closeInstallationDetails">
                    Close
                </button>
            `
        );

        $('#closeInstallationDetails').addEventListener('click', () => {
            window.closeModal();
        });
    }

    function deleteInstallation(item) {
        if (!window.confirm(
            `Delete installation ${item.installationNumber}?`
        )) {
            return;
        }

        const previous = [...installations];

        try {
            installations = installations.filter(
                record => record.id !== item.id
            );

            saveInstallations();
            renderInstallations();

            window.showToast(
                'Installation deleted successfully.',
                'success'
            );

        } catch (error) {
            installations = previous;

            window.showToast(
                'Unable to delete this installation.',
                'error'
            );
        }
    }

    function handleActions(event) {
        const button = event.target.closest('[data-action]');

        if (!button) return;

        const action = button.dataset.action;

        if (action === 'new-installation') {
            event.preventDefault();
            openInstallationForm();
            return;
        }

        if (![
            'view-installation',
            'edit-installation',
            'delete-installation'
        ].includes(action)) {
            return;
        }

        event.preventDefault();

        const item = installations.find(
            record => String(record.id) === String(button.dataset.id)
        );

        if (!item) return;

        if (action === 'view-installation') {
            viewInstallation(item);
        }

        if (action === 'edit-installation') {
            openInstallationForm(item);
        }

        if (action === 'delete-installation') {
            deleteInstallation(item);
        }
    }

    function init() {
        loadInstallations();
        renderInstallations();

        document.addEventListener('click', handleActions);

        document.addEventListener('pageChanged', () => {
            renderInstallations();
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();

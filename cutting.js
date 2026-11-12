(() => {
    'use strict';

    const STORAGE_KEY = 'glasspro_cutting_jobs';

    let cuttingJobs = [];

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

    function getProducts() {
        return window.GlassStore
            ? window.GlassStore.getProducts()
            : [];
    }

    function saveProducts(products) {
        if (!window.GlassStore) {
            throw new Error('Inventory storage is unavailable.');
        }

        window.GlassStore.saveProducts(products);
    }

    function loadJobs() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || '[]'
            );

            cuttingJobs = Array.isArray(saved) ? saved : [];
        } catch (error) {
            cuttingJobs = [];
        }
    }

    function saveJobs() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cuttingJobs)
        );
    }

    function createJobNumber() {
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('');

        const count = String(cuttingJobs.length + 1).padStart(4, '0');

        return `CUT-${datePart}-${count}`;
    }

    function getCustomers() {
        try {
            const customers = JSON.parse(
                localStorage.getItem('glasspro_customers') || '[]'
            );

            return Array.isArray(customers) ? customers : [];
        } catch (error) {
            return [];
        }
    }

    function getProductName(productId) {
        const product = getProducts().find(
            item => String(item.id) === String(productId)
        );

        return product ? product.name : 'Product unavailable';
    }

    function getStatusClass(status) {
        return String(status || '')
            .toLowerCase()
            .replace(/\s+/g, '-');
    }

    function formatDate(date) {
        if (!date) return '—';

        const parsed = new Date(`${date}T00:00:00`);

        return Number.isNaN(parsed.getTime())
            ? escapeHTML(date)
            : parsed.toLocaleDateString();
    }

    function renderCutting() {
        const tableBody = $('#cuttingTableBody');

        if (!tableBody) return;

        const pending = cuttingJobs.filter(
            job => job.status === 'Pending'
        ).length;

        const progress = cuttingJobs.filter(
            job => job.status === 'In Progress'
        ).length;

        const completed = cuttingJobs.filter(
            job => job.status === 'Completed'
        ).length;

        if ($('#cuttingPending')) {
            $('#cuttingPending').textContent = pending;
        }

        if ($('#cuttingProgress')) {
            $('#cuttingProgress').textContent = progress;
        }

        if ($('#cuttingCompleted')) {
            $('#cuttingCompleted').textContent = completed;
        }

        if (!cuttingJobs.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-table">
                        No cutting jobs recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        const sortedJobs = [...cuttingJobs].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        tableBody.innerHTML = sortedJobs.map(job => {
            const productName = getProductName(job.productId);

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(job.jobNumber)}</strong>
                        <small>${formatDate(job.jobDate)}</small>
                    </td>

                    <td>${escapeHTML(productName)}</td>

                    <td>${escapeHTML(job.thickness || '—')}</td>

                    <td>
                        ${escapeHTML(job.width)} ×
                        ${escapeHTML(job.height)}
                        ${escapeHTML(job.measurementUnit)}
                    </td>

                    <td>
                        <strong>${Number(job.pieces) || 0}</strong>
                        <small>
                            ${Number(job.sheetsUsed) || 0} full sheet(s)
                        </small>
                    </td>

                    <td>${escapeHTML(job.technician || 'Unassigned')}</td>

                    <td>
                        <span class="status-badge ${getStatusClass(job.status)}">
                            ${escapeHTML(job.status)}
                        </span>
                    </td>

                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-secondary"
                                    data-action="view-cutting"
                                    data-id="${escapeHTML(job.id)}">
                                View
                            </button>

                            <button class="btn btn-sm btn-primary"
                                    data-action="edit-cutting"
                                    data-id="${escapeHTML(job.id)}">
                                Edit
                            </button>

                            <button class="btn btn-sm btn-danger"
                                    data-action="delete-cutting"
                                    data-id="${escapeHTML(job.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function showModal(title, subtitle, body, footer) {
        $('#modalTitle').textContent = title;
        $('#modalSubtitle').textContent = subtitle;
        $('#modalBody').innerHTML = body;
        $('#modalFooter').innerHTML = footer;

        window.openModal();
    }

    function openCuttingForm(job = null) {
        const isEditing = Boolean(job);
        const products = getProducts();
        const customers = getCustomers();

        if (!products.length) {
            window.showToast(
                'Add glass products to inventory before creating a cutting job.',
                'warning'
            );
            return;
        }

        const productOptions = products.map(product => `
            <option value="${escapeHTML(product.id)}"
                ${job && String(job.productId) === String(product.id) ? 'selected' : ''}>
                ${escapeHTML(product.name)}
                — Stock: ${Number(product.quantity) || 0}
                ${escapeHTML(product.unit || 'sheets')}
            </option>
        `).join('');

        const customerOptions = customers.map(customer => `
            <option value="${escapeHTML(customer.id)}"
                ${job && String(job.customerId || '') === String(customer.id) ? 'selected' : ''}>
                ${escapeHTML(customer.name)}
            </option>
        `).join('');

        const today = new Date().toISOString().slice(0, 10);

        const body = `
            <form id="cuttingForm">
                <div class="form-grid">

                    <div class="form-group">
                        <label for="cuttingProduct">Glass Product *</label>
                        <select id="cuttingProduct" name="productId" required>
                            <option value="">Select glass product</option>
                            ${productOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="cuttingCustomer">Customer</label>
                        <select id="cuttingCustomer" name="customerId">
                            <option value="">No customer selected</option>
                            ${customerOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="cuttingSheets">Full Sheets Used *</label>
                        <input type="number"
                               id="cuttingSheets"
                               name="sheetsUsed"
                               min="1"
                               step="1"
                               value="${job ? Number(job.sheetsUsed) : 1}"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="cuttingPieces">Finished Pieces *</label>
                        <input type="number"
                               id="cuttingPieces"
                               name="pieces"
                               min="1"
                               step="1"
                               value="${job ? Number(job.pieces) : 1}"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="cuttingWidth">Piece Width *</label>
                        <input type="number"
                               id="cuttingWidth"
                               name="width"
                               min="0.01"
                               step="0.01"
                               value="${job ? escapeHTML(job.width) : ''}"
                               placeholder="e.g. 600"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="cuttingHeight">Piece Height *</label>
                        <input type="number"
                               id="cuttingHeight"
                               name="height"
                               min="0.01"
                               step="0.01"
                               value="${job ? escapeHTML(job.height) : ''}"
                               placeholder="e.g. 900"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="cuttingUnit">Measurement Unit *</label>
                        <select id="cuttingUnit" name="measurementUnit" required>
                            <option value="mm" ${job?.measurementUnit === 'mm' || !job ? 'selected' : ''}>Millimetres (mm)</option>
                            <option value="cm" ${job?.measurementUnit === 'cm' ? 'selected' : ''}>Centimetres (cm)</option>
                            <option value="in" ${job?.measurementUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="cuttingTechnician">Technician</label>
                        <input type="text"
                               id="cuttingTechnician"
                               name="technician"
                               value="${job ? escapeHTML(job.technician) : ''}"
                               placeholder="Technician name">
                    </div>

                    <div class="form-group">
                        <label for="cuttingDate">Job Date *</label>
                        <input type="date"
                               id="cuttingDate"
                               name="jobDate"
                               value="${job ? escapeHTML(job.jobDate) : today}"
                               required>
                    </div>

                    <div class="form-group">
                        <label for="cuttingStatus">Job Status *</label>
                        <select id="cuttingStatus" name="status" required>
                            <option value="Pending" ${job?.status === 'Pending' || !job ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${job?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${job?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${job?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>

                    <div class="form-group full-width">
                        <label for="cuttingNotes">Job Notes</label>
                        <textarea id="cuttingNotes"
                                  name="notes"
                                  rows="3"
                                  placeholder="Additional cutting instructions...">${job ? escapeHTML(job.notes) : ''}</textarea>
                    </div>

                </div>

                <p class="form-help">
                    Inventory quantity is treated as full glass sheets.
                    Stock is deducted only when the job is marked Completed.
                </p>
            </form>
        `;

        const footer = `
            <button type="button"
                    class="btn btn-secondary"
                    id="cancelCuttingForm">
                Cancel
            </button>

            <button type="submit"
                    form="cuttingForm"
                    class="btn btn-primary">
                ${isEditing ? 'Save Changes' : 'Create Cutting Job'}
            </button>
        `;

        showModal(
            isEditing ? 'Edit Cutting Job' : 'New Cutting Job',
            'Enter the glass measurements and cutting details.',
            body,
            footer
        );

        $('#cancelCuttingForm').addEventListener('click', () => {
            window.closeModal();
        });

        $('#cuttingForm').addEventListener('submit', event => {
            event.preventDefault();
            saveCuttingJob(job);
        });
    }

    function saveCuttingJob(existingJob = null) {
        const form = $('#cuttingForm');

        if (!form) return;

        const formData = new FormData(form);

        const productId = String(formData.get('productId') || '');
        const sheetsUsed = Number(formData.get('sheetsUsed'));
        const pieces = Number(formData.get('pieces'));
        const width = Number(formData.get('width'));
        const height = Number(formData.get('height'));
        const status = String(formData.get('status') || '');

        if (!productId || sheetsUsed < 1 || pieces < 1 ||
            width <= 0 || height <= 0) {
            window.showToast(
                'Please complete all required cutting fields.',
                'error'
            );
            return;
        }

        const validStatuses = [
            'Pending',
            'In Progress',
            'Completed',
            'Cancelled'
        ];

        if (!validStatuses.includes(status)) {
            window.showToast('Invalid cutting job status.', 'error');
            return;
        }

        const originalProducts = JSON.stringify(getProducts());

        try {
            const products = getProducts();

            // Restore the previous stock deduction when editing a completed job.
            if (existingJob && existingJob.status === 'Completed') {
                const oldProduct = products.find(
                    product => String(product.id) === String(existingJob.productId)
                );

                if (!oldProduct) {
                    throw new Error('The original glass product no longer exists.');
                }

                oldProduct.quantity =
                    (Number(oldProduct.quantity) || 0) +
                    Number(existingJob.sheetsUsed);
            }

            const selectedProduct = products.find(
                product => String(product.id) === productId
            );

            if (!selectedProduct) {
                throw new Error('Please select a valid glass product.');
            }

            // Deduct sheets only when the job is completed.
            if (status === 'Completed') {
                const availableStock = Number(selectedProduct.quantity) || 0;

                if (availableStock < sheetsUsed) {
                    throw new Error(
                        `Insufficient stock. Available: ${availableStock} sheet(s).`
                    );
                }

                selectedProduct.quantity = availableStock - sheetsUsed;
            }

            const now = new Date().toISOString();

            const jobData = {
                id: existingJob
                    ? existingJob.id
                    : `cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

                jobNumber: existingJob
                    ? existingJob.jobNumber
                    : createJobNumber(),

                productId,
                customerId: String(formData.get('customerId') || ''),
                thickness: selectedProduct.thickness || '',
                sheetsUsed,
                pieces,
                width,
                height,
                measurementUnit: String(formData.get('measurementUnit') || 'mm'),
                technician: String(formData.get('technician') || '').trim(),
                jobDate: String(formData.get('jobDate') || ''),
                status,
                notes: String(formData.get('notes') || '').trim(),

                createdAt: existingJob
                    ? existingJob.createdAt
                    : now,

                updatedAt: now
            };

            const previousJobs = [...cuttingJobs];

            if (existingJob) {
                cuttingJobs = cuttingJobs.map(item =>
                    item.id === existingJob.id ? jobData : item
                );
            } else {
                cuttingJobs.unshift(jobData);
            }

            saveProducts(products);

            try {
                saveJobs();
            } catch (error) {
                cuttingJobs = previousJobs;
                saveProducts(JSON.parse(originalProducts));
                throw error;
            }

            renderCutting();

            document.dispatchEvent(new CustomEvent('inventoryUpdated'));
            document.dispatchEvent(new CustomEvent('cuttingUpdated'));

            window.closeModal();

            window.showToast(
                existingJob
                    ? 'Cutting job updated successfully.'
                    : 'Cutting job created successfully.',
                'success'
            );

        } catch (error) {
            try {
                saveProducts(JSON.parse(originalProducts));
            } catch (restoreError) {
                console.error('Could not restore inventory:', restoreError);
            }

            window.showToast(
                error.message || 'Unable to save cutting job.',
                'error'
            );
        }
    }

    function viewCuttingJob(job) {
        const customer = getCustomers().find(
            item => String(item.id) === String(job.customerId)
        );

        const body = `
            <div class="details-grid">
                <div>
                    <span>Job Number</span>
                    <strong>${escapeHTML(job.jobNumber)}</strong>
                </div>

                <div>
                    <span>Glass Product</span>
                    <strong>${escapeHTML(getProductName(job.productId))}</strong>
                </div>

                <div>
                    <span>Thickness</span>
                    <strong>${escapeHTML(job.thickness || '—')}</strong>
                </div>

                <div>
                    <span>Customer</span>
                    <strong>${escapeHTML(customer?.name || 'Not assigned')}</strong>
                </div>

                <div>
                    <span>Full Sheets Used</span>
                    <strong>${Number(job.sheetsUsed)}</strong>
                </div>

                <div>
                    <span>Finished Pieces</span>
                    <strong>${Number(job.pieces)}</strong>
                </div>

                <div>
                    <span>Piece Dimensions</span>
                    <strong>
                        ${escapeHTML(job.width)} ×
                        ${escapeHTML(job.height)}
                        ${escapeHTML(job.measurementUnit)}
                    </strong>
                </div>

                <div>
                    <span>Technician</span>
                    <strong>${escapeHTML(job.technician || 'Unassigned')}</strong>
                </div>

                <div>
                    <span>Job Date</span>
                    <strong>${formatDate(job.jobDate)}</strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>${escapeHTML(job.status)}</strong>
                </div>

                <div class="full-width">
                    <span>Notes</span>
                    <strong>${escapeHTML(job.notes || 'No notes added.')}</strong>
                </div>
            </div>
        `;

        showModal(
            'Cutting Job Details',
            job.jobNumber,
            body,
            `
                <button class="btn btn-secondary" id="closeCuttingDetails">
                    Close
                </button>
            `
        );

        $('#closeCuttingDetails').addEventListener('click', () => {
            window.closeModal();
        });
    }

    function deleteCuttingJob(job) {
        const confirmed = window.confirm(
            `Delete cutting job ${job.jobNumber}?`
        );

        if (!confirmed) return;

        const originalProducts = JSON.stringify(getProducts());
        const previousJobs = [...cuttingJobs];

        try {
            const products = getProducts();

            // Return sheets to stock if the deleted job was completed.
            if (job.status === 'Completed') {
                const product = products.find(
                    item => String(item.id) === String(job.productId)
                );

                if (!product) {
                    throw new Error(
                        'The glass product for this job could not be found.'
                    );
                }

                product.quantity =
                    (Number(product.quantity) || 0) +
                    Number(job.sheetsUsed);

                saveProducts(products);
            }

            cuttingJobs = cuttingJobs.filter(
                item => item.id !== job.id
            );

            try {
                saveJobs();
            } catch (error) {
                cuttingJobs = previousJobs;
                saveProducts(JSON.parse(originalProducts));
                throw error;
            }

            renderCutting();

            document.dispatchEvent(new CustomEvent('inventoryUpdated'));

            window.showToast(
                'Cutting job deleted successfully.',
                'success'
            );

        } catch (error) {
            try {
                saveProducts(JSON.parse(originalProducts));
            } catch (restoreError) {
                console.error('Could not restore inventory:', restoreError);
            }

            window.showToast(
                error.message || 'Unable to delete cutting job.',
                'error'
            );
        }
    }

    function handleActions(event) {
        const button = event.target.closest('[data-action]');

        if (!button) return;

        const action = button.dataset.action;

        if (action === 'new-cutting') {
            event.preventDefault();
            openCuttingForm();
            return;
        }

        if (![
            'view-cutting',
            'edit-cutting',
            'delete-cutting'
        ].includes(action)) {
            return;
        }

        event.preventDefault();

        const job = cuttingJobs.find(
            item => String(item.id) === String(button.dataset.id)
        );

        if (!job) return;

        if (action === 'view-cutting') {
            viewCuttingJob(job);
        }

        if (action === 'edit-cutting') {
            openCuttingForm(job);
        }

        if (action === 'delete-cutting') {
            deleteCuttingJob(job);
        }
    }

    function init() {
        loadJobs();
        renderCutting();

        document.addEventListener('click', handleActions);

        document.addEventListener('pageChanged', () => {
            renderCutting();
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
/* =========================================================
   GLASS MANAGEMENT SYSTEM
   STAFF MANAGEMENT MODULE
========================================================= */

(() => {
    'use strict';

    const STORAGE_KEY = 'glasspro_staff';

    const STAFF_ROLES = [
        'Administrator',
        'Manager',
        'Sales Representative',
        'Cashier',
        'Accountant',
        'Glass Cutter',
        'Installer',
        'Storekeeper',
        'Driver',
        'Other'
    ];

    const DEPARTMENTS = [
        'Management',
        'Sales',
        'Finance',
        'Production',
        'Installation',
        'Inventory',
        'Logistics',
        'Administration',
        'Other'
    ];

    const STATUSES = ['Active', 'Inactive', 'On Leave'];

    let staffRecords = [];
    let searchTerm = '';

    const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);

    const getToday = () => {
        const date = new Date();
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 10);
    };

    const loadStaff = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            staffRecords = Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error('Unable to load staff records:', error);
            staffRecords = [];
        }
    };

    const saveStaff = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(staffRecords));
        renderStaff();
    };

    const createStaffId = () => {
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('');

        const sequence = String(Date.now()).slice(-5);

        return `STF-${datePart}-${sequence}`;
    };

    const showMessage = (message, type = 'success') => {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    };

    const money = (amount) => {
        return Number(amount || 0).toLocaleString('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        });
    };

    const statusClass = (status) => {
        const normalized = String(status || '').toLowerCase().replace(/\s+/g, '-');
        return `status-${normalized}`;
    };

    const getFilteredStaff = () => {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            return staffRecords;
        }

        return staffRecords.filter(staff => {
            return [
                staff.staffId,
                staff.name,
                staff.phone,
                staff.email,
                staff.role,
                staff.department,
                staff.status
            ].some(value => String(value || '').toLowerCase().includes(term));
        });
    };

    const renderStaff = () => {
        const tableBody = document.getElementById('staffTableBody');

        if (!tableBody) return;

        const filtered = getFilteredStaff();

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        ${staffRecords.length === 0
                            ? 'No staff records yet. Add your first staff member.'
                            : 'No staff members match your search.'}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(staff => `
            <tr>
                <td>
                    <div class="table-primary-text">
                        ${escapeHTML(staff.name)}
                    </div>
                    <small>${escapeHTML(staff.staffId)}</small>
                </td>

                <td>${escapeHTML(staff.phone || '—')}</td>

                <td>${escapeHTML(staff.email || '—')}</td>

                <td>${escapeHTML(staff.role)}</td>

                <td>${escapeHTML(staff.department)}</td>

                <td>
                    <span class="status-badge ${statusClass(staff.status)}">
                        ${escapeHTML(staff.status)}
                    </span>
                </td>

                <td>
                    <div class="table-actions">
                        <button class="btn btn-small btn-secondary"
                                data-staff-action="view"
                                data-id="${escapeHTML(staff.id)}">
                            View
                        </button>

                        <button class="btn btn-small btn-primary"
                                data-staff-action="edit"
                                data-id="${escapeHTML(staff.id)}">
                            Edit
                        </button>

                        <button class="btn btn-small btn-danger"
                                data-staff-action="delete"
                                data-id="${escapeHTML(staff.id)}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

    const optionList = (items, selected = '') => {
        return items.map(item => `
            <option value="${escapeHTML(item)}"
                ${selected === item ? 'selected' : ''}>
                ${escapeHTML(item)}
            </option>
        `).join('');
    };

    const staffFormHTML = (staff = {}) => {
        const isEditing = Boolean(staff.id);

        return `
            <form id="staffForm">
                <input type="hidden" id="staffRecordId"
                       value="${escapeHTML(staff.id || '')}">

                <div class="form-grid">

                    <div class="form-group">
                        <label for="staffName">Full Name *</label>
                        <input type="text" id="staffName"
                               value="${escapeHTML(staff.name || '')}"
                               placeholder="Enter full name" required>
                    </div>

                    <div class="form-group">
                        <label for="staffPhone">Phone Number *</label>
                        <input type="tel" id="staffPhone"
                               value="${escapeHTML(staff.phone || '')}"
                               placeholder="Enter phone number" required>
                    </div>

                    <div class="form-group">
                        <label for="staffEmail">Email Address</label>
                        <input type="email" id="staffEmail"
                               value="${escapeHTML(staff.email || '')}"
                               placeholder="Enter email address">
                    </div>

                    <div class="form-group">
                        <label for="staffRole">Job Role *</label>
                        <select id="staffRole" required>
                            <option value="">Select job role</option>
                            ${optionList(STAFF_ROLES, staff.role || '')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="staffDepartment">Department *</label>
                        <select id="staffDepartment" required>
                            <option value="">Select department</option>
                            ${optionList(DEPARTMENTS, staff.department || '')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="staffStatus">Employment Status</label>
                        <select id="staffStatus">
                            ${optionList(STATUSES, staff.status || 'Active')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="staffEmploymentType">Employment Type</label>
                        <select id="staffEmploymentType">
                            ${optionList(
                                ['Full-time', 'Part-time', 'Contract', 'Temporary'],
                                staff.employmentType || 'Full-time'
                            )}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="staffHireDate">Date Employed</label>
                        <input type="date" id="staffHireDate"
                               value="${escapeHTML(staff.hireDate || getToday())}">
                    </div>

                    <div class="form-group">
                        <label for="staffSalary">Monthly Salary (₦)</label>
                        <input type="number" id="staffSalary"
                               min="0" step="0.01"
                               value="${escapeHTML(staff.salary ?? '')}"
                               placeholder="Enter monthly salary">
                    </div>

                    <div class="form-group full-width">
                        <label for="staffAddress">Home Address</label>
                        <textarea id="staffAddress" rows="2"
                                  placeholder="Enter staff address">${escapeHTML(staff.address || '')}</textarea>
                    </div>

                    <div class="form-group full-width">
                        <label for="staffNotes">Additional Notes</label>
                        <textarea id="staffNotes" rows="3"
                                  placeholder="Additional information about this staff member">${escapeHTML(staff.notes || '')}</textarea>
                    </div>

                </div>
            </form>
        `;
    };

    const openStaffForm = (staff = null) => {
        const isEditing = Boolean(staff);

        const title = isEditing ? 'Edit Staff Member' : 'Register Staff Member';
        const subtitle = isEditing
            ? 'Update this staff member’s information.'
            : 'Enter the details of the new staff member.';

        const body = staffFormHTML(staff || {});

        const footer = `
            <button type="button" class="btn btn-secondary"
                    id="staffFormCancel">
                Cancel
            </button>

            <button type="submit" form="staffForm"
                    class="btn btn-primary">
                ${isEditing ? 'Save Changes' : 'Register Staff'}
            </button>
        `;

        if (typeof window.openModal === 'function') {
            window.openModal(title, subtitle, body, footer);
        } else {
            const overlay = document.getElementById('modalOverlay');
            const modalTitle = document.getElementById('modalTitle');
            const modalSubtitle = document.getElementById('modalSubtitle');
            const modalBody = document.getElementById('modalBody');
            const modalFooter = document.getElementById('modalFooter');

            if (!overlay || !modalBody) {
                showMessage('The application modal could not be found.', 'error');
                return;
            }

            if (modalTitle) modalTitle.textContent = title;
            if (modalSubtitle) modalSubtitle.textContent = subtitle;
            modalBody.innerHTML = body;
            if (modalFooter) modalFooter.innerHTML = footer;

            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
        }

        document.getElementById('staffFormCancel')?.addEventListener('click', closeModal);
        document.getElementById('staffForm')?.addEventListener('submit', saveStaffForm);
    };

    const closeModal = () => {
        if (typeof window.closeModal === 'function') {
            window.closeModal();
            return;
        }

        const overlay = document.getElementById('modalOverlay');

        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }
    };

    const saveStaffForm = (event) => {
        event.preventDefault();

        const id = document.getElementById('staffRecordId').value;
        const name = document.getElementById('staffName').value.trim();
        const phone = document.getElementById('staffPhone').value.trim();
        const email = document.getElementById('staffEmail').value.trim();
        const role = document.getElementById('staffRole').value;
        const department = document.getElementById('staffDepartment').value;
        const status = document.getElementById('staffStatus').value;
        const salaryValue = document.getElementById('staffSalary').value;

        if (!name || !phone || !role || !department) {
            showMessage('Please complete all required staff fields.', 'error');
            return;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }

        const existing = staffRecords.find(item => item.id === id);

        const staffData = {
            id: id || `staff-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
            staffId: existing?.staffId || createStaffId(),
            name,
            phone,
            email,
            role,
            department,
            status,
            employmentType: document.getElementById('staffEmploymentType').value,
            hireDate: document.getElementById('staffHireDate').value,
            salary: salaryValue === '' ? 0 : Number(salaryValue),
            address: document.getElementById('staffAddress').value.trim(),
            notes: document.getElementById('staffNotes').value.trim(),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            staffRecords = staffRecords.map(item =>
                item.id === id ? staffData : item
            );

            showMessage('Staff information updated successfully.');
        } else {
            staffRecords.unshift(staffData);
            showMessage('Staff member registered successfully.');
        }

        saveStaff();
        closeModal();

        document.dispatchEvent(new CustomEvent('staffUpdated', {
            detail: { staff: staffData }
        }));
    };

    const viewStaff = (staff) => {
        if (!staff) return;

        const details = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Staff ID</label>
                    <p>${escapeHTML(staff.staffId)}</p>
                </div>

                <div class="form-group">
                    <label>Full Name</label>
                    <p>${escapeHTML(staff.name)}</p>
                </div>

                <div class="form-group">
                    <label>Phone Number</label>
                    <p>${escapeHTML(staff.phone || '—')}</p>
                </div>

                <div class="form-group">
                    <label>Email Address</label>
                    <p>${escapeHTML(staff.email || '—')}</p>
                </div>

                <div class="form-group">
                    <label>Job Role</label>
                    <p>${escapeHTML(staff.role)}</p>
                </div>

                <div class="form-group">
                    <label>Department</label>
                    <p>${escapeHTML(staff.department)}</p>
                </div>

                <div class="form-group">
                    <label>Status</label>
                    <p>${escapeHTML(staff.status)}</p>
                </div>

                <div class="form-group">
                    <label>Employment Type</label>
                    <p>${escapeHTML(staff.employmentType || '—')}</p>
                </div>

                <div class="form-group">
                    <label>Date Employed</label>
                    <p>${escapeHTML(staff.hireDate || '—')}</p>
                </div>

                <div class="form-group">
                    <label>Monthly Salary</label>
                    <p>${money(staff.salary)}</p>
                </div>

                <div class="form-group full-width">
                    <label>Home Address</label>
                    <p>${escapeHTML(staff.address || '—')}</p>
                </div>

                <div class="form-group full-width">
                    <label>Additional Notes</label>
                    <p>${escapeHTML(staff.notes || '—')}</p>
                </div>
            </div>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary"
                    id="staffViewClose">
                Close
            </button>

            <button type="button" class="btn btn-primary"
                    id="staffViewEdit">
                Edit Staff
            </button>
        `;

        if (typeof window.openModal === 'function') {
            window.openModal('Staff Details', 'Complete staff information.', details, footer);
        } else {
            const overlay = document.getElementById('modalOverlay');
            document.getElementById('modalTitle').textContent = 'Staff Details';
            document.getElementById('modalSubtitle').textContent = 'Complete staff information.';
            document.getElementById('modalBody').innerHTML = details;
            document.getElementById('modalFooter').innerHTML = footer;
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
        }

        document.getElementById('staffViewClose')?.addEventListener('click', closeModal);

        document.getElementById('staffViewEdit')?.addEventListener('click', () => {
            closeModal();
            openStaffForm(staff);
        });
    };

    const deleteStaff = (staff) => {
        if (!staff) return;

        const confirmed = confirm(
            `Are you sure you want to delete ${staff.name} from the staff records?`
        );

        if (!confirmed) return;

        staffRecords = staffRecords.filter(item => item.id !== staff.id);

        saveStaff();
        showMessage('Staff record deleted successfully.');

        document.dispatchEvent(new CustomEvent('staffUpdated', {
            detail: { deletedId: staff.id }
        }));
    };

    const handleTableActions = (event) => {
        const button = event.target.closest('[data-staff-action]');

        if (!button) return;

        const action = button.dataset.staffAction;
        const id = button.dataset.id;
        const staff = staffRecords.find(item => item.id === id);

        if (!staff) return;

        if (action === 'view') {
            viewStaff(staff);
        } else if (action === 'edit') {
            openStaffForm(staff);
        } else if (action === 'delete') {
            deleteStaff(staff);
        }
    };

    const bindEvents = () => {
        document.addEventListener('click', event => {
            const newStaffButton = event.target.closest('[data-action="new-staff"]');

            if (newStaffButton) {
                openStaffForm();
            }
        });

        document.getElementById('staffTableBody')?.addEventListener(
            'click',
            handleTableActions
        );

        document.getElementById('staffSearch')?.addEventListener('input', event => {
            searchTerm = event.target.value;
            renderStaff();
        });
    };

        let initialized = false;

    const init = () => {
        if (initialized) return;
        initialized = true;

        loadStaff();
        bindEvents();
        renderStaff();
    };

    window.GlassStaff = {
        getAll: () => [...staffRecords],
        getById: (id) => staffRecords.find(staff => staff.id === id) || null,
        refresh: renderStaff
    };

    document.addEventListener('DOMContentLoaded', init);

    if (document.readyState !== 'loading') {
        init();
    }

})();
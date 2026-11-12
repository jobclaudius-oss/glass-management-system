/* =========================================================
   GLASSPRO - EXPENSE MANAGEMENT
========================================================= */

(() => {
    'use strict';

    const STORAGE_KEY = 'glasspro_expenses';

    const CATEGORIES = [
        'Rent',
        'Electricity',
        'Water',
        'Salaries',
        'Transport',
        'Fuel',
        'Maintenance',
        'Office Supplies',
        'Internet',
        'Marketing',
        'Equipment',
        'Taxes',
        'Other'
    ];

    const PAYMENT_METHODS = [
        'Cash',
        'Bank Transfer',
        'POS',
        'Card',
        'Other'
    ];

    let expenses = [];
    let initialized = false;

    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);

    const today = () => {
        const date = new Date();
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 10);
    };

    const money = amount => Number(amount || 0).toLocaleString('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2
    });

    const loadExpenses = () => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            expenses = Array.isArray(saved) ? saved : [];
        } catch (error) {
            console.error('Unable to load expenses:', error);
            expenses = [];
        }
    };

    const saveExpenses = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        renderExpenses();

        document.dispatchEvent(new CustomEvent('expensesUpdated'));
    };

    const generateExpenseId = () => {
        const date = today().replaceAll('-', '');
        const sequence = String(Date.now()).slice(-5);
        return `EXP-${date}-${sequence}`;
    };

    const notify = (message, type = 'success') => {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    };

    const renderExpenses = () => {
        const tableBody = document.getElementById('expensesTableBody');
        if (!tableBody) return;

        const sorted = [...expenses].sort((a, b) =>
            String(b.date).localeCompare(String(a.date))
        );

        const total = expenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0), 0
        );

        const currentMonth = today().slice(0, 7);

        const monthly = expenses
            .filter(expense => String(expense.date).startsWith(currentMonth))
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

        const totalElement = document.getElementById('expenseTotal');
        const monthlyElement = document.getElementById('expenseMonthly');

        if (totalElement) totalElement.textContent = money(total);
        if (monthlyElement) monthlyElement.textContent = money(monthly);

        if (!sorted.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        No expense records yet. Click Record Expense to begin.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = sorted.map(expense => `
            <tr>
                <td>${escapeHTML(expense.id)}</td>
                <td>${escapeHTML(expense.description)}</td>
                <td>${escapeHTML(expense.category)}</td>
                <td>${escapeHTML(expense.date)}</td>
                <td>${escapeHTML(expense.paymentMethod)}</td>
                <td><strong>${money(expense.amount)}</strong></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-small btn-secondary"
                            data-expense-action="view"
                            data-id="${escapeHTML(expense.id)}">
                            View
                        </button>

                        <button class="btn btn-small btn-primary"
                            data-expense-action="edit"
                            data-id="${escapeHTML(expense.id)}">
                            Edit
                        </button>

                        <button class="btn btn-small btn-danger"
                            data-expense-action="delete"
                            data-id="${escapeHTML(expense.id)}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    };

    const options = (items, selected) => items.map(item => `
        <option value="${escapeHTML(item)}"
            ${selected === item ? 'selected' : ''}>
            ${escapeHTML(item)}
        </option>
    `).join('');

    const closeModal = () => {
        if (typeof window.closeModal === 'function') {
            window.closeModal();
        }
    };

    const openExpenseForm = (expense = null) => {
        const editing = Boolean(expense);

        const body = `
            <form id="expenseForm">
                <input type="hidden" id="expenseRecordId"
                    value="${escapeHTML(expense?.id || '')}">

                <div class="form-grid">

                    <div class="form-group full-width">
                        <label for="expenseDescription">Expense Description *</label>
                        <input type="text" id="expenseDescription"
                            value="${escapeHTML(expense?.description || '')}"
                            placeholder="e.g. Monthly shop electricity bill"
                            required>
                    </div>

                    <div class="form-group">
                        <label for="expenseCategory">Category *</label>
                        <select id="expenseCategory" required>
                            <option value="">Select category</option>
                            ${options(CATEGORIES, expense?.category || '')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="expenseAmount">Amount (₦) *</label>
                        <input type="number" id="expenseAmount"
                            min="0.01" step="0.01"
                            value="${escapeHTML(expense?.amount ?? '')}"
                            placeholder="Enter amount" required>
                    </div>

                    <div class="form-group">
                        <label for="expenseDate">Expense Date *</label>
                        <input type="date" id="expenseDate"
                            value="${escapeHTML(expense?.date || today())}"
                            required>
                    </div>

                    <div class="form-group">
                        <label for="expensePayment">Payment Method *</label>
                        <select id="expensePayment" required>
                            <option value="">Select payment method</option>
                            ${options(PAYMENT_METHODS, expense?.paymentMethod || '')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="expenseReference">Reference / Receipt Number</label>
                        <input type="text" id="expenseReference"
                            value="${escapeHTML(expense?.reference || '')}"
                            placeholder="Optional reference">
                    </div>

                    <div class="form-group">
                        <label for="expensePaidTo">Paid To</label>
                        <input type="text" id="expensePaidTo"
                            value="${escapeHTML(expense?.paidTo || '')}"
                            placeholder="Recipient or company">
                    </div>

                    <div class="form-group full-width">
                        <label for="expenseNotes">Additional Notes</label>
                        <textarea id="expenseNotes" rows="3"
                            placeholder="Enter additional details">${escapeHTML(expense?.notes || '')}</textarea>
                    </div>

                </div>
            </form>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary"
                id="expenseCancel">
                Cancel
            </button>

            <button type="submit" form="expenseForm"
                class="btn btn-primary">
                ${editing ? 'Save Changes' : 'Record Expense'}
            </button>
        `;

        window.openModal(
            editing ? 'Edit Expense' : 'Record New Expense',
            editing ? 'Update expense information.' : 'Enter the business expense details.',
            body,
            footer
        );

        document.getElementById('expenseCancel')
            ?.addEventListener('click', closeModal);

        document.getElementById('expenseForm')
            ?.addEventListener('submit', saveExpense);
    };

    const saveExpense = event => {
        event.preventDefault();

        const id = document.getElementById('expenseRecordId').value;
        const description = document.getElementById('expenseDescription').value.trim();
        const category = document.getElementById('expenseCategory').value;
        const amount = Number(document.getElementById('expenseAmount').value);
        const date = document.getElementById('expenseDate').value;
        const paymentMethod = document.getElementById('expensePayment').value;

        if (!description || !category || !date || !paymentMethod ||
            !Number.isFinite(amount) || amount <= 0) {
            notify('Please complete all required fields with a valid amount.', 'error');
            return;
        }

        const existing = expenses.find(item => item.id === id);

        const record = {
            id: existing?.id || generateExpenseId(),
            description,
            category,
            amount,
            date,
            paymentMethod,
            reference: document.getElementById('expenseReference').value.trim(),
            paidTo: document.getElementById('expensePaidTo').value.trim(),
            notes: document.getElementById('expenseNotes').value.trim(),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            expenses = expenses.map(item => item.id === id ? record : item);
            notify('Expense updated successfully.');
        } else {
            expenses.unshift(record);
            notify('Expense recorded successfully.');
        }

        saveExpenses();
        closeModal();
    };

    const viewExpense = expense => {
        const body = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Expense ID</label>
                    <p>${escapeHTML(expense.id)}</p>
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <p>${escapeHTML(expense.description)}</p>
                </div>

                <div class="form-group">
                    <label>Category</label>
                    <p>${escapeHTML(expense.category)}</p>
                </div>

                <div class="form-group">
                    <label>Amount</label>
                    <p><strong>${money(expense.amount)}</strong></p>
                </div>

                <div class="form-group">
                    <label>Date</label>
                    <p>${escapeHTML(expense.date)}</p>
                </div>

                <div class="form-group">
                    <label>Payment Method</label>
                    <p>${escapeHTML(expense.paymentMethod)}</p>
                </div>

                <div class="form-group">
                    <label>Reference</label>
                    <p>${escapeHTML(expense.reference || '—')}</p>
                </div>

                <div class="form-group">
                    <label>Paid To</label>
                    <p>${escapeHTML(expense.paidTo || '—')}</p>
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <p>${escapeHTML(expense.notes || '—')}</p>
                </div>
            </div>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary"
                id="expenseViewClose">Close</button>

            <button type="button" class="btn btn-primary"
                id="expenseViewEdit">Edit Expense</button>
        `;

        window.openModal(
            'Expense Details',
            'View the complete expense record.',
            body,
            footer
        );

        document.getElementById('expenseViewClose')
            ?.addEventListener('click', closeModal);

        document.getElementById('expenseViewEdit')
            ?.addEventListener('click', () => {
                closeModal();
                openExpenseForm(expense);
            });
    };

    const deleteExpense = expense => {
        if (!confirm(`Delete expense "${expense.description}"?`)) return;

        expenses = expenses.filter(item => item.id !== expense.id);

        saveExpenses();
        notify('Expense deleted successfully.');
    };

    const bindEvents = () => {
        document.addEventListener('click', event => {
            if (event.target.closest('[data-action="new-expense"]')) {
                openExpenseForm();
                return;
            }

            const button = event.target.closest('[data-expense-action]');
            if (!button) return;

            const expense = expenses.find(item =>
                item.id === button.dataset.id
            );

            if (!expense) return;

            const action = button.dataset.expenseAction;

            if (action === 'view') viewExpense(expense);
            if (action === 'edit') openExpenseForm(expense);
            if (action === 'delete') deleteExpense(expense);
        });
    };

    const init = () => {
        if (initialized) return;
        initialized = true;

        loadExpenses();
        bindEvents();
        renderExpenses();
    };

    window.GlassExpenses = {
        getAll: () => [...expenses],
        getById: id => expenses.find(item => item.id === id) || null,
        refresh: renderExpenses
    };

    document.addEventListener('DOMContentLoaded', init);

    if (document.readyState !== 'loading') {
        init();
    }

})();

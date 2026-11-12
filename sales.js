'use strict';

(() => {
    const SALES_KEY = 'glasspro_sales';
    const CUSTOMERS_KEY = 'glasspro_customers';

    let sales = [];
    let saleItems = [];

    const $ = id => document.getElementById(id);

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function money(value) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN'
        }).format(Number(value) || 0);
    }

    function createId(prefix = 'sale') {
        const random = window.crypto?.randomUUID
            ? window.crypto.randomUUID()
            : Date.now() + '-' + Math.random().toString(36).slice(2, 8);

        return `${prefix}-${random}`;
    }

    function loadSales() {
        try {
            const stored = JSON.parse(localStorage.getItem(SALES_KEY) || '[]');
            sales = Array.isArray(stored) ? stored : [];
        } catch {
            sales = [];
        }
    }

    function saveSales() {
        try {
            localStorage.setItem(SALES_KEY, JSON.stringify(sales));
            return true;
        } catch (error) {
            console.error('Sales storage error:', error);
            window.showToast?.('Unable to save this sale.', 'error');
            return false;
        }
    }

    function getProducts() {
        return window.GlassStore?.getProducts?.() || [];
    }

    function saveProducts(products) {
        if (!window.GlassStore?.saveProducts) {
            window.showToast?.('Inventory storage is unavailable.', 'error');
            return false;
        }

        window.GlassStore.saveProducts(products);
        return true;
    }

    function getCustomers() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(CUSTOMERS_KEY) || '[]'
            );

            return Array.isArray(stored) ? stored : [];
        } catch {
            return [];
        }
    }

    function saveCustomers(customers) {
        try {
            localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
            return true;
        } catch (error) {
            console.error('Customer balance update failed:', error);
            return false;
        }
    }

    function renderStatistics() {
        const totalRevenue = sales.reduce(
            (sum, sale) => sum + Number(sale.total || 0),
            0
        );

        const paidSales = sales.filter(
            sale => sale.paymentStatus === 'paid'
        ).length;

        const outstanding = sales.reduce(
            (sum, sale) => sum + Number(sale.balanceDue || 0),
            0
        );

        if ($('salesTotalTransactions')) {
            $('salesTotalTransactions').textContent = sales.length;
        }

        if ($('salesTotalRevenue')) {
            $('salesTotalRevenue').textContent = money(totalRevenue);
        }

        if ($('salesPaidCount')) {
            $('salesPaidCount').textContent = paidSales;
        }

        if ($('salesOutstanding')) {
            $('salesOutstanding').textContent = money(outstanding);
        }

        if ($('totalSales')) {
            $('totalSales').textContent = sales.length;
        }

        if ($('totalRevenue')) {
            $('totalRevenue').textContent = money(totalRevenue);
        }
    }

    function renderSalesTable() {
        const tbody = $('salesTableBody');
        if (!tbody) return;

        const search = ($('salesSearch')?.value || '')
            .trim()
            .toLowerCase();

        const paymentFilter = $('salesPaymentFilter')?.value || '';
        const dateFilter = $('salesDateFilter')?.value || '';

        const filtered = sales.filter(sale => {
            const customer = sale.customerName || 'Walk-in Customer';

            const matchesSearch =
                String(sale.receiptNumber || '').toLowerCase().includes(search) ||
                customer.toLowerCase().includes(search);

            const matchesPayment =
                !paymentFilter || sale.paymentMethod === paymentFilter;

            const matchesDate =
                !dateFilter || String(sale.date).slice(0, 10) === dateFilter;

            return matchesSearch && matchesPayment && matchesDate;
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        ${sales.length
                            ? 'No sales match your filters.'
                            : 'No sales recorded yet. Click Record New Sale to get started.'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(sale => {
            const itemCount = (sale.items || []).reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
            );

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(sale.receiptNumber)}</strong>
                    </td>
                    <td>${escapeHTML(sale.customerName || 'Walk-in Customer')}</td>
                    <td>${new Date(sale.date).toLocaleDateString('en-GB')}</td>
                    <td>${itemCount} piece(s)</td>
                    <td><strong>${money(sale.total)}</strong></td>
                    <td>
                        <span class="status-badge ${
                            sale.paymentStatus === 'paid'
                                ? 'status-completed'
                                : 'status-pending'
                        }">
                            ${sale.paymentStatus === 'paid'
                                ? 'Paid'
                                : 'Partially Paid'}
                        </span>
                        <div class="table-subtext">
                            ${escapeHTML(sale.paymentMethod)}
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button type="button"
                                    class="btn-small"
                                    data-action="view-sale"
                                    data-id="${escapeHTML(sale.id)}">
                                Receipt
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderSales() {
        renderStatistics();
        renderSalesTable();
    }

    function openSaleModal() {
        const products = getProducts().filter(
            product => Number(product.quantity) > 0
        );

        if (!products.length) {
            window.showToast?.(
                'There are no products in stock. Add inventory before recording a sale.',
                'warning'
            );
            return;
        }

        saleItems = [];

        const customers = getCustomers();

        $('modalTitle').textContent = 'Record New Sale';
        $('modalSubtitle').textContent =
            'Select products, quantities and payment details.';

        $('modalBody').innerHTML = `
            <form id="saleForm">

                <div class="form-grid">
                    <div class="form-group">
                        <label for="saleCustomer">Customer</label>
                        <select id="saleCustomer">
                            <option value="">Walk-in Customer</option>
                            ${customers.map(customer => `
                                <option value="${escapeHTML(customer.id)}">
                                    ${escapeHTML(customer.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="saleDate">Sale Date</label>
                        <input type="date"
                               id="saleDate"
                               value="${new Date().toISOString().slice(0, 10)}"
                               required>
                    </div>
                </div>

                <div class="panel-header" style="margin:20px 0 12px;">
                    <div>
                        <h3>Sale Items</h3>
                        <p>Add one or more glass products.</p>
                    </div>
                    <button type="button"
                            class="btn btn-secondary"
                            id="addSaleItem">
                        + Add Item
                    </button>
                </div>

                <div id="saleItemsContainer"></div>

                <div class="form-grid" style="margin-top:20px;">
                    <div class="form-group">
                        <label for="salePaymentMethod">Payment Method *</label>
                        <select id="salePaymentMethod" required>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Transfer</option>
                            <option value="pos">POS</option>
                            <option value="card">Card</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="saleAmountPaid">Amount Paid (₦) *</label>
                        <input type="number"
                               id="saleAmountPaid"
                               min="0"
                               step="0.01"
                               value="0"
                               required>
                    </div>
                </div>

                <div class="form-group" style="margin-top:12px;">
                    <label for="saleNotes">Sale Notes</label>
                    <textarea id="saleNotes"
                              rows="2"
                              placeholder="Optional notes"></textarea>
                </div>

                <div class="panel" style="margin-top:20px;padding:18px;">
                    <div class="sale-total-line">
                        <span>Subtotal</span>
                        <strong id="saleSubtotal">₦0.00</strong>
                    </div>
                    <div class="sale-total-line">
                        <span>Total</span>
                        <strong id="saleTotal">₦0.00</strong>
                    </div>
                    <div class="sale-total-line">
                        <span>Amount Paid</span>
                        <strong id="salePaidDisplay">₦0.00</strong>
                    </div>
                    <div class="sale-total-line">
                        <span>Balance Due</span>
                        <strong id="saleBalance">₦0.00</strong>
                    </div>
                </div>

            </form>
        `;

        $('modalFooter').innerHTML = `
            <button type="button"
                    class="btn btn-secondary"
                    id="cancelSale">
                Cancel
            </button>
            <button type="submit"
                    form="saleForm"
                    class="btn btn-primary">
                Complete Sale
            </button>
        `;

        $('modalOverlay').classList.add('active');
        $('modalOverlay').setAttribute('aria-hidden', 'false');

        addSaleItem();

        $('addSaleItem').addEventListener('click', addSaleItem);
        $('cancelSale').addEventListener('click', closeSaleModal);
        $('saleAmountPaid').addEventListener('input', updateSaleTotals);
        $('saleForm').addEventListener('submit', completeSale);
    }

    function addSaleItem() {
        const container = $('saleItemsContainer');
        if (!container) return;

        const products = getProducts().filter(
            product => Number(product.quantity) > 0
        );

        const index = saleItems.length;

        saleItems.push({
            productId: '',
            quantity: 1,
            unitPrice: 0
        });

        const row = document.createElement('div');
        row.className = 'sale-item-row';
        row.dataset.index = index;

        row.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Glass Product</label>
                    <select class="sale-product" data-index="${index}" required>
                        <option value="">Select product</option>
                        ${products.map(product => `
                            <option value="${escapeHTML(product.id)}">
                                ${escapeHTML(product.name)}
                                — Stock: ${Number(product.quantity)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number"
                           class="sale-quantity"
                           data-index="${index}"
                           min="1"
                           step="1"
                           value="1"
                           required>
                </div>

                <div class="form-group">
                    <label>Unit Price (₦)</label>
                    <input type="number"
                           class="sale-price"
                           data-index="${index}"
                           min="0"
                           step="0.01"
                           value="0"
                           required>
                </div>

                <div class="form-group">
                    <label>Line Total</label>
                    <input type="text"
                           class="sale-line-total"
                           data-index="${index}"
                           value="₦0.00"
                           readonly>
                </div>
            </div>

            <button type="button"
                    class="btn-small btn-danger remove-sale-item"
                    data-index="${index}">
                Remove Item
            </button>
        `;

        container.appendChild(row);

        row.querySelector('.sale-product').addEventListener(
            'change',
            event => {
                const product = getProducts().find(
                    item => item.id === event.target.value
                );

                saleItems[index].productId = event.target.value;
                saleItems[index].unitPrice =
                    Number(product?.sellingPrice) || 0;

                row.querySelector('.sale-price').value =
                    saleItems[index].unitPrice;

                updateSaleTotals();
            }
        );

        row.querySelector('.sale-quantity').addEventListener(
            'input',
            event => {
                saleItems[index].quantity = Number(event.target.value);
                updateSaleTotals();
            }
        );

        row.querySelector('.sale-price').addEventListener(
            'input',
            event => {
                saleItems[index].unitPrice = Number(event.target.value);
                updateSaleTotals();
            }
        );

        row.querySelector('.remove-sale-item').addEventListener(
            'click',
            () => {
                saleItems[index] = null;
                row.remove();
                updateSaleTotals();
            }
        );

        updateSaleTotals();
    }

    function calculateTotal() {
        return saleItems.reduce((sum, item) => {
            if (!item) return sum;

            return sum +
                (Number(item.quantity) * Number(item.unitPrice));
        }, 0);
    }

    function updateSaleTotals() {
        let subtotal = 0;

        saleItems.forEach((item, index) => {
            if (!item) return;

            const lineTotal =
                Number(item.quantity) * Number(item.unitPrice);

            subtotal += lineTotal;

            const lineInput = document.querySelector(
                `.sale-line-total[data-index="${index}"]`
            );

            if (lineInput) {
                lineInput.value = money(lineTotal);
            }
        });

        const paid = Number($('saleAmountPaid')?.value) || 0;
        const balance = Math.max(0, subtotal - paid);

        if ($('saleSubtotal')) $('saleSubtotal').textContent = money(subtotal);
        if ($('saleTotal')) $('saleTotal').textContent = money(subtotal);
        if ($('salePaidDisplay')) $('salePaidDisplay').textContent = money(paid);
        if ($('saleBalance')) $('saleBalance').textContent = money(balance);
    }

    function closeSaleModal() {
        $('modalOverlay')?.classList.remove('active');
        $('modalOverlay')?.setAttribute('aria-hidden', 'true');
    }

    function completeSale(event) {
        event.preventDefault();

        const items = saleItems.filter(Boolean);

        if (!items.length) {
            window.showToast?.('Add at least one product to the sale.', 'error');
            return;
        }

        const products = getProducts();
        let total = 0;

        const finalizedItems = [];

        for (const item of items) {
            const product = products.find(
                entry => entry.id === item.productId
            );

            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);

            if (!product) {
                window.showToast?.('One of the selected products no longer exists.', 'error');
                return;
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                window.showToast?.('Enter a valid whole-number quantity.', 'error');
                return;
            }

            if (quantity > Number(product.quantity)) {
                window.showToast?.(
                    `Not enough stock for ${product.name}. Available: ${product.quantity}.`,
                    'error'
                );
                return;
            }

            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                window.showToast?.('Enter a valid product price.', 'error');
                return;
            }

            const lineTotal = quantity * unitPrice;
            total += lineTotal;

            finalizedItems.push({
                productId: product.id,
                productName: product.name,
                productCode: product.code || '',
                quantity,
                unitPrice,
                lineTotal
            });
        }

        const amountPaid = Number($('saleAmountPaid').value);

        if (!Number.isFinite(amountPaid) || amountPaid < 0) {
            window.showToast?.('Enter a valid payment amount.', 'error');
            return;
        }

        if (amountPaid > total) {
            window.showToast?.('Amount paid cannot exceed the sale total.', 'error');
            return;
        }

        const balanceDue = Math.max(0, total - amountPaid);

        const customerId = $('saleCustomer').value;
        const customers = getCustomers();
        const customer = customers.find(
            entry => entry.id === customerId
        );

        if (customerId && !customer) {
            window.showToast?.('The selected customer could not be found.', 'error');
            return;
        }

        const receiptNumber =
            'RCP-' + Date.now().toString().slice(-10);

        const sale = {
            id: createId(),
            receiptNumber,
            customerId: customer?.id || '',
            customerName: customer?.name || 'Walk-in Customer',
            date: new Date($('saleDate').value + 'T12:00:00').toISOString(),
            items: finalizedItems,
            subtotal: total,
            total,
            amountPaid,
            balanceDue,
            paymentMethod: $('salePaymentMethod').value,
            paymentStatus: balanceDue <= 0 ? 'paid' : 'partial',
            notes: $('saleNotes').value.trim(),
            createdAt: new Date().toISOString()
        };

        // Reduce inventory quantities.
        const updatedProducts = products.map(product => {
            const sold = finalizedItems
                .filter(item => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

            return sold
                ? {
                    ...product,
                    quantity: Number(product.quantity) - sold
                }
                : product;
        });

        // Save the updated inventory before recording the sale.
        if (!saveProducts(updatedProducts)) return;

        sales.unshift(sale);

        if (!saveSales()) {
            // Restore stock if the sale could not be saved.
            saveProducts(products);
            sales.shift();
            return;
        }

        // Update the customer's purchase total and outstanding balance.
        if (customer) {
            const updatedCustomers = customers.map(entry => {
                if (entry.id !== customer.id) return entry;

                return {
                    ...entry,
                    totalPurchases:
                        Number(entry.totalPurchases || 0) + total,
                    outstandingBalance:
                        Number(entry.outstandingBalance || 0) + balanceDue,
                    updatedAt: new Date().toISOString()
                };
            });

            if (!saveCustomers(updatedCustomers)) {
                // Roll back sale and stock if customer update fails.
                sales.shift();
                saveSales();
                saveProducts(products);

                window.showToast?.(
                    'Customer balance could not be updated. The sale was not completed.',
                    'error'
                );
                return;
            }
        }

        closeSaleModal();
        renderSales();

        document.dispatchEvent(new CustomEvent('salesUpdated'));
        document.dispatchEvent(new CustomEvent('inventoryUpdated'));

        window.showToast?.(
            `Sale recorded successfully. Receipt: ${receiptNumber}`,
            'success'
        );

        showReceipt(sale);
    }

    function showReceipt(sale) {
        const itemRows = (sale.items || []).map(item => `
            <tr>
                <td>${escapeHTML(item.productName)}</td>
                <td>${item.quantity}</td>
                <td>${money(item.unitPrice)}</td>
                <td>${money(item.lineTotal)}</td>
            </tr>
        `).join('');

        $('modalTitle').textContent = 'Sales Receipt';
        $('modalSubtitle').textContent = sale.receiptNumber;

        $('modalBody').innerHTML = `
            <div class="receipt-content">
                <div style="text-align:center;margin-bottom:22px;">
                    <h2>GlassPro Management Suite</h2>
                    <p>Sales Receipt</p>
                    <h3>${escapeHTML(sale.receiptNumber)}</h3>
                </div>

                <p><strong>Customer:</strong>
                    ${escapeHTML(sale.customerName)}</p>
                <p><strong>Date:</strong>
                    ${new Date(sale.date).toLocaleString('en-GB')}</p>
                <p><strong>Payment:</strong>
                    ${escapeHTML(sale.paymentMethod)}</p>

                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                    </table>
                </div>

                <div style="margin-top:20px;text-align:right;">
                    <p><strong>Total:</strong> ${money(sale.total)}</p>
                    <p><strong>Paid:</strong> ${money(sale.amountPaid)}</p>
                    <p><strong>Balance:</strong> ${money(sale.balanceDue)}</p>
                    <p><strong>Status:</strong>
                        ${sale.paymentStatus === 'paid' ? 'Paid' : 'Partially Paid'}
                    </p>
                </div>

                ${sale.notes
                    ? `<p><strong>Notes:</strong> ${escapeHTML(sale.notes)}</p>`
                    : ''}
            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button"
                    class="btn btn-secondary"
                    id="receiptClose">
                Close
            </button>
            <button type="button"
                    class="btn btn-primary"
                    id="printReceipt">
                Print Receipt
            </button>
        `;

        $('modalOverlay').classList.add('active');
        $('modalOverlay').setAttribute('aria-hidden', 'false');

        $('receiptClose').addEventListener('click', closeSaleModal);

        $('printReceipt').addEventListener('click', () => {
            const receipt = $('modalBody').innerHTML;
            const printWindow = window.open('', '_blank', 'width=850,height=700');

            if (!printWindow) {
                window.showToast?.(
                    'Please allow pop-ups to print the receipt.',
                    'warning'
                );
                return;
            }

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${escapeHTML(sale.receiptNumber)}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 30px;
                            color: #222;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            border-bottom: 1px solid #ddd;
                            padding: 10px;
                            text-align: left;
                        }
                        th {
                            background: #f2f4f8;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>${receipt}</body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        });
    }

    function viewSale(id) {
        const sale = sales.find(entry => entry.id === id);

        if (sale) {
            showReceipt(sale);
        }
    }

    function handleActions(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        if (button.dataset.action === 'new-sale') {
            openSaleModal();
        }

        if (button.dataset.action === 'view-sale') {
            viewSale(button.dataset.id);
        }
    }

    function initialize() {
        loadSales();
        renderSales();

        document.addEventListener('click', handleActions);

        $('salesSearch')?.addEventListener('input', renderSalesTable);
        $('salesPaymentFilter')?.addEventListener('change', renderSalesTable);
        $('salesDateFilter')?.addEventListener('change', renderSalesTable);

        document.addEventListener('pageChanged', event => {
            if (event.detail?.page === 'sales') {
                renderSales();
            }
        });

        document.addEventListener('inventoryUpdated', renderSales);
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();

(function () {
    'use strict';

    if (window.GlassReportsInitialized) return;
    window.GlassReportsInitialized = true;

    const $ = (id) => document.getElementById(id);

    let currentReport = null;

    function readStore(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error('Unable to read ' + key, error);
            return [];
        }
    }

    function money(value) {
        const currency = $('businessCurrency')?.value || 'NGN';
        const amount = Number(value) || 0;

        try {
            return new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            return '₦' + amount.toFixed(2);
        }
    }

    function number(value) {
        return new Intl.NumberFormat().format(Number(value) || 0);
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function getDate(record) {
        const value =
            record.date ||
            record.saleDate ||
            record.purchaseDate ||
            record.createdAt ||
            record.created_at ||
            record.transactionDate ||
            '';

        if (!value) return '';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value).slice(0, 10);
        }

        return date.toISOString().slice(0, 10);
    }

    function getAmount(record) {
        return Number(
            record.total ??
            record.grandTotal ??
            record.totalAmount ??
            record.amount ??
            record.sellingPrice ??
            record.price ??
            0
        ) || 0;
    }

    function getName(record) {
        return (
            record.name ||
            record.customerName ||
            record.productName ||
            record.description ||
            record.title ||
            'Not specified'
        );
    }

    function getRange() {
        const startInput = $('reportStartDate');
        const endInput = $('reportEndDate');

        let start = startInput?.value || '';
        let end = endInput?.value || '';

        if (start && end && start > end) {
            if (window.showToast) {
                window.showToast(
                    'Start date cannot be later than end date.',
                    'error'
                );
            }
            return null;
        }

        if (!start && !end) {
            const period = $('reportPeriod')?.value || 'monthly';
            const today = new Date();
            const first = new Date(today);

            if (period === 'daily') {
                // Today
            } else if (period === 'weekly') {
                const day = first.getDay() || 7;
                first.setDate(first.getDate() - day + 1);
            } else if (period === 'monthly') {
                first.setDate(1);
            } else if (period === 'yearly') {
                first.setMonth(0, 1);
            }

            start = first.toISOString().slice(0, 10);
            end = today.toISOString().slice(0, 10);

            if (startInput) startInput.value = start;
            if (endInput) endInput.value = end;
        }

        return { start, end };
    }

    function inRange(record, range) {
        const date = getDate(record);

        if (!date) return false;
        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;

        return true;
    }

    function getFiltered(key, range) {
        return readStore(key).filter(item => inRange(item, range));
    }

    function table(headers, rows) {
        if (!rows.length) {
            return `
                <div class="empty-state">
                    No records were found for the selected period.
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function summaryCards(items) {
        return `
            <div class="stats-grid compact-stats">
                ${items.map(item => `
                    <article class="stat-card">
                        <p>${escapeHTML(item.label)}</p>
                        <h3>${escapeHTML(item.value)}</h3>
                    </article>
                `).join('')}
            </div>
        `;
    }

    function renderSales(range) {
        const sales = getFiltered('glasspro_sales', range);

        const revenue = sales.reduce(
            (sum, sale) => sum + getAmount(sale), 0
        );

        const paid = sales.reduce(
            (sum, sale) => sum + Number(
                sale.amountPaid ??
                sale.paidAmount ??
                sale.paid ??
                0
            ), 0
        );

        const outstanding = Math.max(0, revenue - paid);

        const rows = sales.map(sale => [
            escapeHTML(sale.receiptNumber || sale.receiptNo || sale.code || sale.id || '—'),
            escapeHTML(sale.customerName || sale.customer || 'Walk-in Customer'),
            escapeHTML(getDate(sale) || '—'),
            number(
                Array.isArray(sale.items)
                    ? sale.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                    : sale.quantity || 0
            ),
            money(getAmount(sale)),
            money(
                sale.amountPaid ??
                sale.paidAmount ??
                sale.paid ??
                0
            )
        ]);

        return {
            title: 'Sales Report',
            count: sales.length,
            total: revenue,
            headers: ['Receipt No.', 'Customer', 'Date', 'Quantity', 'Sales Amount', 'Amount Paid'],
            rows,
            html: summaryCards([
                { label: 'Transactions', value: number(sales.length) },
                { label: 'Total Sales', value: money(revenue) },
                { label: 'Amount Collected', value: money(paid) },
                { label: 'Outstanding', value: money(outstanding) }
            ]) + table(
                ['Receipt No.', 'Customer', 'Date', 'Quantity', 'Sales Amount', 'Amount Paid'],
                rows
            )
        };
    }

    function renderInventory() {
        const products = readStore('glasspro_products');

        const totalQuantity = products.reduce(
            (sum, product) => sum + Number(product.quantity || 0), 0
        );

        const stockValue = products.reduce(
            (sum, product) =>
                sum + Number(product.quantity || 0) *
                Number(product.costPrice || 0), 0
        );

        const lowStock = products.filter(product =>
            Number(product.quantity || 0) <= Number(product.minimumStock || 0)
        );

        const rows = products.map(product => [
            escapeHTML(product.name),
            escapeHTML(product.code || '—'),
            escapeHTML(product.thickness || '—'),
            number(product.quantity),
            money(product.costPrice),
            money(product.sellingPrice),
            Number(product.quantity || 0) <= Number(product.minimumStock || 0)
                ? '<span class="status-badge status-warning">Low Stock</span>'
                : '<span class="status-badge status-success">Available</span>'
        ]);

        return {
            title: 'Inventory Report',
            count: products.length,
            total: stockValue,
            headers: ['Product', 'Code', 'Thickness', 'Quantity', 'Cost Price', 'Selling Price', 'Stock Status'],
            rows,
            html: summaryCards([
                { label: 'Products', value: number(products.length) },
                { label: 'Total Stock Quantity', value: number(totalQuantity) },
                { label: 'Low Stock Products', value: number(lowStock.length) },
                { label: 'Estimated Stock Cost', value: money(stockValue) }
            ]) + table(
                ['Product', 'Code', 'Thickness', 'Quantity', 'Cost Price', 'Selling Price', 'Stock Status'],
                rows
            )
        };
    }

    function renderCustomers() {
        const customers = readStore('glasspro_customers');

        const totalPurchases = customers.reduce(
            (sum, customer) => sum + Number(customer.totalPurchases || 0), 0
        );

        const outstanding = customers.reduce(
            (sum, customer) => sum + Number(customer.outstandingBalance || 0), 0
        );

        const rows = customers.map(customer => [
            escapeHTML(customer.name),
            escapeHTML(customer.phone || '—'),
            escapeHTML(customer.email || '—'),
            escapeHTML(customer.type || 'Individual'),
            money(customer.totalPurchases),
            money(customer.outstandingBalance)
        ]);

        return {
            title: 'Customer Report',
            count: customers.length,
            total: totalPurchases,
            headers: ['Customer', 'Phone', 'Email', 'Type', 'Total Purchases', 'Outstanding Balance'],
            rows,
            html: summaryCards([
                { label: 'Registered Customers', value: number(customers.length) },
                { label: 'Customer Purchases', value: money(totalPurchases) },
                { label: 'Outstanding Balances', value: money(outstanding) }
            ]) + table(
                ['Customer', 'Phone', 'Email', 'Type', 'Total Purchases', 'Outstanding Balance'],
                rows
            )
        };
    }

    function renderExpenses(range) {
        const expenses = getFiltered('glasspro_expenses', range);

        const total = expenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0), 0
        );

        const categories = {};

        expenses.forEach(expense => {
            const category = expense.category || 'Other';
            categories[category] = (categories[category] || 0) +
                Number(expense.amount || 0);
        });

        const rows = expenses.map(expense => [
            escapeHTML(expense.id || '—'),
            escapeHTML(expense.description || '—'),
            escapeHTML(expense.category || 'Other'),
            escapeHTML(getDate(expense) || '—'),
            escapeHTML(expense.paymentMethod || '—'),
            money(expense.amount)
        ]);

        const categoryRows = Object.entries(categories).map(([name, amount]) => [
            escapeHTML(name),
            money(amount)
        ]);

        return {
            title: 'Expenses Report',
            count: expenses.length,
            total,
            headers: ['Expense ID', 'Description', 'Category', 'Date', 'Payment Method', 'Amount'],
            rows,
            html: summaryCards([
                { label: 'Expense Records', value: number(expenses.length) },
                { label: 'Total Expenses', value: money(total) },
                { label: 'Expense Categories', value: number(Object.keys(categories).length) }
            ]) +
            '<h3>Expense Records</h3>' +
            table(
                ['Expense ID', 'Description', 'Category', 'Date', 'Payment Method', 'Amount'],
                rows
            ) +
            '<h3>Expenses by Category</h3>' +
            table(['Category', 'Total Amount'], categoryRows)
        };
    }

    function renderProfit(range) {
        const sales = getFiltered('glasspro_sales', range);
        const expenses = getFiltered('glasspro_expenses', range);

        const revenue = sales.reduce(
            (sum, sale) => sum + getAmount(sale), 0
        );

        const operatingExpenses = expenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0), 0
        );

        const result = revenue - operatingExpenses;

        const rows = [
            ['Sales Revenue', money(revenue)],
            ['Recorded Operating Expenses', money(operatingExpenses)],
            ['Operating Result Before Cost of Goods Sold', money(result)]
        ];

        return {
            title: 'Profit & Loss Report',
            count: sales.length + expenses.length,
            total: result,
            headers: ['Description', 'Amount'],
            rows,
            html: summaryCards([
                { label: 'Sales Revenue', value: money(revenue) },
                { label: 'Operating Expenses', value: money(operatingExpenses) },
                { label: 'Operating Result', value: money(result) }
            ]) +
            table(['Description', 'Amount'], rows) +
            `<p class="stat-description">
                This is a preliminary operating result calculated from recorded
                sales and operating expenses. It does not deduct cost of goods
                sold, taxes, depreciation, or other unrecorded costs.
            </p>`
        };
    }

    function generateReport() {
        const range = getRange();
        if (!range) return;

        const type = $('reportType')?.value || 'sales';

        const generators = {
            sales: () => renderSales(range),
            inventory: () => renderInventory(),
            customers: () => renderCustomers(),
            expenses: () => renderExpenses(range),
            profit: () => renderProfit(range)
        };

        currentReport = generators[type]();

        const results = $('reportResults');

        if (!results) return;

        results.innerHTML = `
            <div class="report-heading">
                <h3>${escapeHTML(currentReport.title)}</h3>
                <p>
                    Reporting period:
                    ${escapeHTML(range.start || 'All dates')}
                    to
                    ${escapeHTML(range.end || 'Present')}
                </p>
            </div>
            ${currentReport.html}
        `;

        if (window.showToast) {
            window.showToast('Report generated successfully.', 'success');
        }
    }

    function exportReport() {
        if (!currentReport) {
            generateReport();
        }

        if (!currentReport) return;

        const rows = [
            currentReport.headers,
            ...currentReport.rows.map(row =>
                row.map(cell => String(cell).replace(/<[^>]*>/g, '').trim())
            )
        ];

        const csv = rows.map(row =>
            row.map(value =>
                '"' + String(value ?? '').replace(/"/g, '""') + '"'
            ).join(',')
        ).join('\r\n');

        const blob = new Blob(['\uFEFF' + csv], {
            type: 'text/csv;charset=utf-8;'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download =
            currentReport.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
            '-' + new Date().toISOString().slice(0, 10) + '.csv';

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        if (window.showToast) {
            window.showToast('Report exported successfully.', 'success');
        }
    }

    document.addEventListener('click', function (event) {
        const generateButton = event.target.closest('[data-action="generate-report"]');
        const exportButton = event.target.closest('[data-action="export-report"]');

        if (generateButton) {
            event.preventDefault();
            generateReport();
        }

        if (exportButton) {
            event.preventDefault();
            exportReport();
        }
    });

    document.addEventListener('change', function (event) {
        if (
            event.target.matches('#reportType') ||
            event.target.matches('#reportPeriod') ||
            event.target.matches('#reportStartDate') ||
            event.target.matches('#reportEndDate')
        ) {
            currentReport = null;
        }
    });

    window.addEventListener('storage', function () {
        currentReport = null;
    });

    document.addEventListener('DOMContentLoaded', function () {
        const today = new Date().toISOString().slice(0, 10);

        if ($('reportEndDate') && !$('reportEndDate').value) {
            $('reportEndDate').value = today;
        }
    });

    window.GlassReports = {
        generate: generateReport,
        export: exportReport
    };

})();

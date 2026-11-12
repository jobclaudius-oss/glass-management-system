'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // Dashboard metric elements
    const metricIds = [
        'totalProducts',
        'totalSales',
        'totalCustomers',
        'totalOrders',
        'pendingOrders',
        'completedOrders',
        'totalRevenue',
        'lowStockCount'
    ];

    // Initialise metrics without inventing business records.
    metricIds.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = id === 'totalRevenue'
                ? '$0.00'
                : '0';
        }
    });

    // Show an empty-state message in a table when it has no records.
    function setTableEmpty(tableId, message, columnCount = 5) {
        const tableBody = document.getElementById(tableId);

        if (!tableBody || tableBody.children.length > 0) {
            return;
        }

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = columnCount;
        cell.textContent = message;
        cell.className = 'empty-table-message';

        row.appendChild(cell);
        tableBody.appendChild(row);
    }

    setTableEmpty(
        'recentOrdersTable',
        'No orders have been recorded yet.',
        5
    );

    setTableEmpty(
        'salesTableBody',
        'No sales have been recorded yet.',
        5
    );

    // Prepare the recent transactions area.
    const transactions = document.getElementById('recentTransactions');

    if (transactions && transactions.children.length === 0) {
        const emptyMessage = document.createElement('p');

        emptyMessage.className = 'empty-state';
        emptyMessage.textContent = 'No transactions available yet.';

        transactions.appendChild(emptyMessage);
    }

    // Prepare the inventory summary area.
    const inventorySummary = document.getElementById('inventorySummary');

    if (inventorySummary && inventorySummary.children.length === 0) {
        const emptyMessage = document.createElement('p');

        emptyMessage.className = 'empty-state';
        emptyMessage.textContent = 'Your inventory summary will appear here.';

        inventorySummary.appendChild(emptyMessage);
    }

    console.log('Glass Management System dashboard initialized.');
});

'use strict';

(() => {
    const STORAGE_KEY = 'glasspro_orders';

    const $ = (id) => document.getElementById(id);

    let orders = [];
    let orderItems = [];

    const STATUSES = [
        'Pending',
        'Processing',
        'Approved',
        'Ready for Pickup',
        'Out for Delivery',
        'Completed',
        'Cancelled'
    ];

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
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

    function readOrders() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    }

    function saveOrders() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
            return true;
        } catch {
            window.showToast?.('Unable to save orders. Check your browser storage.', 'error');
            return false;
        }
    }

    function getProducts() {
        return window.GlassStore?.getProducts?.() || [];
    }

    function getCustomers() {
        try {
            const saved = JSON.parse(localStorage.getItem('glasspro_customers'));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    }

    function generateOrderNumber() {
        const date = new Date();
        const datePart = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('');

        const randomPart = Math.floor(1000 + Math.random() * 9000);

        return `ORD-${datePart}-${randomPart}`;
    }

    function renderStatus(status) {
        const className = status.toLowerCase().replace(/[^a-z]+/g, '-');

        return `<span class="status-badge status-${className}">
            ${escapeHTML(status)}
        </span>`;
    }

    function renderStats() {
        const counts = {
            Pending: 0,
            Processing: 0,
            Approved: 0,
            'Ready for Pickup': 0,
            'Out for Delivery': 0,
            Completed: 0
        };

        orders.forEach(order => {
            if (Object.prototype.hasOwnProperty.call(counts, order.status)) {
                counts[order.status]++;
            }
        });

        if ($('ordersPending')) $('ordersPending').textContent = counts.Pending;
        if ($('ordersProcessing')) $('ordersProcessing').textContent = counts.Processing;
        if ($('ordersApproved')) $('ordersApproved').textContent = counts.Approved;
        if ($('ordersReady')) $('ordersReady').textContent = counts['Ready for Pickup'];
        if ($('ordersDelivery')) $('ordersDelivery').textContent = counts['Out for Delivery'];
        if ($('ordersCompleted')) $('ordersCompleted').textContent = counts.Completed;

        if ($('totalOrders')) $('totalOrders').textContent = orders.length;
        if ($('pendingOrders')) $('pendingOrders').textContent = counts.Pending;
        if ($('completedOrders')) $('completedOrders').textContent = counts.Completed;
    }

    function renderOrders() {
        const tbody = $('ordersTableBody');
        if (!tbody) return;

        const search = ($('orderSearch')?.value || '').toLowerCase().trim();
        const statusFilter = $('orderStatusFilter')?.value || '';

        const filtered = orders.filter(order => {
            const matchesSearch =
                String(order.orderNumber || '').toLowerCase().includes(search) ||
                String(order.customerName || '').toLowerCase().includes(search);

            const matchesStatus = !statusFilter || order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        ${orders.length
                            ? 'No orders match your search.'
                            : 'No orders have been created yet.'}
                    </td>
                </tr>
            `;
            renderStats();
            return;
        }

        tbody.innerHTML = filtered.map(order => `
            <tr>
                <td>
                    <strong>${escapeHTML(order.orderNumber)}</strong>
                    <div class="table-subtext">${escapeHTML(order.orderType)}</div>
                </td>
                <td>${escapeHTML(order.customerName)}</td>
                <td>${escapeHTML(order.orderDate)}</td>
                <td>${escapeHTML(order.deliveryDate || 'Not scheduled')}</td>
                <td>
                    <strong>${money(order.total)}</strong>
                    <div class="table-subtext">
                        Balance: ${money(order.balanceDue)}
                    </div>
                </td>
                <td>${renderStatus(order.status)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-small"
                            data-order-action="view"
                            data-id="${escapeHTML(order.id)}">View</button>

                        <button class="btn btn-small"
                            data-order-action="edit"
                            data-id="${escapeHTML(order.id)}">Edit</button>

                        <button class="btn btn-small"
                            data-order-action="status"
                            data-id="${escapeHTML(order.id)}">Status</button>
                    </div>
                </td>
            </tr>
        `).join('');

        renderStats();
    }

    function renderAll() {
        orders = readOrders();
        renderStats();
        renderOrders();
    }

    function customerOptions(selectedId = '') {
        const customers = getCustomers();

        return `
            <option value="">Select a customer</option>
            ${customers.map(customer => `
                <option value="${escapeHTML(customer.id)}"
                    ${String(customer.id) === String(selectedId) ? 'selected' : ''}>
                    ${escapeHTML(customer.name)}
                    ${customer.phone ? ` - ${escapeHTML(customer.phone)}` : ''}
                </option>
            `).join('')}
        `;
    }

    function productOptions(selectedId = '') {
        const products = getProducts();

        return `
            <option value="">Select a glass product</option>
            ${products.map(product => `
                <option value="${escapeHTML(product.id)}"
                    ${String(product.id) === String(selectedId) ? 'selected' : ''}>
                    ${escapeHTML(product.name)}
                    (${escapeHTML(product.code || 'No code')})
                </option>
            `).join('')}
        `;
    }

    function calculateItemsTotal() {
        return orderItems.reduce((sum, item) => {
            return sum + (Number(item.quantity) * Number(item.unitPrice));
        }, 0);
    }

    function updateOrderTotal() {
        const total = calculateItemsTotal();
        const deposit = Number($('orderDeposit')?.value || 0);

        if ($('orderTotal')) $('orderTotal').textContent = money(total);
        if ($('orderBalance')) {
            $('orderBalance').textContent = money(Math.max(0, total - deposit));
        }
    }

    function renderItemRows() {
        const container = $('orderItemsContainer');
        if (!container) return;

        if (!orderItems.length) {
            container.innerHTML = `
                <p class="empty-table">No products added to this order yet.</p>
            `;
            updateOrderTotal();
            return;
        }

        container.innerHTML = orderItems.map((item, index) => `
            <div class="order-item-row"
                style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:12px;">

                <div class="form-group">
                    <label>Glass Product</label>
                    <select data-item-field="product" data-index="${index}">
                        ${productOptions(item.productId)}
                    </select>
                </div>

                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" step="1"
                        value="${escapeHTML(item.quantity)}"
                        data-item-field="quantity"
                        data-index="${index}">
                </div>

                <div class="form-group">
                    <label>Unit Price (₦)</label>
                    <input type="number" min="0" step="0.01"
                        value="${escapeHTML(item.unitPrice)}"
                        data-item-field="price"
                        data-index="${index}">
                </div>

                <button type="button" class="btn btn-small"
                    data-remove-item="${index}">Remove</button>
            </div>
        `).join('');

        updateOrderTotal();
    }

    function addOrderItem() {
        const products = getProducts();

        if (!products.length) {
            window.showToast?.('Add a glass product to inventory first.', 'error');
            return;
        }

        orderItems.push({
            productId: '',
            productName: '',
            quantity: 1,
            unitPrice: 0
        });

        renderItemRows();
    }

    function fillProductPrice(index, productId) {
        const product = getProducts().find(item =>
            String(item.id) === String(productId)
        );

        if (!product) return;

        orderItems[index].productId = product.id;
        orderItems[index].productName = product.name;
        orderItems[index].unitPrice = Number(product.sellingPrice) || 0;

        renderItemRows();
    }

    function openOrderModal(order = null) {
        const isEditing = Boolean(order);

        orderItems = isEditing
                ? order.items.map(item => ({ ...item }))
                : [{
                    productId: '',
                    productName: '',
                    quantity: 1,
                    unitPrice: 0
                }];

        const today = new Date().toISOString().slice(0, 10);

        window.openModal?.(
            isEditing ? 'Edit Customer Order' : 'Create New Order',
            'Enter the customer order details and glass products.'
        );

        $('modalBody').innerHTML = `
            <div class="form-grid">

                <div class="form-group">
                    <label for="orderCustomer">Customer *</label>
                    <select id="orderCustomer" required>
                        ${customerOptions(order?.customerId || '')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="orderType">Order Type *</label>
                    <select id="orderType">
                        <option value="Pickup" ${order?.orderType === 'Pickup' ? 'selected' : ''}>Customer Pickup</option>
                        <option value="Delivery" ${order?.orderType === 'Delivery' ? 'selected' : ''}>Delivery</option>
                        <option value="Installation" ${order?.orderType === 'Installation' ? 'selected' : ''}>Installation</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="orderDate">Order Date *</label>
                    <input type="date" id="orderDate"
                        value="${escapeHTML(order?.orderDate || today)}" required>
                </div>

                <div class="form-group">
                    <label for="orderDeliveryDate">Expected Delivery Date</label>
                    <input type="date" id="orderDeliveryDate"
                        value="${escapeHTML(order?.deliveryDate || '')}">
                </div>

                <div class="form-group">
                    <label for="orderDeposit">Deposit / Amount Paid (₦)</label>
                    <input type="number" id="orderDeposit" min="0" step="0.01"
                        value="${escapeHTML(order?.deposit ?? 0)}">
                </div>

                <div class="form-group">
                    <label for="orderStatus">Order Status</label>
                    <select id="orderStatus">
                        ${STATUSES.map(status => `
                            <option value="${status}"
                                ${(order?.status || 'Pending') === status ? 'selected' : ''}>
                                ${status}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label for="orderAddress">Delivery Address</label>
                    <textarea id="orderAddress" rows="2"
                        placeholder="Enter delivery or installation address">${escapeHTML(order?.address || '')}</textarea>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label>Order Products *</label>
                    <div id="orderItemsContainer"></div>
                    <button type="button" class="btn btn-secondary"
                        id="addOrderItem">+ Add Product</button>
                </div>

                <div class="form-group">
                    <label>Total Order Amount</label>
                    <strong id="orderTotal">${money(order?.total || 0)}</strong>
                </div>

                <div class="form-group">
                    <label>Outstanding Balance</label>
                    <strong id="orderBalance">${money(order?.balanceDue || 0)}</strong>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label for="orderNotes">Additional Notes</label>
                    <textarea id="orderNotes" rows="3"
                        placeholder="Special instructions or customer requirements">${escapeHTML(order?.notes || '')}</textarea>
                </div>

            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="cancelOrder">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" id="saveOrder">
                ${isEditing ? 'Save Changes' : 'Create Order'}
            </button>
        `;

        renderItemRows();

        $('addOrderItem').addEventListener('click', addOrderItem);

        $('orderDeposit').addEventListener('input', updateOrderTotal);

        $('orderItemsContainer').addEventListener('change', event => {
            const field = event.target.dataset.itemField;
            const index = Number(event.target.dataset.index);

            if (!field || !orderItems[index]) return;

            if (field === 'product') {
                fillProductPrice(index, event.target.value);
                return;
            }

            if (field === 'quantity') {
                orderItems[index].quantity = Math.max(
                    1,
                    Number(event.target.value) || 1
                );
            }

            if (field === 'price') {
                orderItems[index].unitPrice = Math.max(
                    0,
                    Number(event.target.value) || 0
                );
            }

            updateOrderTotal();
        });

        $('orderItemsContainer').addEventListener('input', event => {
            const field = event.target.dataset.itemField;
            const index = Number(event.target.dataset.index);

            if (!field || !orderItems[index]) return;

            if (field === 'quantity') {
                orderItems[index].quantity = Math.max(1, Number(event.target.value) || 1);
            }

            if (field === 'price') {
                orderItems[index].unitPrice = Math.max(0, Number(event.target.value) || 0);
            }

            updateOrderTotal();
        });

        $('orderItemsContainer').addEventListener('click', event => {
            const button = event.target.closest('[data-remove-item]');
            if (!button) return;

            orderItems.splice(Number(button.dataset.removeItem), 1);
            renderItemRows();
        });

        $('cancelOrder').addEventListener('click', () => {
            window.closeModal?.();
        });

        $('saveOrder').addEventListener('click', () => {
            saveOrder(order?.id || null);
        });
    }

    function saveOrder(existingId = null) {
        const customerId = $('orderCustomer').value;
        const customer = getCustomers().find(item =>
            String(item.id) === String(customerId)
        );

        if (!customer) {
            window.showToast?.('Please select a registered customer.', 'error');
            return;
        }

        if (!orderItems.length) {
            window.showToast?.('Please add at least one product.', 'error');
            return;
        }

        for (const item of orderItems) {
            if (!item.productId) {
                window.showToast?.('Please select a product for every order item.', 'error');
                return;
            }

            if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
                window.showToast?.('Product quantities must be whole numbers greater than zero.', 'error');
                return;
            }

            if (Number(item.unitPrice) < 0) {
                window.showToast?.('Product prices cannot be negative.', 'error');
                return;
            }
        }

        const orderDate = $('orderDate').value;
        const deliveryDate = $('orderDeliveryDate').value;
        const total = calculateItemsTotal();
        const deposit = Number($('orderDeposit').value || 0);

        if (!orderDate) {
            window.showToast?.('Please enter the order date.', 'error');
            return;
        }

        if (deliveryDate && deliveryDate < orderDate) {
            window.showToast?.('Delivery date cannot be earlier than the order date.', 'error');
            return;
        }

        if (!Number.isFinite(deposit) || deposit < 0 || deposit > total) {
            window.showToast?.('Deposit must be between zero and the total order amount.', 'error');
            return;
        }

        const now = new Date().toISOString();

        const existing = existingId
            ? orders.find(item => String(item.id) === String(existingId))
            : null;

        const order = {
            id: existing?.id || window.GlassStore.createId('order'),
            orderNumber: existing?.orderNumber || generateOrderNumber(),
            customerId: customer.id,
            customerName: customer.name,
            orderType: $('orderType').value,
            orderDate,
            deliveryDate,
            address: $('orderAddress').value.trim(),
            items: orderItems.map(item => {
                const product = getProducts().find(product =>
                    String(product.id) === String(item.productId)
                );

                return {
                    productId: item.productId,
                    productName: product?.name || item.productName,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    lineTotal: Number(item.quantity) * Number(item.unitPrice)
                };
            }),
            total,
            deposit,
            balanceDue: total - deposit,
            status: $('orderStatus').value,
            notes: $('orderNotes').value.trim(),
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };

        if (existing) {
            const index = orders.findIndex(item =>
                String(item.id) === String(existingId)
            );
            orders[index] = order;
        } else {
            orders.unshift(order);
        }

        if (!saveOrders()) {
            renderAll();
            return;
        }

        window.closeModal?.();
        renderAll();

        window.showToast?.(
            existing ? 'Order updated successfully.' : 'New order created successfully.',
            'success'
        );

        document.dispatchEvent(new CustomEvent('ordersUpdated'));
    }

    function viewOrder(order) {
        const itemRows = order.items.map(item => `
            <tr>
                <td>${escapeHTML(item.productName)}</td>
                <td>${escapeHTML(item.quantity)}</td>
                <td>${money(item.unitPrice)}</td>
                <td>${money(item.lineTotal)}</td>
            </tr>
        `).join('');

        window.openModal?.('Order Details', order.orderNumber);

        $('modalBody').innerHTML = `
            <div class="form-grid">
                <div><strong>Customer:</strong><br>${escapeHTML(order.customerName)}</div>
                <div><strong>Order Type:</strong><br>${escapeHTML(order.orderType)}</div>
                <div><strong>Order Date:</strong><br>${escapeHTML(order.orderDate)}</div>
                <div><strong>Delivery Date:</strong><br>${escapeHTML(order.deliveryDate || 'Not scheduled')}</div>
                <div><strong>Status:</strong><br>${renderStatus(order.status)}</div>
                <div><strong>Deposit:</strong><br>${money(order.deposit)}</div>
                <div><strong>Total:</strong><br>${money(order.total)}</div>
                <div><strong>Balance:</strong><br>${money(order.balanceDue)}</div>
                <div style="grid-column:1/-1;"><strong>Address:</strong><br>${escapeHTML(order.address || 'Not provided')}</div>
            </div>

            <h3 style="margin:20px 0 10px;">Order Products</h3>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>

            <div style="margin-top:16px;">
                <strong>Additional Notes</strong>
                <p>${escapeHTML(order.notes || 'No additional notes.')}</p>
            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="closeOrderDetails">
                Close
            </button>
            <button type="button" class="btn btn-primary" id="printOrder">
                Print Order
            </button>
        `;

        $('closeOrderDetails').addEventListener('click', () => {
            window.closeModal?.();
        });

        $('printOrder').addEventListener('click', () => {
            printOrder(order);
        });
    }

    function printOrder(order) {
        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            window.showToast?.('Please allow pop-ups to print this order.', 'error');
            return;
        }

        const rows = order.items.map(item => `
            <tr>
                <td>${escapeHTML(item.productName)}</td>
                <td>${escapeHTML(item.quantity)}</td>
                <td>${money(item.unitPrice)}</td>
                <td>${money(item.lineTotal)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHTML(order.orderNumber)}</title>
                <style>
                    body{font-family:Arial,sans-serif;padding:35px;color:#222}
                    h1{margin-bottom:5px}
                    .muted{color:#666}
                    table{width:100%;border-collapse:collapse;margin-top:25px}
                    th,td{padding:12px;border:1px solid #ddd;text-align:left}
                    .totals{margin-top:25px;text-align:right;line-height:2}
                </style>
            </head>
            <body>
                <h1>Glass Management System</h1>
                <p class="muted">Customer Order</p>
                <hr>
                <h2>${escapeHTML(order.orderNumber)}</h2>
                <p><strong>Customer:</strong> ${escapeHTML(order.customerName)}</p>
                <p><strong>Order Date:</strong> ${escapeHTML(order.orderDate)}</p>
                <p><strong>Delivery Date:</strong> ${escapeHTML(order.deliveryDate || 'Not scheduled')}</p>
                <p><strong>Order Type:</strong> ${escapeHTML(order.orderType)}</p>
                <p><strong>Status:</strong> ${escapeHTML(order.status)}</p>

                <table>
                    <thead>
                        <tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>

                <div class="totals">
                    <strong>Total: ${money(order.total)}</strong><br>
                    Deposit: ${money(order.deposit)}<br>
                    Balance Due: ${money(order.balanceDue)}
                </div>

                <p><strong>Address:</strong> ${escapeHTML(order.address || 'Not provided')}</p>
                <p><strong>Notes:</strong> ${escapeHTML(order.notes || 'None')}</p>
                <script>window.onload = function(){ window.print(); };</script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    function updateOrderStatus(order) {
        window.openModal?.('Update Order Status', order.orderNumber);

        $('modalBody').innerHTML = `
            <div class="form-group">
                <label for="newOrderStatus">Select New Status</label>
                <select id="newOrderStatus">
                    ${STATUSES.map(status => `
                        <option value="${status}"
                            ${order.status === status ? 'selected' : ''}>
                            ${status}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="cancelStatus">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" id="saveStatus">
                Update Status
            </button>
        `;

        $('cancelStatus').addEventListener('click', () => {
            window.closeModal?.();
        });

        $('saveStatus').addEventListener('click', () => {
            const newStatus = $('newOrderStatus').value;
            const index = orders.findIndex(item => item.id === order.id);

            if (index === -1) return;

            orders[index].status = newStatus;
            orders[index].updatedAt = new Date().toISOString();

            if (!saveOrders()) return;

            window.closeModal?.();
            renderAll();

            window.showToast?.('Order status updated successfully.', 'success');
            document.dispatchEvent(new CustomEvent('ordersUpdated'));
        });
    }

    function handleTableActions(event) {
        const button = event.target.closest('[data-order-action]');
        if (!button) return;

        const order = orders.find(item =>
            String(item.id) === String(button.dataset.id)
        );

        if (!order) return;

        const action = button.dataset.orderAction;

        if (action === 'view') viewOrder(order);
        if (action === 'edit') openOrderModal(order);
        if (action === 'status') updateOrderStatus(order);
    }

    function bindEvents() {
        document.addEventListener('click', event => {
            const createButton = event.target.closest('[data-action="new-order"]');

            if (createButton) {
                if (!getCustomers().length) {
                    window.showToast?.('Please register a customer before creating an order.', 'error');
                    return;
                }

                openOrderModal();
            }
        });

        $('ordersTableBody')?.addEventListener('click', handleTableActions);

        $('orderSearch')?.addEventListener('input', renderOrders);
        $('orderStatusFilter')?.addEventListener('change', renderOrders);

        document.addEventListener('pageChanged', event => {
            if (event.detail?.page === 'orders') {
                renderAll();
            }
        });

        document.addEventListener('salesUpdated', renderAll);
    }

    document.addEventListener('DOMContentLoaded', () => {
        orders = readOrders();
        bindEvents();
        renderAll();
    });

})();

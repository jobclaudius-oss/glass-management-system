'use strict';

(() => {
    const STORAGE_KEY = 'glasspro_purchases';
    const $ = id => document.getElementById(id);

    let purchases = [];
    let purchaseItems = [];

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

    function readPurchases() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function savePurchases() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
            return true;
        } catch {
            window.showToast?.('Unable to save purchase records.', 'error');
            return false;
        }
    }

    function getProducts() {
        return window.GlassStore?.getProducts?.() || [];
    }

    function getSuppliers() {
        try {
            const data = JSON.parse(localStorage.getItem('glasspro_suppliers'));
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function createPurchaseNumber() {
        const date = new Date();
        const stamp = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('');

        return `PUR-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    function getPaymentStatus(purchase) {
        if (Number(purchase.amountPaid) >= Number(purchase.total)) {
            return 'Paid';
        }

        return Number(purchase.amountPaid) > 0 ? 'Partially Paid' : 'Unpaid';
    }

    function statusBadge(status) {
        let className = 'status-pending';

        if (status === 'Received' || status === 'Paid') {
            className = 'status-completed';
        }

        if (status === 'Cancelled' || status === 'Unpaid') {
            className = 'status-cancelled';
        }

        return `<span class="status-badge ${className}">
            ${escapeHTML(status)}
        </span>`;
    }

    function renderStats() {
        const activePurchases = purchases.filter(p => p.status !== 'Cancelled');

        const totalCost = activePurchases.reduce(
            (sum, p) => sum + Number(p.total || 0), 0
        );

        const pendingPayments = activePurchases.reduce(
            (sum, p) => sum + Math.max(0, Number(p.total || 0) - Number(p.amountPaid || 0)), 0
        );

        const paidCount = activePurchases.filter(
            p => getPaymentStatus(p) === 'Paid'
        ).length;

        if ($('purchaseTotal')) $('purchaseTotal').textContent = activePurchases.length;
        if ($('purchaseCost')) $('purchaseCost').textContent = money(totalCost);
        if ($('purchasePending')) $('purchasePending').textContent = money(pendingPayments);
        if ($('purchasePaid')) $('purchasePaid').textContent = paidCount;
    }

    function renderPurchases() {
        const tbody = $('purchasesTableBody');
        if (!tbody) return;

        if (!purchases.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-table">
                        No purchase records yet. Click New Purchase to get started.
                    </td>
                </tr>
            `;
            return;
        }

        const sorted = [...purchases].sort((a, b) =>
            String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        );

        tbody.innerHTML = sorted.map(purchase => {
            const productCount = purchase.items.reduce(
                (sum, item) => sum + Number(item.quantity || 0), 0
            );

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(purchase.purchaseNumber)}</strong>
                        <div class="table-subtext">
                            ${escapeHTML(purchase.invoiceNumber || 'No invoice number')}
                        </div>
                    </td>
                    <td>${escapeHTML(purchase.supplierName)}</td>
                    <td>${escapeHTML(purchase.purchaseDate)}</td>
                    <td>${productCount} item(s)</td>
                    <td>
                        <strong>${money(purchase.total)}</strong>
                        <div class="table-subtext">
                            Paid: ${money(purchase.amountPaid)}
                        </div>
                    </td>
                    <td>
                        ${statusBadge(getPaymentStatus(purchase))}
                        <div class="table-subtext">
                            ${statusBadge(purchase.status)}
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-small"
                                data-purchase-action="view"
                                data-id="${escapeHTML(purchase.id)}">
                                View
                            </button>
                            <button class="btn btn-small"
                                data-purchase-action="edit"
                                data-id="${escapeHTML(purchase.id)}">
                                Edit
                            </button>
                            <button class="btn btn-small"
                                data-purchase-action="delete"
                                data-id="${escapeHTML(purchase.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderAll() {
        purchases = readPurchases();
        renderStats();
        renderPurchases();
    }

    function supplierOptions(selectedId = '') {
        return `
            <option value="">Select a supplier</option>
            ${getSuppliers().map(supplier => `
                <option value="${escapeHTML(supplier.id)}"
                    ${String(supplier.id) === String(selectedId) ? 'selected' : ''}>
                    ${escapeHTML(supplier.name)}
                </option>
            `).join('')}
        `;
    }

    function productOptions(selectedId = '') {
        return `
            <option value="">Select a product</option>
            ${getProducts().map(product => `
                <option value="${escapeHTML(product.id)}"
                    ${String(product.id) === String(selectedId) ? 'selected' : ''}>
                    ${escapeHTML(product.name)}
                    (${escapeHTML(product.code || 'No code')})
                </option>
            `).join('')}
        `;
    }

    function calculateTotal() {
        return purchaseItems.reduce((sum, item) =>
            sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0
        );
    }

    function updateTotals() {
        const total = calculateTotal();
        const paid = Number($('purchaseAmountPaid')?.value || 0);

        if ($('purchaseFormTotal')) {
            $('purchaseFormTotal').textContent = money(total);
        }

        if ($('purchaseFormBalance')) {
            $('purchaseFormBalance').textContent = money(Math.max(0, total - paid));
        }
    }

    function renderItemRows() {
        const container = $('purchaseItemsContainer');
        if (!container) return;

        if (!purchaseItems.length) {
            container.innerHTML = `
                <p class="empty-table">No products added to this purchase.</p>
            `;
            updateTotals();
            return;
        }

        container.innerHTML = purchaseItems.map((item, index) => `
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:12px;">
                <div class="form-group">
                    <label>Product</label>
                    <select data-purchase-field="product" data-index="${index}">
                        ${productOptions(item.productId)}
                    </select>
                </div>

                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" step="1"
                        value="${escapeHTML(item.quantity)}"
                        data-purchase-field="quantity"
                        data-index="${index}">
                </div>

                <div class="form-group">
                    <label>Unit Cost (₦)</label>
                    <input type="number" min="0" step="0.01"
                        value="${escapeHTML(item.unitCost)}"
                        data-purchase-field="cost"
                        data-index="${index}">
                </div>

                <button type="button" class="btn btn-small"
                    data-remove-purchase-item="${index}">
                    Remove
                </button>
            </div>
        `).join('');

        updateTotals();
    }

    function addPurchaseItem() {
        if (!getProducts().length) {
            window.showToast?.('Please create an inventory product first.', 'error');
            return;
        }

        purchaseItems.push({
            productId: '',
            productName: '',
            quantity: 1,
            unitCost: 0
        });

        renderItemRows();
    }

    function openPurchaseModal(purchase = null) {
        const editing = Boolean(purchase);

        purchaseItems = editing
            ? purchase.items.map(item => ({ ...item }))
            : [{
                productId: '',
                productName: '',
                quantity: 1,
                unitCost: 0
            }];

        const today = new Date().toISOString().slice(0, 10);

        window.openModal?.(
            editing ? 'Edit Purchase' : 'Record New Purchase',
            'Record products purchased from your supplier.'
        );

        $('modalBody').innerHTML = `
            <div class="form-grid">

                <div class="form-group">
                    <label for="purchaseSupplier">Supplier *</label>
                    <select id="purchaseSupplier" required>
                        ${supplierOptions(purchase?.supplierId || '')}
                    </select>
                </div>

                <div class="form-group">
                    <label for="purchaseInvoice">Supplier Invoice Number</label>
                    <input type="text" id="purchaseInvoice"
                        value="${escapeHTML(purchase?.invoiceNumber || '')}"
                        placeholder="Enter invoice number">
                </div>

                <div class="form-group">
                    <label for="purchaseDate">Purchase Date *</label>
                    <input type="date" id="purchaseDate"
                        value="${escapeHTML(purchase?.purchaseDate || today)}" required>
                </div>

                <div class="form-group">
                    <label for="purchaseStatus">Delivery Status</label>
                    <select id="purchaseStatus">
                        <option value="Ordered" ${purchase?.status === 'Ordered' || !purchase ? 'selected' : ''}>Ordered / Not Received</option>
                        <option value="Received" ${purchase?.status === 'Received' ? 'selected' : ''}>Received</option>
                        <option value="Cancelled" ${purchase?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label>Purchased Products *</label>
                    <div id="purchaseItemsContainer"></div>
                    <button type="button" class="btn btn-secondary" id="addPurchaseItem">
                        + Add Product
                    </button>
                </div>

                <div class="form-group">
                    <label for="purchaseAmountPaid">Amount Paid (₦)</label>
                    <input type="number" id="purchaseAmountPaid"
                        min="0" step="0.01"
                        value="${escapeHTML(purchase?.amountPaid ?? 0)}">
                </div>

                <div class="form-group">
                    <label>Total Purchase Cost</label>
                    <strong id="purchaseFormTotal">${money(purchase?.total || 0)}</strong>
                </div>

                <div class="form-group">
                    <label>Outstanding Balance</label>
                    <strong id="purchaseFormBalance">${money(purchase?.balanceDue || 0)}</strong>
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                    <label for="purchaseNotes">Purchase Notes</label>
                    <textarea id="purchaseNotes" rows="3"
                        placeholder="Additional purchase details">${escapeHTML(purchase?.notes || '')}</textarea>
                </div>

            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="cancelPurchase">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" id="savePurchase">
                ${editing ? 'Save Changes' : 'Record Purchase'}
            </button>
        `;

        renderItemRows();

        $('addPurchaseItem').addEventListener('click', addPurchaseItem);
        $('purchaseAmountPaid').addEventListener('input', updateTotals);

        $('purchaseItemsContainer').addEventListener('change', event => {
            const field = event.target.dataset.purchaseField;
            const index = Number(event.target.dataset.index);
            const item = purchaseItems[index];

            if (!field || !item) return;

            if (field === 'product') {
                const product = getProducts().find(p =>
                    String(p.id) === String(event.target.value)
                );

                if (!product) return;

                item.productId = product.id;
                item.productName = product.name;
                item.unitCost = Number(product.costPrice) || 0;
                renderItemRows();
            }
        });

        $('purchaseItemsContainer').addEventListener('input', event => {
            const field = event.target.dataset.purchaseField;
            const index = Number(event.target.dataset.index);
            const item = purchaseItems[index];

            if (!field || !item) return;

            if (field === 'quantity') {
                item.quantity = Number(event.target.value);
            }

            if (field === 'cost') {
                item.unitCost = Number(event.target.value);
            }

            updateTotals();
        });

        $('purchaseItemsContainer').addEventListener('click', event => {
            const button = event.target.closest('[data-remove-purchase-item]');
            if (!button) return;

            purchaseItems.splice(Number(button.dataset.removePurchaseItem), 1);
            renderItemRows();
        });

        $('cancelPurchase').addEventListener('click', () => {
            window.closeModal?.();
        });

        $('savePurchase').addEventListener('click', () => {
            savePurchase(purchase?.id || null);
        });
    }

    function savePurchase(existingId = null) {
        const supplierId = $('purchaseSupplier').value;
        const supplier = getSuppliers().find(s =>
            String(s.id) === String(supplierId)
        );

        if (!supplier) {
            window.showToast?.('Please select a registered supplier.', 'error');
            return;
        }

        if (!purchaseItems.length || purchaseItems.some(item => !item.productId)) {
            window.showToast?.('Please select at least one product for this purchase.', 'error');
            return;
        }

        for (const item of purchaseItems) {
            if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
                window.showToast?.('Product quantities must be whole numbers greater than zero.', 'error');
                return;
            }

            if (!Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0) {
                window.showToast?.('Enter a valid purchase cost for every product.', 'error');
                return;
            }
        }

        const purchaseDate = $('purchaseDate').value;
        const total = calculateTotal();
        const amountPaid = Number($('purchaseAmountPaid').value || 0);

        if (!purchaseDate) {
            window.showToast?.('Please enter the purchase date.', 'error');
            return;
        }

        if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > total) {
            window.showToast?.('Amount paid must be between zero and the purchase total.', 'error');
            return;
        }

        const status = $('purchaseStatus').value;

        const existing = existingId
            ? purchases.find(p => String(p.id) === String(existingId))
            : null;

        const products = getProducts();
        const originalProducts = JSON.stringify(products);
        const updatedProducts = products.map(product => ({ ...product }));

        // Reverse the previous stock movement when editing a received purchase.
        if (existing?.status === 'Received') {
            for (const oldItem of existing.items) {
                const product = updatedProducts.find(p =>
                    String(p.id) === String(oldItem.productId)
                );

                if (product) {
                    product.quantity = Math.max(
                        0,
                        Number(product.quantity || 0) - Number(oldItem.quantity || 0)
                    );
                }
            }
        }

        // Add stock only when the purchase is marked as received.
        if (status === 'Received') {
            for (const item of purchaseItems) {
                const product = updatedProducts.find(p =>
                    String(p.id) === String(item.productId)
                );

                if (!product) {
                    window.showToast?.('A selected product no longer exists in inventory.', 'error');
                    return;
                }

                product.quantity = Number(product.quantity || 0) + Number(item.quantity);
            }
        }

        const now = new Date().toISOString();

        const purchaseRecord = {
            id: existing?.id || window.GlassStore.createId('purchase'),
            purchaseNumber: existing?.purchaseNumber || createPurchaseNumber(),
            supplierId: supplier.id,
            supplierName: supplier.name,
            invoiceNumber: $('purchaseInvoice').value.trim(),
            purchaseDate,
            items: purchaseItems.map(item => {
                const product = updatedProducts.find(p =>
                    String(p.id) === String(item.productId)
                );

                return {
                    productId: item.productId,
                    productName: product?.name || item.productName,
                    quantity: Number(item.quantity),
                    unitCost: Number(item.unitCost),
                    lineTotal: Number(item.quantity) * Number(item.unitCost)
                };
            }),
            total,
            amountPaid,
            balanceDue: total - amountPaid,
            status,
            notes: $('purchaseNotes').value.trim(),
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };

        const oldPurchases = purchases.map(p => ({ ...p }));

        if (existing) {
            const index = purchases.findIndex(p =>
                String(p.id) === String(existingId)
            );
            purchases[index] = purchaseRecord;
        } else {
            purchases.unshift(purchaseRecord);
        }

        try {
            if (status === 'Received' || existing?.status === 'Received') {
                window.GlassStore.saveProducts(updatedProducts);
            }

            if (!savePurchases()) {
                purchases = oldPurchases;

                if (status === 'Received' || existing?.status === 'Received') {
                    window.GlassStore.saveProducts(JSON.parse(originalProducts));
                }

                renderAll();
                return;
            }
        } catch (error) {
            purchases = oldPurchases;

            if (status === 'Received' || existing?.status === 'Received') {
                try {
                    window.GlassStore.saveProducts(JSON.parse(originalProducts));
                } catch {}
            }

            window.showToast?.('Unable to complete the purchase. No changes were saved.', 'error');
            return;
        }

        window.closeModal?.();
        renderAll();

        window.showToast?.(
            existing ? 'Purchase updated successfully.' : 'Purchase recorded successfully.',
            'success'
        );

        document.dispatchEvent(new CustomEvent('inventoryUpdated'));
        document.dispatchEvent(new CustomEvent('purchasesUpdated'));
    }

    function viewPurchase(purchase) {
        const rows = purchase.items.map(item => `
            <tr>
                <td>${escapeHTML(item.productName)}</td>
                <td>${escapeHTML(item.quantity)}</td>
                <td>${money(item.unitCost)}</td>
                <td>${money(item.lineTotal)}</td>
            </tr>
        `).join('');

        window.openModal?.('Purchase Details', purchase.purchaseNumber);

        $('modalBody').innerHTML = `
            <div class="form-grid">
                <div><strong>Purchase Number</strong><p>${escapeHTML(purchase.purchaseNumber)}</p></div>
                <div><strong>Supplier</strong><p>${escapeHTML(purchase.supplierName)}</p></div>
                <div><strong>Invoice Number</strong><p>${escapeHTML(purchase.invoiceNumber || 'Not provided')}</p></div>
                <div><strong>Purchase Date</strong><p>${escapeHTML(purchase.purchaseDate)}</p></div>
                <div><strong>Delivery Status</strong><p>${statusBadge(purchase.status)}</p></div>
                <div><strong>Payment Status</strong><p>${statusBadge(getPaymentStatus(purchase))}</p></div>
                <div><strong>Total Cost</strong><p>${money(purchase.total)}</p></div>
                <div><strong>Amount Paid</strong><p>${money(purchase.amountPaid)}</p></div>
                <div><strong>Balance Due</strong><p>${money(purchase.balanceDue)}</p></div>
            </div>

            <h3 style="margin:20px 0 10px;">Purchased Products</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Product</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <div style="margin-top:15px;">
                <strong>Notes</strong>
                <p>${escapeHTML(purchase.notes || 'No additional notes.')}</p>
            </div>
        `;

        $('modalFooter').innerHTML = `
            <button type="button" class="btn btn-secondary" id="closePurchaseDetails">
                Close
            </button>
        `;

        $('closePurchaseDetails').addEventListener('click', () => {
            window.closeModal?.();
        });
    }

    function deletePurchase(purchase) {
        if (!confirm(`Delete purchase ${purchase.purchaseNumber}?`)) return;

        const products = getProducts().map(product => ({ ...product }));

        if (purchase.status === 'Received') {
            for (const item of purchase.items) {
                const product = products.find(p =>
                    String(p.id) === String(item.productId)
                );

                if (!product || Number(product.quantity || 0) < Number(item.quantity)) {
                    window.showToast?.(
                        `Cannot delete this purchase because ${item.productName} stock has already been used or changed.`,
                        'error'
                    );
                    return;
                }
            }

            for (const item of purchase.items) {
                const product = products.find(p =>
                    String(p.id) === String(item.productId)
                );

                product.quantity = Number(product.quantity || 0) - Number(item.quantity);
            }

            try {
                window.GlassStore.saveProducts(products);
            } catch {
                window.showToast?.('Could not update inventory. Purchase was not deleted.', 'error');
                return;
            }
        }

        const previous = purchases;
        purchases = purchases.filter(p =>
            String(p.id) !== String(purchase.id)
        );

        if (!savePurchases()) {
            purchases = previous;

            if (purchase.status === 'Received') {
                window.GlassStore.saveProducts(getProducts().map(product => {
                    const oldProduct = getProducts().find(p => p.id === product.id);
                    return oldProduct ? { ...oldProduct } : product;
                }));
            }

            renderAll();
            return;
        }

        renderAll();
        window.showToast?.('Purchase deleted successfully.', 'success');
        document.dispatchEvent(new CustomEvent('inventoryUpdated'));
    }

    function handleActions(event) {
        const button = event.target.closest('[data-purchase-action]');
        if (!button) return;

        const purchase = purchases.find(p =>
            String(p.id) === String(button.dataset.id)
        );

        if (!purchase) return;

        const action = button.dataset.purchaseAction;

        if (action === 'view') viewPurchase(purchase);
        if (action === 'edit') openPurchaseModal(purchase);
        if (action === 'delete') deletePurchase(purchase);
    }

    function bindEvents() {
        document.addEventListener('click', event => {
            if (event.target.closest('[data-action="new-purchase"]')) {
                if (!getSuppliers().length) {
                    window.showToast?.('Register a supplier before recording a purchase.', 'error');
                    return;
                }

                if (!getProducts().length) {
                    window.showToast?.('Add products to inventory before recording a purchase.', 'error');
                    return;
                }

                openPurchaseModal();
            }
        });

        $('purchasesTableBody')?.addEventListener('click', handleActions);

        document.addEventListener('pageChanged', event => {
            if (event.detail?.page === 'purchases') renderAll();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        purchases = readPurchases();
        bindEvents();
        renderAll();
    });
})();

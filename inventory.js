'use strict';

document.addEventListener('DOMContentLoaded', () => {
    if (!window.GlassStore) {
        console.error('Storage system has not been loaded.');
        return;
    }

    const store = window.GlassStore;

    const elements = {
        inventoryBody: document.getElementById('inventoryTableBody'),
        categoryGrid: document.getElementById('categoryGrid'),
        productGrid: document.getElementById('productManagementGrid'),
        inventorySearch: document.getElementById('inventorySearch'),
        productSearch: document.getElementById('productSearch'),
        categoryFilter: document.getElementById('inventoryCategoryFilter'),
        productCategoryFilter: document.getElementById('productCategoryFilter'),
        stockFilter: document.getElementById('inventoryStockFilter'),
        pagination: document.getElementById('inventoryPagination'),
        modalTitle: document.getElementById('modalTitle'),
        modalSubtitle: document.getElementById('modalSubtitle'),
        modalBody: document.getElementById('modalBody'),
        modalFooter: document.getElementById('modalFooter'),
        modalOverlay: document.getElementById('modalOverlay')
    };

    let currentPage = 1;
    const pageSize = 10;

    const money = value => {
        const currency = 'NGN';

        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    };

    const escapeHTML = value => {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    };

    const getProducts = () => store.getProducts();
    const getCategories = () => store.getCategories();

    const getCategoryName = id => {
        const category = getCategories().find(item => item.id === id);
        return category ? category.name : 'Uncategorised';
    };

    const isLowStock = product => {
        return Number(product.quantity) > 0 &&
            Number(product.quantity) <= Number(product.minimumStock);
    };

    const stockStatus = product => {
        const quantity = Number(product.quantity);

        if (quantity <= 0) {
            return '<span class="status-badge status-cancelled">Out of Stock</span>';
        }

        if (isLowStock(product)) {
            return '<span class="status-badge status-pending">Low Stock</span>';
        }

        return '<span class="status-badge status-completed">Available</span>';
    };

    function updateCategoryFilters() {
        const categories = getCategories();

        [
            elements.categoryFilter,
            elements.productCategoryFilter
        ].forEach(select => {
            if (!select) return;

            const previousValue = select.value;
            const firstOption = select.options[0];

            select.innerHTML = '';

            if (firstOption) {
                select.appendChild(firstOption.cloneNode(true));
            }

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });

            if (categories.some(category => category.id === previousValue)) {
                select.value = previousValue;
            }
        });
    }

    function updateInventoryStatistics() {
        const products = getProducts();

        const totalProducts = products.length;
        const totalQuantity = products.reduce(
            (sum, product) => sum + Number(product.quantity || 0),
            0
        );

        const lowStock = products.filter(isLowStock).length;

        const inventoryValue = products.reduce(
            (sum, product) =>
                sum + (
                    Number(product.quantity || 0) *
                    Number(product.costPrice || 0)
                ),
            0
        );

        const values = {
            inventoryTotalProducts: totalProducts,
            inventoryTotalQuantity: totalQuantity,
            inventoryLowStock: lowStock,
            inventoryValue: money(inventoryValue),
            totalProducts: totalProducts,
            lowStockCount: lowStock,
            inventoryNavCount: totalProducts
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = value;
            }
        });
    }

    function renderInventory() {
        const body = elements.inventoryBody;

        if (!body) return;

        const search = (elements.inventorySearch?.value || '')
            .trim()
            .toLowerCase();

        const category = elements.categoryFilter?.value || '';
        const stock = elements.stockFilter?.value || '';

        let products = getProducts().filter(product => {
            const searchable = [
                product.name,
                product.code,
                product.description,
                getCategoryName(product.categoryId)
            ].join(' ').toLowerCase();

            const matchesSearch = !search || searchable.includes(search);
            const matchesCategory = !category || product.categoryId === category;

            let matchesStock = true;

            if (stock === 'available') {
                matchesStock = Number(product.quantity) >
                    Number(product.minimumStock);
            } else if (stock === 'low') {
                matchesStock = isLowStock(product);
            } else if (stock === 'out') {
                matchesStock = Number(product.quantity) <= 0;
            }

            return matchesSearch && matchesCategory && matchesStock;
        });

        products.sort((a, b) => {
            return String(b.createdAt || '').localeCompare(
                String(a.createdAt || '')
            );
        });

        const totalPages = Math.max(1, Math.ceil(products.length / pageSize));

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        const start = (currentPage - 1) * pageSize;
        const visibleProducts = products.slice(start, start + pageSize);

        if (visibleProducts.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-table">
                        ${products.length === 0
                            ? 'No matching products found.'
                            : 'No products on this page.'}
                    </td>
                </tr>
            `;
        } else {
            body.innerHTML = visibleProducts.map(product => `
                <tr>
                    <td>
                        <strong>${escapeHTML(product.name)}</strong>
                        <div class="table-subtext">
                            ${escapeHTML(product.colour || 'No colour specified')}
                        </div>
                    </td>
                    <td>${escapeHTML(product.code)}</td>
                    <td>${escapeHTML(getCategoryName(product.categoryId))}</td>
                    <td>${escapeHTML(product.thickness)} mm</td>
                    <td>
                        ${escapeHTML(product.width)} ×
                        ${escapeHTML(product.height)}
                        ${escapeHTML(product.dimensionUnit)}
                    </td>
                    <td>
                        <strong>${Number(product.quantity)}</strong>
                        <div>${stockStatus(product)}</div>
                    </td>
                    <td>${money(product.sellingPrice)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-light btn-small"
                                data-action="edit-product"
                                data-id="${escapeHTML(product.id)}">
                                Edit
                            </button>
                            <button class="btn btn-danger btn-small"
                                data-action="delete-product"
                                data-id="${escapeHTML(product.id)}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        renderPagination(products.length, totalPages);
        updateInventoryStatistics();
    }

    function renderPagination(totalItems, totalPages) {
        if (!elements.pagination) return;

        if (totalItems <= pageSize) {
            elements.pagination.innerHTML = '';
            return;
        }

        elements.pagination.innerHTML = `
            <button class="btn btn-light btn-small"
                data-page-number="${currentPage - 1}"
                ${currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>

            <span>Page ${currentPage} of ${totalPages}</span>

            <button class="btn btn-light btn-small"
                data-page-number="${currentPage + 1}"
                ${currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;
    }

    function renderCategories() {
        if (!elements.categoryGrid) return;

        const categories = getCategories();
        const products = getProducts();

        if (categories.length === 0) {
            elements.categoryGrid.innerHTML = `
                <div class="empty-state">
                    No categories have been created yet.
                </div>
            `;
            return;
        }

        elements.categoryGrid.innerHTML = categories.map(category => {
            const count = products.filter(
                product => product.categoryId === category.id
            ).length;

            return `
                <article class="panel category-card">
                    <div class="category-card-icon">◇</div>
                    <h3>${escapeHTML(category.name)}</h3>
                    <p>${escapeHTML(category.description || 'No description provided.')}</p>
                    <div class="category-product-count">
                        ${count} product${count === 1 ? '' : 's'}
                    </div>
                    <div class="table-actions">
                        <button class="btn btn-light btn-small"
                            data-action="edit-category"
                            data-id="${escapeHTML(category.id)}">
                            Edit
                        </button>
                        <button class="btn btn-danger btn-small"
                            data-action="delete-category"
                            data-id="${escapeHTML(category.id)}">
                            Delete
                        </button>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderProductCards() {
        if (!elements.productGrid) return;

        const search = (elements.productSearch?.value || '')
            .trim()
            .toLowerCase();

        const category = elements.productCategoryFilter?.value || '';

        const products = getProducts().filter(product => {
            const matchesSearch = [
                product.name,
                product.code,
                product.description
            ].join(' ').toLowerCase().includes(search);

            const matchesCategory = !category ||
                product.categoryId === category;

            return matchesSearch && matchesCategory;
        });

        if (products.length === 0) {
            elements.productGrid.innerHTML = `
                <div class="empty-state">
                    No products found. Add a glass product to get started.
                </div>
            `;
            return;
        }

        elements.productGrid.innerHTML = products.map(product => `
            <article class="panel product-card">
                <div class="product-card-top">
                    <span class="product-card-icon">◇</span>
                    ${stockStatus(product)}
                </div>
                <h3>${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(getCategoryName(product.categoryId))}</p>
                <div class="product-card-details">
                    <span>Code: ${escapeHTML(product.code)}</span>
                    <span>Thickness: ${escapeHTML(product.thickness)} mm</span>
                    <span>
                        Size: ${escapeHTML(product.width)} ×
                        ${escapeHTML(product.height)}
                        ${escapeHTML(product.dimensionUnit)}
                    </span>
                    <span>Stock: ${Number(product.quantity)}</span>
                </div>
                <strong class="product-card-price">
                    ${money(product.sellingPrice)}
                </strong>
                <div class="table-actions">
                    <button class="btn btn-light btn-small"
                        data-action="edit-product"
                        data-id="${escapeHTML(product.id)}">
                        Edit
                    </button>
                    <button class="btn btn-danger btn-small"
                        data-action="delete-product"
                        data-id="${escapeHTML(product.id)}">
                        Delete
                    </button>
                </div>
            </article>
        `).join('');
    }

    function renderAll() {
        updateCategoryFilters();
        renderInventory();
        renderCategories();
        renderProductCards();
    }

    function openEntityModal(title, subtitle, formHTML) {
        if (!elements.modalOverlay || !elements.modalBody ||
            !elements.modalFooter) {
            window.showToast('The application form window is unavailable.', 'error');
            return;
        }

        elements.modalTitle.textContent = title;
        elements.modalSubtitle.textContent = subtitle;
        elements.modalBody.innerHTML = formHTML;

        elements.modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" id="entityCancel">
                Cancel
            </button>
            <button type="submit" class="btn btn-primary"
                id="entitySave" form="inventoryEntityForm">
                Save
            </button>
        `;

        elements.modalOverlay.classList.add('active');
        elements.modalOverlay.setAttribute('aria-hidden', 'false');

        document.getElementById('entityCancel')
            ?.addEventListener('click', closeEntityModal);

        document.getElementById('inventoryEntityForm')
            ?.querySelector('input:not([type="hidden"])')
            ?.focus();
    }

    function closeEntityModal() {
        if (window.closeModal) {
            window.closeModal();
        } else if (elements.modalOverlay) {
            elements.modalOverlay.classList.remove('active');
        }

        if (elements.modalOverlay) {
            elements.modalOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    function openProductForm(productId = null) {
        const existing = productId
            ? getProducts().find(item => item.id === productId)
            : null;

        if (productId && !existing) {
            window.showToast('Product could not be found.', 'error');
            return;
        }

        const categories = getCategories();

        if (categories.length === 0) {
            window.showToast('Please create a category first.', 'warning');
            window.showPage('categories');
            return;
        }

        const categoryOptions = categories.map(category => `
            <option value="${escapeHTML(category.id)}"
                ${existing?.categoryId === category.id ? 'selected' : ''}>
                ${escapeHTML(category.name)}
            </option>
        `).join('');

        const formHTML = `
            <form id="inventoryEntityForm">
                <input type="hidden" name="entityType" value="product">
                <input type="hidden" name="productId"
                    value="${escapeHTML(existing?.id || '')}">

                <div class="form-grid">
                    <div class="form-group">
                        <label for="productName">Product Name *</label>
                        <input id="productName" name="name" type="text"
                            required maxlength="100"
                            value="${escapeHTML(existing?.name || '')}"
                            placeholder="e.g. Clear Float Glass">
                    </div>

                    <div class="form-group">
                        <label for="productCode">Product Code</label>
                        <input id="productCode" name="code" type="text"
                            maxlength="40"
                            value="${escapeHTML(existing?.code || '')}"
                            placeholder="Automatically generated if empty">
                    </div>

                    <div class="form-group">
                        <label for="productCategory">Category *</label>
                        <select id="productCategory" name="categoryId" required>
                            <option value="">Choose category</option>
                            ${categoryOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="productThickness">Thickness (mm) *</label>
                        <input id="productThickness" name="thickness"
                            type="number" min="0.1" step="0.1" required
                            value="${escapeHTML(existing?.thickness ?? '')}">
                    </div>

                    <div class="form-group">
                        <label for="productWidth">Width *</label>
                        <input id="productWidth" name="width" type="number"
                            min="0.1" step="0.1" required
                            value="${escapeHTML(existing?.width ?? '')}">
                    </div>

                    <div class="form-group">
                        <label for="productHeight">Height / Length *</label>
                        <input id="productHeight" name="height" type="number"
                            min="0.1" step="0.1" required
                            value="${escapeHTML(existing?.height ?? '')}">
                    </div>

                    <div class="form-group">
                        <label for="dimensionUnit">Dimension Unit</label>
                        <select id="dimensionUnit" name="dimensionUnit">
                            <option value="mm" ${existing?.dimensionUnit === 'mm' ? 'selected' : ''}>Millimetres (mm)</option>
                            <option value="cm" ${existing?.dimensionUnit === 'cm' ? 'selected' : ''}>Centimetres (cm)</option>
                            <option value="m" ${existing?.dimensionUnit === 'm' ? 'selected' : ''}>Metres (m)</option>
                            <option value="ft" ${existing?.dimensionUnit === 'ft' ? 'selected' : ''}>Feet (ft)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="productColour">Colour / Finish</label>
                        <input id="productColour" name="colour" type="text"
                            maxlength="60"
                            value="${escapeHTML(existing?.colour || '')}"
                            placeholder="e.g. Clear, Bronze, Blue">
                    </div>

                    <div class="form-group">
                        <label for="productQuantity">Stock Quantity *</label>
                        <input id="productQuantity" name="quantity"
                            type="number" min="0" step="1" required
                            value="${escapeHTML(existing?.quantity ?? 0)}">
                    </div>

                    <div class="form-group">
                        <label for="minimumStock">Minimum Stock Alert *</label>
                        <input id="minimumStock" name="minimumStock"
                            type="number" min="0" step="1" required
                            value="${escapeHTML(existing?.minimumStock ?? 5)}">
                    </div>

                    <div class="form-group">
                        <label for="costPrice">Cost Price (₦) *</label>
                        <input id="costPrice" name="costPrice"
                            type="number" min="0" step="0.01" required
                            value="${escapeHTML(existing?.costPrice ?? 0)}">
                    </div>

                    <div class="form-group">
                        <label for="sellingPrice">Selling Price (₦) *</label>
                        <input id="sellingPrice" name="sellingPrice"
                            type="number" min="0" step="0.01" required
                            value="${escapeHTML(existing?.sellingPrice ?? 0)}">
                    </div>

                    <div class="form-group full-width">
                        <label for="productDescription">Description</label>
                        <textarea id="productDescription" name="description"
                            rows="3" maxlength="500"
                            placeholder="Additional product details...">${escapeHTML(existing?.description || '')}</textarea>
                    </div>
                </div>
            </form>
        `;

        openEntityModal(
            existing ? 'Edit Glass Product' : 'Add Glass Product',
            'Enter the product specifications and stock information.',
            formHTML
        );
    }

    function openCategoryForm(categoryId = null) {
        const existing = categoryId
            ? getCategories().find(item => item.id === categoryId)
            : null;

        if (categoryId && !existing) {
            window.showToast('Category could not be found.', 'error');
            return;
        }

        const formHTML = `
            <form id="inventoryEntityForm">
                <input type="hidden" name="entityType" value="category">
                <input type="hidden" name="categoryId"
                    value="${escapeHTML(existing?.id || '')}">

                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="categoryName">Category Name *</label>
                        <input id="categoryName" name="name" type="text"
                            required maxlength="80"
                            value="${escapeHTML(existing?.name || '')}"
                            placeholder="e.g. Decorative Glass">
                    </div>

                    <div class="form-group full-width">
                        <label for="categoryDescription">Description</label>
                        <textarea id="categoryDescription"
                            name="description" rows="4" maxlength="300"
                            placeholder="Describe this category...">${escapeHTML(existing?.description || '')}</textarea>
                    </div>
                </div>
            </form>
        `;

        openEntityModal(
            existing ? 'Edit Category' : 'Add Glass Category',
            'Create a category to organize your glass products.',
            formHTML
        );
    }

    function generateProductCode() {
        let code;

        do {
            code = `GLS-${Date.now().toString().slice(-7)}`;
        } while (getProducts().some(product => product.code === code));

        return code;
    }

    function saveProduct(form) {
        const data = new FormData(form);
        const id = data.get('productId');
        const products = getProducts();

        const name = String(data.get('name') || '').trim();
        const categoryId = String(data.get('categoryId') || '');
        const codeInput = String(data.get('code') || '').trim().toUpperCase();
        const code = codeInput || generateProductCode();

        const duplicateCode = products.some(product =>
            product.code.toLowerCase() === code.toLowerCase() &&
            product.id !== id
        );

        if (duplicateCode) {
            window.showToast('That product code is already in use.', 'warning');
            return;
        }

        const quantity = Number(data.get('quantity'));
        const minimumStock = Number(data.get('minimumStock'));
        const thickness = Number(data.get('thickness'));
        const width = Number(data.get('width'));
        const height = Number(data.get('height'));
        const costPrice = Number(data.get('costPrice'));
        const sellingPrice = Number(data.get('sellingPrice'));

        if (!name || !getCategories().some(item => item.id === categoryId)) {
            window.showToast('Enter a product name and choose a valid category.', 'warning');
            return;
        }

        if (
            !Number.isFinite(quantity) || quantity < 0 ||
            !Number.isInteger(quantity) ||
            !Number.isFinite(minimumStock) || minimumStock < 0 ||
            !Number.isInteger(minimumStock) ||
            !Number.isFinite(thickness) || thickness <= 0 ||
            !Number.isFinite(width) || width <= 0 ||
            !Number.isFinite(height) || height <= 0 ||
            !Number.isFinite(costPrice) || costPrice < 0 ||
            !Number.isFinite(sellingPrice) || sellingPrice < 0
        ) {
            window.showToast('Please enter valid measurements, quantities and prices.', 'warning');
            return;
        }

        const existing = products.find(product => product.id === id);

        const product = {
            id: existing?.id || store.createId('product'),
            name,
            code,
            categoryId,
            thickness,
            width,
            height,
            dimensionUnit: String(data.get('dimensionUnit') || 'mm'),
            colour: String(data.get('colour') || '').trim(),
            quantity,
            minimumStock,
            costPrice,
            sellingPrice,
            description: String(data.get('description') || '').trim(),
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedProducts = existing
            ? products.map(item => item.id === id ? product : item)
            : [...products, product];

        if (!store.saveProducts(updatedProducts)) return;

        closeEntityModal();
        currentPage = 1;
        renderAll();

        window.showToast(
            existing ? 'Product updated successfully.' : 'Product added successfully.',
            'success'
        );
    }

    function saveCategory(form) {
        const data = new FormData(form);
        const id = String(data.get('categoryId') || '');
        const name = String(data.get('name') || '').trim();
        const description = String(data.get('description') || '').trim();

        if (!name) {
            window.showToast('Please enter a category name.', 'warning');
            return;
        }

        const categories = getCategories();

        const duplicate = categories.some(category =>
            category.name.toLowerCase() === name.toLowerCase() &&
            category.id !== id
        );

        if (duplicate) {
            window.showToast('A category with that name already exists.', 'warning');
            return;
        }

        const existing = categories.find(category => category.id === id);

        const category = {
            id: existing?.id || store.createId('category'),
            name,
            description,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedCategories = existing
            ? categories.map(item => item.id === id ? category : item)
            : [...categories, category];

        if (!store.saveCategories(updatedCategories)) return;

        closeEntityModal();
        renderAll();

        window.showToast(
            existing ? 'Category updated successfully.' : 'Category added successfully.',
            'success'
        );
    }

    function deleteProduct(id) {
        const product = getProducts().find(item => item.id === id);

        if (!product) return;

        if (!confirm(`Delete "${product.name}" from your inventory?`)) {
            return;
        }

        const updated = getProducts().filter(item => item.id !== id);

        if (!store.saveProducts(updated)) return;

        renderAll();
        window.showToast('Product deleted successfully.', 'success');
    }

    function deleteCategory(id) {
        const category = getCategories().find(item => item.id === id);

        if (!category) return;

        const linkedProducts = getProducts().filter(
            product => product.categoryId === id
        );

        if (linkedProducts.length > 0) {
            window.showToast(
                'This category has products. Move or delete those products before deleting the category.',
                'warning'
            );
            return;
        }

        if (!confirm(`Delete the category "${category.name}"?`)) {
            return;
        }

        const updated = getCategories().filter(item => item.id !== id);

        if (!store.saveCategories(updated)) return;

        renderAll();
        window.showToast('Category deleted successfully.', 'success');
    }

    // Form submission
    document.addEventListener('submit', event => {
        if (event.target.id !== 'inventoryEntityForm') return;

        event.preventDefault();

        const entityType = event.target.querySelector(
            '[name="entityType"]'
        )?.value;

        if (entityType === 'product') {
            saveProduct(event.target);
        } else if (entityType === 'category') {
            saveCategory(event.target);
        }
    });

    // Buttons and actions
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');

        if (button) {
            const action = button.dataset.action;
            const id = button.dataset.id;

            switch (action) {
                case 'new-product':
                    openProductForm();
                    return;

                case 'edit-product':
                    openProductForm(id);
                    return;

                case 'delete-product':
                    deleteProduct(id);
                    return;

                case 'new-category':
                    openCategoryForm();
                    return;

                case 'edit-category':
                    openCategoryForm(id);
                    return;

                case 'delete-category':
                    deleteCategory(id);
                    return;

                case 'refresh-dashboard':
                    renderAll();
                    window.showToast('Inventory information refreshed.', 'success');
                    return;
            }
        }

        const pageButton = event.target.closest('[data-page-number]');

        if (pageButton && elements.pagination?.contains(pageButton)) {
            const requestedPage = Number(pageButton.dataset.pageNumber);

            if (requestedPage >= 1) {
                currentPage = requestedPage;
                renderInventory();
            }
        }
    });

    // Search and filters
    elements.inventorySearch?.addEventListener('input', () => {
        currentPage = 1;
        renderInventory();
    });

    elements.productSearch?.addEventListener('input', renderProductCards);

    elements.categoryFilter?.addEventListener('change', () => {
        currentPage = 1;
        renderInventory();
    });

    elements.stockFilter?.addEventListener('change', () => {
        currentPage = 1;
        renderInventory();
    });

    elements.productCategoryFilter?.addEventListener(
        'change',
        renderProductCards
    );

    // Dashboard quick actions can open the inventory form.
    document.addEventListener('pageChanged', event => {
        if (
            event.detail?.page === 'inventory' ||
            event.detail?.page === 'categories' ||
            event.detail?.page === 'products'
        ) {
            renderAll();
        }
    });

    // Initial display
    renderAll();

    console.log('Inventory and category management initialized.');
});

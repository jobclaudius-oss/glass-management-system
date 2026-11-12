'use strict';

(() => {
    const KEYS = {
        products: 'glasspro_products',
        categories: 'glasspro_categories'
    };

    function read(key, fallback = []) {
        try {
            const stored = localStorage.getItem(key);

            if (stored === null) {
                return fallback;
            }

            const parsed = JSON.parse(stored);
            return parsed;
        } catch (error) {
            console.error('Could not read saved data:', error);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Could not save data:', error);

            if (typeof window.showToast === 'function') {
                window.showToast(
                    'Unable to save data. Your browser storage may be full.',
                    'error'
                );
            }

            return false;
        }
    }

    const defaultCategories = [
        { id: 'cat-clear', name: 'Clear Glass', description: 'Standard transparent glass.' },
        { id: 'cat-tinted', name: 'Tinted Glass', description: 'Coloured and tinted glass.' },
        { id: 'cat-toughened', name: 'Toughened Glass', description: 'Tempered safety glass.' },
        { id: 'cat-laminated', name: 'Laminated Glass', description: 'Laminated safety glass.' },
        { id: 'cat-reflective', name: 'Reflective Glass', description: 'Reflective architectural glass.' },
        { id: 'cat-mirror', name: 'Mirrors', description: 'Mirror glass products.' },
        { id: 'cat-frosted', name: 'Frosted Glass', description: 'Frosted and privacy glass.' }
    ];

    // Create the starter categories only on the first installation.
    if (localStorage.getItem(KEYS.categories) === null) {
        write(KEYS.categories, defaultCategories);
    }

    window.GlassStore = {
        getProducts() {
            const data = read(KEYS.products, []);
            return Array.isArray(data) ? data : [];
        },

        saveProducts(products) {
            return write(KEYS.products, products);
        },

        getCategories() {
            const data = read(KEYS.categories, []);
            return Array.isArray(data) ? data : [];
        },

        saveCategories(categories) {
            return write(KEYS.categories, categories);
        },

        createId(prefix = 'item') {
            const randomPart = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

            return `${prefix}-${randomPart}`;
        }
    };

    console.log('GlassPro local storage initialized.');
})();

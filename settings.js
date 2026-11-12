(function () {
    'use strict';

    if (window.GlassSettingsInitialized) return;
    window.GlassSettingsInitialized = true;

    const STORAGE_KEY = 'glasspro_settings';

    const fields = [
        'businessName',
        'businessEmail',
        'businessPhone',
        'businessCurrency',
        'businessAddress',
        'receiptFooter',
        'systemTheme',
        'lowStockNotifications',
        'orderNotifications'
    ];

    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            console.error('Unable to load settings:', error);
            return {};
        }
    }

    function saveSettings() {
        const settings = {};

        fields.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            settings[id] = element.type === 'checkbox'
                ? element.checked
                : element.value;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

        applySettings(settings);

        window.dispatchEvent(new CustomEvent('businessSettingsUpdated', {
            detail: settings
        }));

        if (window.showToast) {
            window.showToast('Settings saved successfully.', 'success');
        }
    }

    function applySettings(settings) {
        const theme = settings.systemTheme || 'light';

        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;

        document.body.classList.toggle('dark-theme', theme === 'dark');

        const businessName = settings.businessName || 'Glass Business';

        const sidebarName = document.querySelector('.sidebar-business h4');
        if (sidebarName) {
            sidebarName.textContent = businessName;
        }

        const brandName = document.querySelector('.brand-text h2');
        if (brandName) {
            brandName.dataset.businessName = businessName;
        }
    }

    function populateSettings() {
        const settings = loadSettings();

        fields.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            if (Object.prototype.hasOwnProperty.call(settings, id)) {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(settings[id]);
                } else {
                    element.value = settings[id];
                }
            }
        });

        applySettings(settings);
    }

    document.addEventListener('click', function (event) {
        const button = event.target.closest('[data-action="save-settings"]');

        if (!button) return;

        event.preventDefault();
        saveSettings();
    });

    document.addEventListener('DOMContentLoaded', populateSettings);

    window.GlassSettings = {
        load: loadSettings,
        save: saveSettings,
        apply: applySettings
    };

})();

/* =========================================================
   GLASS MANAGEMENT SYSTEM
   DATA BACKUP & RESTORE
========================================================= */

(function () {
    'use strict';

    const BACKUP_VERSION = 1;
    const STORAGE_PREFIX = 'glasspro_';

    function getBusinessName() {
        try {
            const settings = JSON.parse(
                localStorage.getItem('glasspro_settings') || '{}'
            );

            return settings.businessName || 'Glass Management System';
        } catch (error) {
            return 'Glass Management System';
        }
    }

    function getBackupData() {
        const records = {};

        Object.keys(localStorage).forEach(function (key) {
            if (key.startsWith(STORAGE_PREFIX)) {
                records[key] = localStorage.getItem(key);
            }
        });

        return {
            application: 'Glass Management System',
            version: BACKUP_VERSION,
            createdAt: new Date().toISOString(),
            businessName: getBusinessName(),
            records: records
        };
    }

    function downloadBackup() {
        const backup = getBackupData();

        if (Object.keys(backup.records).length === 0) {
            window.showToast('No system records were found to back up.', 'error');
            return;
        }

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = 'glasspro-backup-' + date + '.json';

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        window.showToast('Backup downloaded successfully.', 'success');
    }

    function validateBackup(backup) {
        if (!backup || typeof backup !== 'object') {
            return false;
        }

        if (backup.application !== 'Glass Management System') {
            return false;
        }

        if (!backup.records || typeof backup.records !== 'object') {
            return false;
        }

        if (Array.isArray(backup.records)) {
            return false;
        }

        const keys = Object.keys(backup.records);

        if (keys.length === 0) {
            return false;
        }

        return keys.every(function (key) {
            return key.startsWith(STORAGE_PREFIX) &&
                typeof backup.records[key] === 'string';
        });
    }

    function restoreBackup(file) {
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const backup = JSON.parse(event.target.result);

                if (!validateBackup(backup)) {
                    window.showToast(
                        'Invalid backup file. Please select a valid Glass Management System backup.',
                        'error'
                    );
                    return;
                }

                const confirmed = window.confirm(
                    'Restoring this backup will replace existing Glass Management System records with the records in the backup. Continue?'
                );

                if (!confirmed) return;

                const previousRecords = {};

                Object.keys(localStorage).forEach(function (key) {
                    if (key.startsWith(STORAGE_PREFIX)) {
                        previousRecords[key] = localStorage.getItem(key);
                    }
                });

                try {
                    Object.keys(previousRecords).forEach(function (key) {
                        localStorage.removeItem(key);
                    });

                    Object.entries(backup.records).forEach(function ([key, value]) {
                        localStorage.setItem(key, value);
                    });
                } catch (error) {
                    Object.keys(localStorage).forEach(function (key) {
                        if (key.startsWith(STORAGE_PREFIX)) {
                            localStorage.removeItem(key);
                        }
                    });

                    Object.entries(previousRecords).forEach(function ([key, value]) {
                        localStorage.setItem(key, value);
                    });

                    throw error;
                }

                window.showToast(
                    'Backup restored successfully. Reloading system...',
                    'success'
                );

                setTimeout(function () {
                    window.location.reload();
                }, 1000);

            } catch (error) {
                console.error('Backup restore error:', error);

                window.showToast(
                    'Could not restore the backup file.',
                    'error'
                );
            }
        };

        reader.onerror = function () {
            window.showToast('Unable to read the selected backup file.', 'error');
        };

        reader.readAsText(file);
    }

    function addBackupInterface() {
        const settingsSection = document.getElementById('settings');

        if (!settingsSection) {
            console.error('Settings section was not found.');
            return;
        }

        if (document.getElementById('backupManagementCard')) {
            return;
        }

        const card = document.createElement('div');

        card.id = 'backupManagementCard';
        card.className = 'glass-card';
        card.style.marginTop = '24px';
        card.style.padding = '24px';

        card.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>Data Backup & Restore</h3>
                <p style="color: var(--text-muted); margin-top: 8px;">
                    Protect your business records by downloading backups
                    and restoring them whenever necessary.
                </p>
            </div>

            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
            ">
                <div style="
                    padding: 18px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                ">
                    <h4>Download Backup</h4>
                    <p style="color: var(--text-muted); margin: 10px 0 16px;">
                        Save a copy of your current business records as a JSON file.
                    </p>
                    <button type="button"
                        class="btn btn-primary"
                        id="downloadSystemBackup">
                        Download Backup
                    </button>
                </div>

                <div style="
                    padding: 18px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                ">
                    <h4>Restore Backup</h4>
                    <p style="color: var(--text-muted); margin: 10px 0 16px;">
                        Restore records from a previously downloaded backup.
                    </p>
                    <input
                        type="file"
                        id="restoreBackupFile"
                        accept=".json,application/json"
                        style="display: none;"
                    >
                    <button type="button"
                        class="btn btn-secondary"
                        id="chooseBackupFile">
                        Choose Backup File
                    </button>
                </div>
            </div>

            <p style="
                margin-top: 18px;
                font-size: 13px;
                color: var(--text-muted);
            ">
                Important: Restoring a backup replaces the current
                Glass Management System records. Download a fresh backup
                before restoring an older one.
            </p>
        `;

        settingsSection.appendChild(card);

        document.getElementById('downloadSystemBackup')
            .addEventListener('click', downloadBackup);

        const fileInput = document.getElementById('restoreBackupFile');

        document.getElementById('chooseBackupFile')
            .addEventListener('click', function () {
                fileInput.click();
            });

        fileInput.addEventListener('change', function () {
            if (fileInput.files.length > 0) {
                restoreBackup(fileInput.files[0]);
                fileInput.value = '';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', addBackupInterface);

    window.GlassBackup = {
        download: downloadBackup,
        restore: restoreBackup
    };

})();

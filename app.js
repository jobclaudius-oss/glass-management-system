'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const toastContainer = document.getElementById('toastContainer');

    // Display notifications
    window.showToast = function (message, type = 'success') {
        if (!toastContainer) {
            alert(message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');

            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Switch between application pages
    function showPage(pageName) {
        const sections = document.querySelectorAll('[data-section]');
        const navigationLinks = document.querySelectorAll('[data-page]');

        let pageFound = false;

        sections.forEach(section => {
            const isActive = section.dataset.section === pageName;
            section.classList.toggle('active', isActive);

            if (isActive) {
                pageFound = true;
            }
        });

        if (!pageFound) {
            window.showToast('This page is not available yet.', 'warning');
            return;
        }

        navigationLinks.forEach(link => {
            link.classList.toggle(
                'active',
                link.dataset.page === pageName
            );
        });

        closeMobileMenu();

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        document.dispatchEvent(
            new CustomEvent('pageChanged', {
                detail: { page: pageName }
            })
        );
    }

    // Make page navigation available to other JavaScript files
    window.showPage = showPage;

    // Navigation link clicks
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();

            const pageName = link.dataset.page;

            if (!pageName) return;

            if (pageName === 'logout') {
                window.showToast(
                    'Logout will be available when user authentication is added.',
                    'info'
                );
                return;
            }

            showPage(pageName);
        });
    });

    // Mobile sidebar
    function openMobileMenu() {
        if (sidebar) sidebar.classList.add('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function closeMobileMenu() {
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', openMobileMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileMenu);
    }

    
    // Modal controls
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    window.closeModal = function () {
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    };

    window.openModal = function (title = '', subtitle = '', body = '', footer = '') {
        if (!modalOverlay) {
            console.error('Modal overlay was not found.');
            return;
        }

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (modalSubtitle) {
            modalSubtitle.textContent = subtitle;
        }

        if (modalBody) {
            modalBody.innerHTML = body;
        }

        if (modalFooter) {
            modalFooter.innerHTML = footer;
        }

        modalOverlay.classList.add('active');
    };

    if (modalClose) {
        modalClose.addEventListener('click', window.closeModal);
    }

    if (modalCancel) {
        modalCancel.addEventListener('click', window.closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', event => {
            if (event.target === modalOverlay) {
                window.closeModal();
            }
        });
    }


    // Keyboard accessibility
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            window.closeModal();
            closeMobileMenu();
        }
    });

    // Start on the dashboard
    showPage('dashboard');

    console.log('Glass Management System navigation initialized.');
});

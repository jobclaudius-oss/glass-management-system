'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

    const forgotPassword = document.getElementById('forgotPassword');
    const loginMessage = document.getElementById('loginMessage');
    const currentYear = document.getElementById('currentYear');

    // Restore the previously selected theme
    const savedTheme = localStorage.getItem('glasspro_login_theme');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    function updateThemeButton() {
        const isDark = document.body.classList.contains('dark-theme');

        themeIcon.textContent = isDark ? '☀' : '☾';
        themeText.textContent = isDark ? 'Light mode' : 'Dark mode';

        themeToggle.setAttribute(
            'aria-label',
            isDark ? 'Switch to light theme' : 'Switch to dark theme'
        );
    }

    function switchTheme() {
        document.body.classList.toggle('dark-theme');

        const newTheme = document.body.classList.contains('dark-theme')
            ? 'dark'
            : 'light';

        localStorage.setItem('glasspro_login_theme', newTheme);

        updateThemeButton();
    }

    updateThemeButton();

    // Automatically switch themes every 10 seconds
    setInterval(switchTheme, 10000);

    // Allow manual theme switching
    themeToggle.addEventListener('click', switchTheme);

    // Show and hide password
    passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';

        passwordInput.type = isPassword ? 'text' : 'password';

        passwordToggle.textContent = isPassword ? 'Hide' : 'Show';
    });

    // Forgot password placeholder
    forgotPassword.addEventListener('click', (event) => {
        event.preventDefault();

        loginMessage.textContent =
            'Password recovery will be configured in a future step.';
    });

    // Current year
    currentYear.textContent = new Date().getFullYear();
});

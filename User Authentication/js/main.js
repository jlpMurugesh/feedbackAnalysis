// Global utilities and initialization
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated and redirect appropriately
    const currentPage = window.location.pathname.split('/').pop();
    
    if (auth.isAuthenticated() && (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === '')) {
        window.location.href = 'dashboard.html';
    } else if (!auth.isAuthenticated() && currentPage === 'dashboard.html') {
        window.location.href = 'index.html';
    }
});

// Utility functions
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="${type}">${message}</div>`;
    }
}

// Form validation utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Step 1: Paste your Firebase Configuration here
const firebaseConfig = {
  apiKey: "AIzaSyBWN8f4kSyYQj_5F35DtL9Drw9za46kmUg",
  authDomain: "feedbackanalysis-28073.firebaseapp.com",
  projectId: "feedbackanalysis-28073",
  storageBucket: "feedbackanalysis-28073.firebasestorage.app",
  messagingSenderId: "542476452217",
  appId: "1:542476452217:web:63f66e4a57412b8378afa8",
  measurementId: "G-KJE7GJX71G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Elements
const authContainer = document.getElementById('auth-container');
const signupFormContainer = document.getElementById('signup-form-container');
const loginFormContainer = document.getElementById('login-form-container');
const dashboardContainer = document.getElementById('dashboard-container');

const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');

const showLoginLink = document.getElementById('show-login');
const showSignupLink = document.getElementById('show-signup');

const userEmailSpan = document.getElementById('user-email');
const signupErrorMessage = document.getElementById('signup-error-message');
const loginErrorMessage = document.getElementById('login-error-message');

// --- Enhanced Error Handling Function ---
function getReadableErrorMessage(error) {
    // Handle Firebase Auth error codes
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try logging in instead.';
        
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        
        case 'auth/invalid-login-credentials':
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please check your credentials and try again.';
        
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
        
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is not enabled. Please contact support.';
        
        default:
            // Fallback for unknown errors - extract clean message
            if (error.message) {
                // Remove Firebase prefixes and technical details
                let cleanMessage = error.message;
                
                // Remove "Firebase: Error (auth/xxx-xxx)" prefix
                cleanMessage = cleanMessage.replace(/Firebase: Error \([^)]+\)\.\s*/, '');
                
                // Remove technical JSON structures
                if (cleanMessage.includes('{"error"')) {
                    return 'Authentication failed. Please check your credentials and try again.';
                }
                
                return cleanMessage;
            }
            
            return 'An unexpected error occurred. Please try again.';
    }
}

// Enhanced function to show/hide errors with animation
function displayError(errorElement, message) {
    if (message) {
        errorElement.textContent = message;
        // Force reflow to ensure the transition works
        errorElement.offsetHeight;
    } else {
        errorElement.textContent = '';
    }
}

// --- UI Toggle Functions ---
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupFormContainer.classList.add('hidden');
    loginFormContainer.classList.remove('hidden');
    // Clear error messages when switching
    displayError(signupErrorMessage, '');
    displayError(loginErrorMessage, '');
});

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.remove('hidden');
    // Clear error messages when switching
    displayError(signupErrorMessage, '');
    displayError(loginErrorMessage, '');
});

// --- Firebase Auth Logic ---

// Sign Up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    // Clear previous errors and show loading state
    displayError(signupErrorMessage, '');
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating Account...';
    submitButton.disabled = true;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('User signed up:', userCredential.user);
            signupForm.reset();
        })
        .catch((error) => {
            console.error('Sign up error:', error);
            displayError(signupErrorMessage, getReadableErrorMessage(error));
        })
        .finally(() => {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
});

// Log In
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Clear previous errors and show loading state
    displayError(loginErrorMessage, '');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Signing In...';
    submitButton.disabled = true;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('User logged in:', userCredential.user);
            loginForm.reset();
        })
        .catch((error) => {
            console.error('Log in error:', error);
            displayError(loginErrorMessage, getReadableErrorMessage(error));
        })
        .finally(() => {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
});

// Log Out
logoutButton.addEventListener('click', () => {
    logoutButton.textContent = 'Signing Out...';
    logoutButton.disabled = true;
    
    auth.signOut().then(() => {
        console.log('User logged out');
    }).catch((error) => {
        console.error('Log out error:', error);
        // Reset button if error occurs
        logoutButton.textContent = 'Log Out';
        logoutButton.disabled = false;
    });
});

// --- Auth State Observer ---
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log('Auth state changed: Logged in as', user.email);
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
        // Clear any error messages
        displayError(signupErrorMessage, '');
        displayError(loginErrorMessage, '');
    } else {
        // User is signed out
        console.log('Auth state changed: Logged out');
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
        loginFormContainer.classList.add('hidden');
        signupFormContainer.classList.remove('hidden');
        // Clear form inputs and reset logout button
        signupForm.reset();
        loginForm.reset();
        logoutButton.textContent = 'Log Out';
        logoutButton.disabled = false;
    }
});

// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// ---------------------------------------------------------------------------------------------
// TODO: Add your Firebase project's configuration object here
const firebaseConfig = {
  apiKey: "AIzaSyBWN8f4kSyYQj_5F35DtL9Drw9za46kmUg",
  authDomain: "feedbackanalysis-28073.firebaseapp.com",
  projectId: "feedbackanalysis-28073",
  storageBucket: "feedbackanalysis-28073.firebasestorage.app",
  messagingSenderId: "542476452217",
  appId: "1:542476452217:web:63f66e4a57412b8378afa8",
  measurementId: "G-KJE7GJX71G"
};
// ---------------------------------------------------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get references to the DOM elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');
const userEmailSpan = document.getElementById('user-email');
const errorMessage = document.getElementById('error-message');

// --- EVENT LISTENERS ---

// Sign Up
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up
            const user = userCredential.user;
            console.log('User signed up:', user);
            errorMessage.textContent = '';
            signupForm.reset();
        })
        .catch((error) => {
            console.error('Sign up error:', error.message);
            errorMessage.textContent = error.message;
        });
});

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('User logged in:', user);
            errorMessage.textContent = '';
            loginForm.reset();
        })
        .catch((error) => {
            console.error('Login error:', error.message);
            errorMessage.textContent = error.message;
        });
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log('User logged out');
    }).catch((error) => {
        console.error('Logout error:', error.message);
    });
});


// --- AUTH STATE OBSERVER ---
// This is the most important function. It runs when the page loads and
// whenever the user's authentication state changes (login/logout).
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log('Auth state changed: Logged in as', user.email);
        dashboardContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        userEmailSpan.textContent = user.email;
    } else {
        // User is signed out
        console.log('Auth state changed: Logged out');
        dashboardContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
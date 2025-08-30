// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBWN8f4kSyYQj_5F35DtL9Drw9za46kmUg",
  authDomain: "feedbackanalysis-28073.firebaseapp.com",
  projectId: "feedbackanalysis-28073",
  storageBucket: "feedbackanalysis-28073.firebasestorage.app",
  messagingSenderId: "542476452217",
  appId: "1:542476452217:web:63f66e4a57412b8378afa8",
  measurementId: "G-KJE7GJX71G"
};

// Firebase REST API endpoints
const FIREBASE_API_BASE = `https://identitytoolkit.googleapis.com/v1/accounts:`;
const FIREBASE_ENDPOINTS = {
    SIGN_UP: `${FIREBASE_API_BASE}signUp?key=${firebaseConfig.apiKey}`,
    SIGN_IN: `${FIREBASE_API_BASE}signInWithPassword?key=${firebaseConfig.apiKey}`,
    REFRESH_TOKEN: `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
    GET_USER_DATA: `${FIREBASE_API_BASE}lookup?key=${firebaseConfig.apiKey}`
};

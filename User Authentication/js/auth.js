class FirebaseAuth {
    constructor() {
        this.currentUser = null;
        this.checkAuthState();
    }

    // Sign up with email and password
    async signUp(email, password) {
        try {
            const response = await fetch(FIREBASE_ENDPOINTS.SIGN_UP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error.message);
            }

            // Store user data in localStorage
            this.storeUserData(data);
            return { success: true, user: data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            const response = await fetch(FIREBASE_ENDPOINTS.SIGN_IN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    returnSecureToken: true
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error.message);
            }

            // Store user data in localStorage
            this.storeUserData(data);
            return { success: true, user: data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Sign out user
    signOut() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        this.currentUser = null;
        window.location.href = 'index.html';
    }

    // Store user data in localStorage
    storeUserData(userData) {
        localStorage.setItem('userToken', userData.idToken);
        localStorage.setItem('refreshToken', userData.refreshToken);
        localStorage.setItem('userEmail', userData.email);
        this.currentUser = userData;
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('userToken');
        return token !== null;
    }

    // Get current user
    getCurrentUser() {
        if (this.isAuthenticated()) {
            return {
                email: localStorage.getItem('userEmail'),
                token: localStorage.getItem('userToken')
            };
        }
        return null;
    }

    // Check authentication state on page load
    checkAuthState() {
        if (this.isAuthenticated()) {
            this.currentUser = this.getCurrentUser();
        }
    }

    // Refresh token when needed
    async refreshAuthToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(FIREBASE_ENDPOINTS.REFRESH_TOKEN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('userToken', data.id_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        return false;
    }
}

// Initialize Firebase Auth
const auth = new FirebaseAuth();

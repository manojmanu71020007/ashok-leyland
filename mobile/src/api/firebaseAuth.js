// Firebase Authentication Client for Ashok Leyland Fleet Mobile
// Matches the Firebase project used in login.html

export const firebaseConfig = {
  apiKey: 'AIzaSyDkTLrbsx9ttciXDYMnljsZ0l46Qgn3lm0',
  authDomain: 'smart-bus-scheduling.firebaseapp.com',
  projectId: 'smart-bus-scheduling',
  storageBucket: 'smart-bus-scheduling.firebasestorage.app',
  messagingSenderId: '807662015582',
  appId: '1:807662015582:web:44f9c687827aafe27590cf',
  measurementId: 'G-8KS1F3JP18',
};

const BASE_URL = 'https://identitytoolkit.googleapis.com/v1';

function friendlyError(codeOrMsg) {
  const msg = String(codeOrMsg || '');
  if (msg.includes('EMAIL_NOT_FOUND')) {
    return 'No account found with this email. Please check the spelling or sign up.';
  }
  if (msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Incorrect password. Please try again.';
  }
  if (msg.includes('EMAIL_EXISTS')) {
    return 'An account with this email already exists. Please sign in.';
  }
  if (msg.includes('USER_DISABLED')) {
    return 'This account has been disabled by the administrator.';
  }
  if (msg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    return 'Too many failed login attempts. Please try again in a few minutes.';
  }
  if (msg.includes('WEAK_PASSWORD')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (msg.includes('INVALID_EMAIL')) {
    return 'Invalid email address format.';
  }
  return msg || 'Authentication failed. Please check your network and credentials.';
}

export const firebaseAuth = {
  // Sign in with Email and Password using Firebase Auth REST API
  signInWithEmail: async (email, password) => {
    try {
      const res = await fetch(`${BASE_URL}/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(email).trim(),
          password,
          returnSecureToken: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || 'Login failed';
        return { ok: false, error: friendlyError(errorMsg) };
      }

      return {
        ok: true,
        user: {
          uid: data.localId,
          email: data.email,
          displayName: data.displayName || data.email.split('@')[0].toUpperCase(),
          idToken: data.idToken,
          refreshToken: data.refreshToken,
        },
      };
    } catch (err) {
      return { ok: false, error: friendlyError(err.message) };
    }
  },

  // Register new account with Email, Password and Full Name
  signUpWithEmail: async (name, email, password) => {
    try {
      const res = await fetch(`${BASE_URL}/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(email).trim(),
          password,
          returnSecureToken: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || 'Sign up failed';
        return { ok: false, error: friendlyError(errorMsg) };
      }

      // Update Display Name
      if (name && data.idToken) {
        try {
          await fetch(`${BASE_URL}/accounts:update?key=${firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken: data.idToken,
              displayName: name.trim(),
              returnSecureToken: false,
            }),
          });
        } catch (e) {
          // Non-blocking displayName update
        }
      }

      return {
        ok: true,
        user: {
          uid: data.localId,
          email: data.email,
          displayName: name.trim() || data.email.split('@')[0].toUpperCase(),
          idToken: data.idToken,
          refreshToken: data.refreshToken,
        },
      };
    } catch (err) {
      return { ok: false, error: friendlyError(err.message) };
    }
  },

  // Sign in with Google IdP / credential
  signInWithGoogleIdp: async (idToken) => {
    try {
      const res = await fetch(`${BASE_URL}/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: `id_token=${idToken}&providerId=google.com`,
          requestUri: 'http://localhost',
          returnIdpCredential: true,
          returnSecureToken: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || 'Google sign-in failed';
        return { ok: false, error: friendlyError(errorMsg) };
      }

      return {
        ok: true,
        user: {
          uid: data.localId,
          email: data.email,
          displayName: data.displayName || data.email.split('@')[0].toUpperCase(),
          idToken: data.idToken,
          refreshToken: data.refreshToken,
        },
      };
    } catch (err) {
      return { ok: false, error: friendlyError(err.message) };
    }
  },
};

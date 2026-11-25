import React, { createContext, useState, useContext, useEffect } from 'react';
import { authenticateUser, syncDepotsWithServer } from './accounts';
import { api } from '../api/client';

const AuthContext = createContext();
const PENDING_RELOAD_SESSION_KEY = 'al_pending_restore_session';

function consumePendingReloadSession() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(PENDING_RELOAD_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_RELOAD_SESSION_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.user || !parsed.ts || Date.now() - Number(parsed.ts) > 60000) {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [initialRestored] = useState(() => consumePendingReloadSession());
  const [user, setUser] = useState(() => initialRestored?.user || null);
  const [selectedDepot, setSelectedDepot] = useState(() => String(initialRestored?.selectedDepot || '1')); // '1' = Chandapura (Depot 1), '2' = Depot 2
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(initialRestored?.isAuthenticated && initialRestored?.user));
  const [currentScreen, setCurrentScreen] = useState(() => initialRestored?.currentScreen || 'LOGIN'); // 'LOGIN' | 'CHARGING' | 'CLEANING' | 'SCHEDULING' | 'DEPOT_OPS' | 'ADMIN_WORKSPACE'

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePrepareReload = () => {
      try {
        if (typeof sessionStorage === 'undefined') return;
        if (isAuthenticated && user) {
          sessionStorage.setItem(
            PENDING_RELOAD_SESSION_KEY,
            JSON.stringify({
              user,
              selectedDepot,
              isAuthenticated: true,
              currentScreen,
              ts: Date.now(),
            })
          );
        }
      } catch (_) {}
    };
    window.addEventListener('al-prepare-version-reload', handlePrepareReload);
    return () => window.removeEventListener('al-prepare-version-reload', handlePrepareReload);
  }, [isAuthenticated, user, selectedDepot, currentScreen]);

  /**
   * Log in with username and password.
   * Matches against authorized credentials and opens the designated screen.
   */
  const loginWithCredentials = async (username, password) => {
    let authResult = authenticateUser(username, password);
    if (!authResult.ok) {
      try {
        if (typeof api !== 'undefined' && api && typeof api.getCustomDepots === 'function') {
          const res = await api.getCustomDepots();
          if (res && res.ok && res.data) {
            syncDepotsWithServer(res.data.customDepots || [], res.data.customAccounts || {});
            authResult = authenticateUser(username, password);
          }
        }
      } catch (_) {}
    }

    if (!authResult.ok) {
      return authResult;
    }

    const account = authResult.account;
    const targetDepot = String(account.depot || '1');

    setUser({
      username: account.username,
      name: account.name || account.username,
      role: account.role || 'Operator',
      email: account.email || '',
      depot: targetDepot,
      pageName: account.pageName || '',
      targetScreen: account.targetScreen || 'ADMIN_WORKSPACE',
    });

    setSelectedDepot(targetDepot);
    setIsAuthenticated(true);
    setCurrentScreen(account.targetScreen || 'ADMIN_WORKSPACE');

    return { ok: true, account };
  };

  /**
   * Sign out and return to clean login page
   */
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('LOGIN');
  };

  /**
   * Return back to login page from any operational screen
   */
  const returnToLogin = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentScreen('LOGIN');
  };

  /**
   * Open a designated screen programmatically
   */
  const openStandaloneScreen = (screenName) => {
    setCurrentScreen(screenName);
  };

  /**
   * Open a designated operational screen for a specific depot
   */
  const openDepotScreen = (screenName, depotId) => {
    setSelectedDepot(String(depotId || '1'));
    setCurrentScreen(screenName);
  };

  /**
   * Switch active depot ('1', '2', or custom depot id)
   */
  const switchDepot = (depotId) => {
    const sanitizedDepot = String(depotId || '1');
    setSelectedDepot(sanitizedDepot);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        selectedDepot,
        setSelectedDepot,
        switchDepot,
        currentScreen,
        loginWithCredentials,
        logout,
        returnToLogin,
        openStandaloneScreen,
        openDepotScreen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

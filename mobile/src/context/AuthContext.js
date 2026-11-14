import React, { createContext, useState, useContext } from 'react';
import { authenticateUser, syncDepotsWithServer } from './accounts';
import { api } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [selectedDepot, setSelectedDepot] = useState('1'); // '1' = Chandapura (Depot 1), '2' = Depot 2
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('LOGIN'); // 'LOGIN' | 'CHARGING' | 'CLEANING' | 'SCHEDULING' | 'DEPOT_OPS' | 'ADMIN_WORKSPACE'

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

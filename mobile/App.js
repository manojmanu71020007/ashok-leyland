import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { FleetProvider } from './src/context/FleetContext';
import AppNavigator from './src/navigation/AppNavigator';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App runtime render error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>⚠️</Text>
          <Text style={errorStyles.title}>Operational View Recovered</Text>
          <Text style={errorStyles.msg}>
            {String(this.state.error?.message || 'An unexpected render condition occurred.')}
          </Text>
          <TouchableOpacity
            style={errorStyles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.btnText}>Reload View</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  msg: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const styleId = 'al-no-focus-outline';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = [
        'input, textarea, select { outline: none !important; outline-width: 0 !important; outline-style: none !important; }',
        'input:focus, input:focus-visible, textarea:focus, textarea:focus-visible, select:focus, select:focus-visible { outline: none !important; outline-width: 0 !important; outline-style: none !important; outline-offset: 0 !important; box-shadow: none !important; }',
      ].join('\n');
      document.head.appendChild(styleEl);
    }

    // Instant Live Update Watcher: reload seamlessly whenever a new app build is deployed
    let cancelled = false;
    let isReloading = false;
    let baselineVersion = null;
    const currentScript = document.querySelector('script[src*="/_expo/static/js/web/index-"]');
    const baselineBundleSrc = currentScript ? currentScript.getAttribute('src') : '';

    const performInstantReload = () => {
      if (isReloading || cancelled) return;
      isReloading = true;
      try {
        window.dispatchEvent(new Event('al-prepare-version-reload'));
      } catch (_) {}
      const reloadNow = () => {
        try {
          window.location.reload();
        } catch (_) {}
      };
      if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
        caches.keys()
          .then((names) => Promise.all(names.map((n) => caches.delete(n))))
          .then(reloadNow)
          .catch(reloadNow);
      } else {
        reloadNow();
      }
    };

    const checkAppVersion = async () => {
      if (cancelled || isReloading) return;
      try {
        const res = await fetch(`/api/app-version?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.version) return;

        if (baselineBundleSrc && data.bundleSrc && data.bundleSrc !== baselineBundleSrc) {
          performInstantReload();
          return;
        }
        if (!baselineVersion) {
          baselineVersion = data.version;
          return;
        }
        if (data.version !== baselineVersion) {
          performInstantReload();
        }
      } catch (_) {}
    };

    checkAppVersion();
    const versionTimer = setInterval(checkAppVersion, 15000);
    const onFocusCheck = () => checkAppVersion();
    const onVisibilityCheck = () => {
      if (document.visibilityState === 'visible') {
        checkAppVersion();
      }
    };
    window.addEventListener('focus', onFocusCheck);
    document.addEventListener('visibilitychange', onVisibilityCheck);

    let swReg = null;
    const onControllerChange = () => performInstantReload();
    const onSwMessage = (event) => {
      if (event?.data?.type === 'SW_UPDATED') {
        performInstantReload();
      }
    };
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.addEventListener('message', onSwMessage);
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          swReg = reg;
          reg.update().catch(() => {});
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (worker) {
              worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                  worker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch(() => {});
    }
    const swInterval = setInterval(() => {
      if (swReg) swReg.update().catch(() => {});
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(versionTimer);
      clearInterval(swInterval);
      window.removeEventListener('focus', onFocusCheck);
      document.removeEventListener('visibilitychange', onVisibilityCheck);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#f8fafc" />
      <LanguageProvider>
        <AuthProvider>
          <FleetProvider>
            <NavigationContainer>
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
            </NavigationContainer>
          </FleetProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

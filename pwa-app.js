/**
 * Ashok Leyland Smart Bus PWA Controller
 * Handles Service Worker registration, mobile screen responsiveness, install prompts,
 * standalone mode detection, and iOS Add-to-Home-Screen guidance.
 */
(function() {
    'use strict';

    // 1. Mobile Responsiveness & PWA Styles Injection (Runs on all pages & standalone mode)
    function injectPwaStyles() {
        if (document.getElementById('pwa-install-styles')) return;
        const style = document.createElement('style');
        style.id = 'pwa-install-styles';
        style.textContent = `
            /* ── Global Phone Screen Adaptive Optimizations ── */
            @media (max-width: 768px) {
                html, body {
                    overflow-x: hidden !important;
                    width: 100% !important;
                    -webkit-overflow-scrolling: touch;
                    touch-action: manipulation;
                }

                /* Safe Area insets for modern edge-to-edge mobile screens (Notches / Home bars) */
                body {
                    padding-top: max(0px, env(safe-area-inset-top));
                    padding-bottom: max(16px, env(safe-area-inset-bottom));
                    padding-left: max(0px, env(safe-area-inset-left));
                    padding-right: max(0px, env(safe-area-inset-right));
                }

                /* Prevent iOS Safari from jarringly zooming in when focusing form inputs */
                input[type="text"],
                input[type="password"],
                input[type="email"],
                input[type="number"],
                input[type="time"],
                select,
                textarea {
                    font-size: 16px !important;
                }

                /* Container shells adapt to phone width with clean 12px margins */
                .shell, .container, .page-wrapper {
                    padding-left: 12px !important;
                    padding-right: 12px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }

                /* Grid layouts collapse to clean thumb-friendly vertical cards */
                .grid, .allocation-grid {
                    grid-template-columns: 1fr !important;
                    gap: 16px !important;
                }

                /* Header bars wrap neatly */
                .topbar, .panel-heading-row {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 12px !important;
                }

                /* Horizontal scroll containers for wide tables */
                .scheduled-table-wrap, .table-wrap, .overflow-x-auto {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                    width: 100% !important;
                }

                /* Modals fill phone screen cleanly */
                .modal-dialog {
                    width: 95% !important;
                    max-width: 95% !important;
                    margin: 12px auto !important;
                    max-height: 90vh !important;
                }

                /* Touch-friendly button tap targets (minimum 40px) */
                button, .tab-btn, .section-nav-btn {
                    min-height: 40px;
                }
            }

            /* ── Floating Install Pill Button ── */
            .pwa-install-pill {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 99999;
                display: none;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 0.35);
                box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
                padding: 10px 18px;
                border-radius: 9999px;
                font-family: inherit;
                font-size: 0.88rem;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, background 0.2s;
                text-decoration: none;
            }
            .pwa-install-pill:hover {
                transform: translateY(-2px) scale(1.03);
                box-shadow: 0 14px 30px -5px rgba(2, 132, 199, 0.55);
                background: linear-gradient(135deg, #0284c7, #0369a1);
            }
            .pwa-install-pill:active {
                transform: translateY(0) scale(0.98);
            }
            .pwa-install-icon {
                font-size: 1.15rem;
                line-height: 1;
            }
            .pwa-install-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                font-size: 1.1rem;
                line-height: 1;
                cursor: pointer;
                padding: 0 0 0 6px;
                display: flex;
                align-items: center;
            }
            .pwa-install-close:hover {
                color: #ffffff;
            }

            /* ── iOS Instructions Modal ── */
            .pwa-ios-modal-backdrop {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(6px);
                z-index: 100000;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .pwa-ios-modal {
                background: #ffffff;
                color: #0f172a;
                border-radius: 20px;
                max-width: 420px;
                width: 100%;
                padding: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
                text-align: center;
                position: relative;
                font-family: inherit;
            }
            .pwa-ios-modal h3 {
                margin: 0 0 8px;
                font-size: 1.25rem;
                color: #0369a1;
            }
            .pwa-ios-modal p {
                margin: 0 0 16px;
                font-size: 0.9rem;
                color: #64748b;
                line-height: 1.5;
            }
            .pwa-ios-steps {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 14px 16px;
                text-align: left;
                font-size: 0.88rem;
                color: #334155;
                margin-bottom: 20px;
                line-height: 1.6;
            }
            .pwa-ios-close-btn {
                background: #0284c7;
                color: #ffffff;
                border: none;
                padding: 10px 24px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 0.95rem;
                cursor: pointer;
                width: 100%;
            }
            @media (max-width: 640px) {
                .pwa-install-pill {
                    bottom: 16px;
                    right: 16px;
                    left: 16px;
                    justify-content: center;
                    border-radius: 14px;
                    padding: 12px 18px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Always inject mobile styles immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPwaStyles);
    } else {
        injectPwaStyles();
    }

    // 2. Service Worker Registration
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then((registration) => {
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);
                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.addEventListener('statechange', () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[PWA] New version available in background.');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.warn('[PWA] Service Worker registration failed:', error);
                });
        });
    }

    // 3. Standalone Mode Check
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://') ||
                         window.location.search.includes('source=pwa');

    if (isStandalone) {
        console.log('[PWA] Running in Standalone App Mode.');
        document.documentElement.classList.add('pwa-standalone');
        return; // Don't show install pill if already installed and running standalone
    }

    // 4. UI Element Creation for Install Button & Modal
    let deferredPrompt = null;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    function createPwaUI() {
        if (document.getElementById('pwa-install-pill')) return;

        // 1. Install Pill Button
        const pill = document.createElement('div');
        pill.id = 'pwa-install-pill';
        pill.className = 'pwa-install-pill';
        pill.innerHTML = `
            <span class="pwa-install-icon">📲</span>
            <span class="pwa-install-text">Install Ashok-Leyland BMS</span>
            <button type="button" class="pwa-install-close" id="pwa-dismiss-btn" title="Dismiss">✕</button>
        `;
        document.body.appendChild(pill);

        // 2. iOS Instructions Modal
        const iosModal = document.createElement('div');
        iosModal.id = 'pwa-ios-modal';
        iosModal.className = 'pwa-ios-modal-backdrop';
        iosModal.innerHTML = `
            <div class="pwa-ios-modal">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">🚌⚡</div>
                <h3>Install Ashok-Leyland BMS</h3>
                <p>Install this app on your device for fast, full-screen fleet management:</p>
                <div class="pwa-ios-steps">
                    1. Tap the <strong>Share</strong> button <span style="font-size:1.1rem">⎋</span> at the bottom of Safari.<br>
                    2. Scroll down and tap <strong>"Add to Home Screen"</strong> <span style="font-size:1.1rem">⊞</span>.<br>
                    3. Tap <strong>"Add"</strong> in the top-right corner.
                </div>
                <button type="button" class="pwa-ios-close-btn" id="pwa-ios-close-btn">Got It!</button>
            </div>
        `;
        document.body.appendChild(iosModal);

        // Events
        pill.addEventListener('click', (e) => {
            if (e.target.id === 'pwa-dismiss-btn') {
                e.stopPropagation();
                pill.style.display = 'none';
                sessionStorage.setItem('pwa_prompt_dismissed', 'true');
                return;
            }

            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('[PWA] User accepted the install prompt');
                        pill.style.display = 'none';
                    }
                    deferredPrompt = null;
                });
            } else if (isIOS) {
                iosModal.style.display = 'flex';
            } else {
                alert("To install: Tap your browser's menu (⋮ or ...) and select 'Install App' or 'Add to Home Screen'.");
            }
        });

        document.getElementById('pwa-ios-close-btn')?.addEventListener('click', () => {
            iosModal.style.display = 'none';
        });

        iosModal.addEventListener('click', (e) => {
            if (e.target === iosModal) iosModal.style.display = 'none';
        });
    }

    // 5. Capture 'beforeinstallprompt' (Chrome, Edge, Samsung Browser, etc.)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        if (sessionStorage.getItem('pwa_prompt_dismissed') === 'true') {
            return;
        }

        createPwaUI();
        const pill = document.getElementById('pwa-install-pill');
        if (pill) {
            pill.style.display = 'inline-flex';
        }
    });

    // 6. iOS Safari banner trigger
    if (isIOS && !isStandalone && sessionStorage.getItem('pwa_prompt_dismissed') !== 'true') {
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                createPwaUI();
                const pill = document.getElementById('pwa-install-pill');
                if (pill) pill.style.display = 'inline-flex';
            }, 1200);
        });
    }

    // 7. Installed event
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Ashok-Leyland Bus Management System was installed successfully.');
        const pill = document.getElementById('pwa-install-pill');
        if (pill) pill.style.display = 'none';
        deferredPrompt = null;
    });

})();

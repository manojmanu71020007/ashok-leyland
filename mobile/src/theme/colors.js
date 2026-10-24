export const colors = {
  // Light Theme Base
  background: '#f8fafc',      // Clean slate/gray-white background
  surface: '#ffffff',         // Pure white cards & containers
  surfaceElevated: '#ffffff', // Elevated white cards with shadow
  surfaceHover: '#f1f5f9',    // Light hover state
  border: '#e2e8f0',          // Soft light slate border
  borderLight: '#cbd5e1',     // Slightly darker outline
  
  // Brand & Accent Colors
  primary: '#0284c7',         // Rich professional sky/teal blue
  primaryDark: '#0369a1',
  primaryGlow: 'rgba(2, 132, 199, 0.12)',
  cyan: '#0891b2',
  
  // Semantic Status Colors
  success: '#059669',         // Deep crisp emerald
  warning: '#d97706',         // Warm amber
  danger: '#dc2626',          // Clean red
  info: '#0284c7',            // Blue
  purple: '#7c3aed',          // Purple
  
  // Typography (High contrast, dark slate text)
  text: '#0f172a',            // Dark slate text (ultra legible)
  textSecondary: '#334155',   // Medium slate text
  textMuted: '#64748b',       // Soft muted slate
  textSubtle: '#94a3b8',      // Light gray captions & placeholders
  
  // Battery color helper
  getSocColor: (soc) => {
    const val = Number(soc) || 0;
    if (val >= 70) return '#059669';
    if (val >= 40) return '#d97706';
    return '#dc2626';
  },

  // Category badge colors (Light pastel backgrounds with solid legible text)
  getCategoryColor: (cat) => {
    const c = String(cat || '').toUpperCase();
    if (c === 'A') return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
    if (c === 'B') return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' };
    return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' };
  }
};

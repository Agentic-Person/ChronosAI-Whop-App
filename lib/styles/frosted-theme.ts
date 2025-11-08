/**
 * Frosted UI Theme Configuration
 * Based on Whop's Frosted UI Design System
 * Reference: https://storybook.whop.dev
 */

/**
 * Frosted UI uses a glass morphism effect with:
 * - Backdrop blur for translucent backgrounds
 * - Subtle borders and shadows
 * - Adaptive colors that work with both light/dark modes
 */

export const frostedColors = {
  // Background layers (glass effect)
  glass: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    tertiary: 'rgba(255, 255, 255, 0.03)',
  },

  // Borders (subtle outlines)
  border: {
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.18)',
    weak: 'rgba(255, 255, 255, 0.06)',
  },

  // Text colors (adaptive)
  text: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: 'rgba(255, 255, 255, 0.70)',
    tertiary: 'rgba(255, 255, 255, 0.50)',
    disabled: 'rgba(255, 255, 255, 0.30)',
  },

  // Accent colors (Whop brand)
  accent: {
    primary: '#8B5CF6', // Purple
    primaryHover: '#7C3AED',
    secondary: '#3B82F6', // Blue
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};

export const frostedEffects = {
  // Blur strength
  blur: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
  },

  // Shadow depths
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Border radius
  radius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    full: '9999px',
  },
};

export const frostedSpacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
};

/**
 * Utility function to create frosted glass effect classes
 */
export function frostedClass(
  variant: 'primary' | 'secondary' | 'tertiary' = 'primary',
  blur: keyof typeof frostedEffects.blur = 'lg'
): string {
  const bgMap = {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    tertiary: 'rgba(255, 255, 255, 0.03)',
  };

  return `backdrop-blur-${blur} bg-[${bgMap[variant]}] border border-white/10`;
}

/**
 * Pre-defined frosted component styles
 */
export const frostedComponents = {
  card: {
    base: 'backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl shadow-lg',
    hover: 'hover:bg-white/8 hover:border-white/15 transition-all duration-200',
    active: 'active:bg-white/10',
  },

  button: {
    primary: 'backdrop-blur-md bg-purple-600/90 hover:bg-purple-600 border border-purple-500/30 text-white font-medium transition-all duration-150',
    secondary: 'backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 transition-all duration-150',
    ghost: 'backdrop-blur-sm hover:bg-white/5 text-white/80 hover:text-white transition-all duration-150',
    danger: 'backdrop-blur-md bg-red-600/90 hover:bg-red-600 border border-red-500/30 text-white font-medium transition-all duration-150',
  },

  input: {
    base: 'backdrop-blur-md bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:bg-white/8 focus:border-white/20 focus:outline-none transition-all duration-150',
  },

  modal: {
    overlay: 'backdrop-blur-sm bg-black/40',
    content: 'backdrop-blur-2xl bg-white/10 border border-white/15 rounded-2xl shadow-2xl',
  },

  dropdown: {
    trigger: 'backdrop-blur-md bg-white/8 hover:bg-white/12 border border-white/10 rounded-lg transition-all duration-150',
    content: 'backdrop-blur-xl bg-white/10 border border-white/15 rounded-lg shadow-xl',
  },
};

/**
 * Animation presets for Frosted UI
 */
export const frostedAnimations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },

  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.2 },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
  },
};

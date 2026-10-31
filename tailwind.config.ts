import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './{components,pages,contexts,hooks,utils,shared,config,services}/**/*.{ts,tsx}',
    './*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: '#FFFFFF',
        sidebar: '#F9F9FB',
        primary: '#111827',
        secondary: '#6B7280',
        accent: '#6366F1',
        'bubble-client': '#F3F4F6',
        'bubble-ai': '#EFF6FF',
        'bubble-manager': '#1E293B',
        'bubble-note': '#FEF3C7',
        'stage-default': '#64748b',
      },
    },
  },
  plugins: [],
} satisfies Config;

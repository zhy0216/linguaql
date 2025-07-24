import { initThemeMode, createTheme, ThemeProvider } from 'flowbite-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const customTheme = createTheme({
  pagination: {
    base: '',
    layout: {
      table: {
        base: 'text-xs text-gray-700 dark:text-gray-400',
        span: 'font-semibold text-gray-900 dark:text-white',
      },
    },
    pages: {
      base: 'xs:mt-0 mt-1 inline-flex items-center -space-x-px',
      showIcon: 'inline-flex',
      previous: {
        base: 'ml-0 rounded-l-lg border border-gray-300 bg-white px-2 py-1 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white',
        icon: 'h-3 w-3',
      },
      next: {
        base: 'rounded-r-lg border border-gray-300 bg-white px-2 py-1 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white',
        icon: 'h-3 w-3',
      },
      selector: {
        base: 'w-8 border border-gray-300 bg-white py-1 leading-tight text-gray-500 enabled:hover:bg-gray-100 enabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white',
        active:
          'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 hover:text-cyan-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white',
        disabled: 'cursor-not-allowed opacity-50',
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={customTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

initThemeMode();

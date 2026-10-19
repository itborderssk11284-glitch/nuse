import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getThemePreference } from './utils/storage';

// Initialize dark mode class on html element immediately
const initialTheme = getThemePreference();
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(<App />);

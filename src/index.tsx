// eslint-disable-next-line @typescript-eslint/no-unused-vars
import /* i18n from */ /* <-- uncomment the 'i18n from' to show string names */ './locales/i18n.ts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './input.css';
import App from './App';

const root: ReactDOM.Root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { BrandSite } from './components/brand/BrandSite';
import { I18nProvider } from './i18n';
import './styles.css';
import './brand.css';
import './mobile.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrandSite>
        <App />
      </BrandSite>
    </I18nProvider>
  </React.StrictMode>,
);

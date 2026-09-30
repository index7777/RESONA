import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { BrandSite } from './components/brand/BrandSite';
import './styles.css';
import './brand.css';
import './mobile.css';
import './hero-motion.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandSite>
      <App />
    </BrandSite>
  </React.StrictMode>,
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { defineCustomElements } from '@ionic/pwa-elements/loader';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Call the element loader after the app has been rendered the first time
defineCustomElements(window);
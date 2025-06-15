import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Assuming you might have a global CSS file, create if not present
import App from './App.jsx'; // Import your main App component with .jsx extension

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// reportWebVitals was removed as it's optional and not required for core functionality.
// If you want to add performance measurement later, you can re-implement it.

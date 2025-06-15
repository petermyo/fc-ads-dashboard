import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Assuming you might have a global CSS file, create if not present
import App from './App'; // Import your main App component
import reportWebVitals from './reportWebVitals'; // Optional: for performance measurement

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

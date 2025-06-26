import React, { useState } from 'react';
import './InfoButton.css';

const InfoButton = ({ title, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`info-button-container ${className}`}>
      <button 
        className="info-button"
        onClick={() => setIsOpen(!isOpen)}
        title={title || "Click for more information"}
      >
        ℹ️
      </button>
      
      {isOpen && (
        <div className="info-popup">
          <div className="info-popup-content">
            <button 
              className="info-close"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <div className="info-content">
              {children}
            </div>
          </div>
          <div 
            className="info-backdrop"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default InfoButton;
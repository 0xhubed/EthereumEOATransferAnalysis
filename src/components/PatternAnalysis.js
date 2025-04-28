import React, { useState, useEffect } from 'react';
import { analyzeTransactionPatterns, categorizeWalletBehavior, calculateRiskScore } from '../services/patternAnalysisService';
import './PatternAnalysis.css';

const PatternAnalysis = ({ transferPartners, transactions, searchAddress }) => {
  const [patternResults, setPatternResults] = useState(null);
  const [walletProfile, setWalletProfile] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('patterns');
  
  useEffect(() => {
    // Run pattern analysis when the component mounts or data changes
    if (transactions && searchAddress) {
      setIsLoading(true);
      
      // Analyze transaction patterns
      const patterns = analyzeTransactionPatterns(transactions, searchAddress);
      setPatternResults(patterns);
      
      // Categorize wallet behavior
      const profile = categorizeWalletBehavior(patterns);
      setWalletProfile(profile);
      
      // Calculate risk score
      const risk = calculateRiskScore(patterns);
      setRiskScore(risk);
      
      setIsLoading(false);
    }
  }, [transactions, searchAddress]);
  
  const renderPatternIcon = (pattern) => {
    let iconClass = '';
    
    switch (pattern.type) {
      case 'periodic_transfers':
        iconClass = 'fa-calendar-check';
        break;
      case 'round_number_transfers':
        iconClass = 'fa-coins';
        break;
      case 'distributor_pattern':
        iconClass = 'fa-share-alt';
        break;
      case 'collector_pattern':
        iconClass = 'fa-funnel-dollar';
        break;
      case 'whale_transfers':
        iconClass = 'fa-whale';
        break;
      case 'accumulation_pattern':
        iconClass = 'fa-chart-line';
        break;
      case 'distribution_pattern':
        iconClass = 'fa-chart-line-down';
        break;
      case 'burst_activity':
        iconClass = 'fa-bolt';
        break;
      case 'cyclical_behavior':
        iconClass = 'fa-sync';
        break;
      default:
        iconClass = 'fa-chart-bar';
    }
    
    return (
      <div className={`pattern-icon ${pattern.importance}`}>
        <i className={`fas ${iconClass}`}></i>
      </div>
    );
  };
  
  const renderConfidenceBadge = (confidence) => {
    let badgeClass = 'confidence-badge ';
    
    if (confidence >= 80) {
      badgeClass += 'high';
    } else if (confidence >= 50) {
      badgeClass += 'medium';
    } else {
      badgeClass += 'low';
    }
    
    return (
      <span className={badgeClass}>
        {confidence}%
      </span>
    );
  };
  
  const renderPatternsList = () => {
    if (!patternResults || !patternResults.patterns || patternResults.patterns.length === 0) {
      return (
        <div className="no-patterns">
          <p>No significant transaction patterns detected.</p>
          <p>This could be due to limited transaction history or irregular usage patterns.</p>
        </div>
      );
    }
    
    return (
      <div className="patterns-list">
        {patternResults.patterns.map((pattern, index) => (
          <div key={index} className={`pattern-card ${pattern.importance}`}>
            <div className="pattern-header">
              {renderPatternIcon(pattern)}
              <div className="pattern-title">
                <h4>{pattern.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h4>
                {renderConfidenceBadge(pattern.confidence)}
              </div>
            </div>
            <p className="pattern-description">{pattern.description}</p>
            <div className="pattern-details">
              {Object.entries(pattern.details).map(([key, value], i) => {
                // Skip arrays or objects for the simple view
                if (typeof value === 'object') return null;
                
                // Format the key for display
                const formattedKey = key.replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .replace(/([a-z])([A-Z])/g, '$1 $2');
                
                return (
                  <div key={i} className="detail-item">
                    <span className="detail-label">{formattedKey}:</span>
                    <span className="detail-value">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderWalletProfile = () => {
    if (!walletProfile) {
      return <div className="no-profile">Insufficient data to generate wallet profile.</div>;
    }
    
    return (
      <div className="wallet-profile">
        <div className="profile-header">
          <div className="profile-type">
            <h3>{walletProfile.type}</h3>
            {renderConfidenceBadge(walletProfile.confidence)}
          </div>
        </div>
        
        <div className="behaviors-list">
          <h4>Behavior Characteristics:</h4>
          {walletProfile.behaviors.length > 0 ? (
            <ul>
              {walletProfile.behaviors.map((behavior, index) => (
                <li key={index}>{behavior}</li>
              ))}
            </ul>
          ) : (
            <p>No specific behavior characteristics identified.</p>
          )}
        </div>
        
        <div className="profile-description">
          <h4>Explanation:</h4>
          <p>
            {getWalletTypeDescription(walletProfile.type)}
          </p>
        </div>
      </div>
    );
  };
  
  const renderRiskAnalysis = () => {
    if (!riskScore) {
      return <div className="no-risk-score">Insufficient data to calculate risk score.</div>;
    }
    
    return (
      <div className="risk-analysis">
        <div className="risk-header">
          <div className={`risk-score-display ${riskScore.level.toLowerCase().replace(' ', '-')}`}>
            <div className="risk-gauge">
              <div 
                className="risk-indicator" 
                style={{ transform: `rotate(${(riskScore.score / 100) * 180 - 90}deg)` }}
              ></div>
            </div>
            <div className="risk-value">{riskScore.score}</div>
          </div>
          <div className="risk-level">
            <h3>Risk Level: {riskScore.level}</h3>
          </div>
        </div>
        
        <div className="risk-factors">
          <h4>Risk Assessment Factors:</h4>
          {riskScore.factors.length > 0 ? (
            <ul>
              {riskScore.factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          ) : (
            <p>No specific risk factors identified.</p>
          )}
        </div>
        
        <div className="risk-disclaimer">
          <p><strong>Note:</strong> This risk assessment is based solely on observed transaction patterns 
          and should not be considered as financial advice or a definitive security assessment.</p>
        </div>
      </div>
    );
  };
  
  // Helper function to get wallet type descriptions
  const getWalletTypeDescription = (type) => {
    const descriptions = {
      'General User': 'This address shows typical blockchain usage patterns without specific specialization.',
      'Trader': 'This address shows patterns consistent with trading activity, including frequent transactions and potentially larger volumes.',
      'Market Maker': 'This address exhibits characteristics of a market maker, with both frequent trading and wide distribution patterns.',
      'Long-term Investor': 'This address appears to accumulate assets over time with limited outgoing transactions, suggesting a buy-and-hold strategy.',
      'Distributor': 'This address primarily sends funds to multiple different addresses, which may indicate payment distribution or fund allocation activities.',
      'Collector': 'This address primarily receives funds from multiple sources, which could indicate collection activities like revenue gathering.',
      'Payment Processor': 'This address shows regular, scheduled distributions to multiple recipients, similar to payment processing patterns.',
      'Salary/Regular Payment Account': 'This address exhibits regular transfers of consistent amounts, typical of salary payments or subscription services.',
      'Unknown': 'There is insufficient transaction history to determine a clear behavioral pattern for this address.'
    };
    
    return descriptions[type] || 'This address shows mixed or unusual transaction patterns.';
  };
  
  return (
    <div className="pattern-analysis-container">
      <h3>Transaction Pattern Analysis</h3>
      
      {isLoading ? (
        <div className="loading-patterns">
          <p>Analyzing transaction patterns...</p>
        </div>
      ) : (
        <>
          <div className="analysis-tabs">
            <button 
              className={`tab-button ${activeTab === 'patterns' ? 'active' : ''}`}
              onClick={() => setActiveTab('patterns')}
            >
              Patterns
            </button>
            <button 
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Wallet Profile
            </button>
            <button 
              className={`tab-button ${activeTab === 'risk' ? 'active' : ''}`}
              onClick={() => setActiveTab('risk')}
            >
              Risk Assessment
            </button>
          </div>
          
          <div className="analysis-content">
            {activeTab === 'patterns' && renderPatternsList()}
            {activeTab === 'profile' && renderWalletProfile()}
            {activeTab === 'risk' && renderRiskAnalysis()}
          </div>
        </>
      )}
      
      <div className="analysis-footer">
        <p>Pattern analysis examines transaction history to identify common behaviors and characteristics.</p>
      </div>
    </div>
  );
};

export default PatternAnalysis;
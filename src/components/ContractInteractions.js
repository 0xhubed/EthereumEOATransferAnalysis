import React, { useState, useEffect } from 'react';
import { getContractInteractions, getContractDetails } from '../services/contractInteractionService.js';
import './ContractInteractions.css';
import { initializeAlchemy } from '../services/alchemyService.js';

const ContractInteractions = ({ searchAddress }) => {
  const [contractData, setContractData] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractDetails, setContractDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchContractData = async () => {
      if (!searchAddress) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Initialize Alchemy if needed
        let alchemy = null;
        try {
          alchemy = initializeAlchemy();
        } catch (err) {
          throw new Error('Failed to initialize Alchemy SDK. Please check your API key.');
        }
        
        // Fetch contract interactions
        const result = await getContractInteractions(alchemy, searchAddress);
        setContractData(result);
        
        // Reset selected contract
        setSelectedContract(null);
        setContractDetails(null);
      } catch (err) {
        console.error('Error fetching contract data:', err);
        setError(err.message || 'Failed to fetch contract interaction data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContractData();
  }, [searchAddress]);
  
  const handleContractSelect = async (contractAddress) => {
    setSelectedContract(contractAddress);
    
    try {
      // Initialize Alchemy if needed
      const alchemy = initializeAlchemy();
      
      // Get details for the selected contract
      const details = await getContractDetails(alchemy, contractAddress);
      setContractDetails(details);
    } catch (err) {
      console.error('Error fetching contract details:', err);
      setError('Failed to fetch contract details');
    }
  };
  
  const renderCategoryDistribution = () => {
    if (!contractData || !contractData.analysis || !contractData.analysis.categories) {
      return null;
    }
    
    const { categories } = contractData.analysis;
    const categoryKeys = Object.keys(categories);
    
    if (categoryKeys.length === 0) {
      return <p>No categories detected.</p>;
    }
    
    const total = categoryKeys.reduce((sum, key) => sum + categories[key], 0);
    
    return (
      <div className="category-distribution">
        <h4>Interaction Types</h4>
        <div className="category-bars">
          {categoryKeys.map(category => {
            const percentage = Math.round((categories[category] / total) * 100);
            return (
              <div key={category} className="category-bar-item">
                <div className="category-label">
                  <span>{category}</span>
                  <span>{categories[category]} ({percentage}%)</span>
                </div>
                <div className="category-bar-container">
                  <div 
                    className="category-bar-fill"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderContractList = () => {
    if (!contractData || !contractData.analysis || !contractData.analysis.contractsSummary) {
      return <p>No contract interactions found.</p>;
    }
    
    const { contractsSummary } = contractData.analysis;
    
    if (contractsSummary.length === 0) {
      return <p>No contract interactions found.</p>;
    }
    
    return (
      <div className="contract-list">
        <h4>Contracts Interaction Summary ({contractsSummary.length})</h4>
        <div className="contract-list-table">
          <div className="contract-list-header">
            <div className="contract-name">Contract Name</div>
            <div className="contract-interactions">Interactions</div>
            <div className="contract-value">Value</div>
            <div className="contract-last-interaction">Last Interaction</div>
          </div>
          
          {contractsSummary.map((contract, index) => (
            <div 
              key={index} 
              className={`contract-list-item ${selectedContract === contract.address ? 'selected' : ''}`}
              onClick={() => handleContractSelect(contract.address)}
            >
              <div className="contract-name" title={contract.address}>
                {contract.name || 'Unknown Contract'}
                <div className="contract-address">{contract.address.slice(0, 6)}...{contract.address.slice(-4)}</div>
              </div>
              <div className="contract-interactions">{contract.interactionCount}</div>
              <div className="contract-value">
                {(contract.totalValueSent > 0 || contract.totalValueReceived > 0) && (
                  <>
                    {contract.totalValueSent > 0 && (
                      <div className="sent-value">Sent: {contract.totalValueSent.toFixed(4)} ETH</div>
                    )}
                    {contract.totalValueReceived > 0 && (
                      <div className="received-value">Received: {contract.totalValueReceived.toFixed(4)} ETH</div>
                    )}
                  </>
                )}
                {contract.totalValueSent === 0 && contract.totalValueReceived === 0 && (
                  <div className="zero-value">0 ETH</div>
                )}
              </div>
              <div className="contract-last-interaction">
                {contract.lastInteraction ? 
                  new Date(contract.lastInteraction).toLocaleDateString() :
                  'Unknown'
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderContractDetails = () => {
    if (!selectedContract || !contractDetails) {
      return null;
    }
    
    return (
      <div className="contract-detail-view">
        <h4>Contract Details</h4>
        <div className="contract-detail-card">
          <div className="contract-detail-header">
            <h5>{contractDetails.name || 'Unknown Contract'}</h5>
            <div className="contract-badges">
              {contractDetails.isContract && (
                <span className="badge is-contract">Contract</span>
              )}
              {contractDetails.isVerified && (
                <span className="badge is-verified">Verified</span>
              )}
              {contractDetails.symbol && (
                <span className="badge token-symbol">{contractDetails.symbol}</span>
              )}
            </div>
          </div>
          
          <div className="contract-detail-address">
            <span className="label">Address:</span>
            <span className="value">{selectedContract}</span>
          </div>
          
          {contractDetails.decimals !== undefined && (
            <div className="contract-detail-item">
              <span className="label">Decimals:</span>
              <span className="value">{contractDetails.decimals}</span>
            </div>
          )}
          
          {contractDetails.bytecodeLength && (
            <div className="contract-detail-item">
              <span className="label">Bytecode Size:</span>
              <span className="value">{(contractDetails.bytecodeLength / 2 - 1).toLocaleString()} bytes</span>
            </div>
          )}
          
          <div className="contract-actions">
            <a 
              href={`https://etherscan.io/address/${selectedContract}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="etherscan-link"
            >
              View on Etherscan
            </a>
          </div>
        </div>
      </div>
    );
  };
  
  const renderFrequencyStats = () => {
    if (!contractData || !contractData.analysis || !contractData.analysis.interactionFrequency) {
      return null;
    }
    
    const { interactionFrequency } = contractData.analysis;
    
    return (
      <div className="frequency-stats">
        <h4>Interaction Frequency</h4>
        <div className="frequency-metrics">
          <div className="frequency-metric">
            <div className="frequency-value">{interactionFrequency.daily}</div>
            <div className="frequency-label">Daily</div>
          </div>
          <div className="frequency-metric">
            <div className="frequency-value">{interactionFrequency.weekly}</div>
            <div className="frequency-label">Weekly</div>
          </div>
          <div className="frequency-metric">
            <div className="frequency-value">{interactionFrequency.monthly}</div>
            <div className="frequency-label">Monthly</div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderTrendingContracts = () => {
    if (!contractData || !contractData.analysis || !contractData.analysis.recentTrends) {
      return null;
    }
    
    const { recentTrends } = contractData.analysis;
    
    if (recentTrends.length === 0) {
      return null;
    }
    
    return (
      <div className="trending-contracts">
        <h4>Recent Trends</h4>
        <div className="trends-list">
          {recentTrends.map((trend, index) => (
            <div key={index} className="trend-item">
              <div className="trend-contract" onClick={() => handleContractSelect(trend.contract)}>
                <span className="trend-name">{trend.name || 'Unknown Contract'}</span>
                <span className="trend-address">
                  {trend.contract.slice(0, 6)}...{trend.contract.slice(-4)}
                </span>
              </div>
              <div className="trend-details">
                <span className="trend-type">{trend.trend}</span>
                <span className="trend-stats">
                  {trend.recentInteractions} recent / {trend.totalInteractions} total
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="contract-interactions-container">
      <h3>Smart Contract Interaction Analysis</h3>
      
      {isLoading ? (
        <div className="loading-container">
          <p>Analyzing contract interactions...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
      ) : !contractData ? (
        <div className="no-data-container">
          <p>No contract interaction data available for this address.</p>
        </div>
      ) : (
        <div className="contract-analysis-content">
          <div className="contract-analysis-overview">
            <div className="overview-stats">
              <div className="stat-card total-interactions">
                <div className="stat-value">{contractData.analysis.totalInteractions}</div>
                <div className="stat-label">Total Interactions</div>
              </div>
              <div className="stat-card unique-contracts">
                <div className="stat-value">{contractData.analysis.uniqueContracts}</div>
                <div className="stat-label">Unique Contracts</div>
              </div>
            </div>
            
            {renderFrequencyStats()}
            {renderCategoryDistribution()}
            {renderTrendingContracts()}
          </div>
          
          <div className="contract-detail-section">
            {renderContractList()}
            {renderContractDetails()}
          </div>
        </div>
      )}
      
      <div className="analysis-footer">
        <p>Contract interaction analysis examines how this address interacts with smart contracts on the blockchain.</p>
      </div>
    </div>
  );
};

export default ContractInteractions;
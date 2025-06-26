import React, { useState, useEffect } from 'react';
import { getGasDetails, analyzeGasUsage, getGasOptimizationTips } from '../services/gasAnalysisService';
import { initializeAlchemy } from '../services/alchemyService';
import './GasUsageAnalysis.css';

const GasUsageAnalysis = ({ transactions, searchAddress }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gasData, setGasData] = useState([]);
  const [gasAnalysis, setGasAnalysis] = useState(null);
  const [optimizationTips, setOptimizationTips] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const analyzeGasUsageData = async () => {
      if (!transactions || !searchAddress) {
        return;
      }
      
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
        
        // Extract transaction list from the transactions object
        let transactionList = [];
        if (transactions.sent && transactions.received) {
          transactionList = [...transactions.sent, ...transactions.received];
        } else if (Array.isArray(transactions)) {
          transactionList = transactions;
        }
        
        // Limit to most recent 50 transactions to avoid API rate limits
        const recentTransactions = transactionList
          .sort((a, b) => {
            const aTime = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp) : new Date(0);
            const bTime = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp) : new Date(0);
            return bTime - aTime;
          })
          .slice(0, 50);
        
        // Get detailed gas information
        const gasDetails = await getGasDetails(alchemy, recentTransactions);
        setGasData(gasDetails);
        
        // Analyze gas usage patterns
        const analysis = analyzeGasUsage(gasDetails);
        setGasAnalysis(analysis);
        
        // Get optimization recommendations
        const tips = getGasOptimizationTips(analysis);
        setOptimizationTips(tips);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error analyzing gas usage:', err);
        setError(err.message || 'Failed to analyze gas usage data');
        setIsLoading(false);
      }
    };
    
    analyzeGasUsageData();
  }, [transactions, searchAddress]);
  
  const formatGas = (gas) => {
    return gas ? gas.toLocaleString() : '0';
  };
  
  const formatEth = (eth) => {
    if (!eth) return '0 ETH';
    return `${eth.toFixed(6)} ETH`;
  };
  
  const formatGwei = (wei) => {
    if (!wei) return '0 Gwei';
    const gwei = wei / 1e9;
    return `${gwei.toFixed(2)} Gwei`;
  };
  
  const renderGasDistributionChart = () => {
    if (!gasAnalysis || !gasAnalysis.gasDistribution) {
      return <p>No gas distribution data available.</p>;
    }
    
    const { gasDistribution } = gasAnalysis;
    const total = gasAnalysis.totalTransactions;
    
    const categories = [
      { name: 'Very Low', count: gasDistribution.veryLow, color: '#4caf50' },
      { name: 'Low', count: gasDistribution.low, color: '#8bc34a' },
      { name: 'Medium', count: gasDistribution.medium, color: '#ffc107' },
      { name: 'High', count: gasDistribution.high, color: '#ff9800' },
      { name: 'Very High', count: gasDistribution.veryHigh, color: '#f44336' }
    ];
    
    return (
      <div className="gas-distribution-chart">
        <h4>Gas Usage Distribution</h4>
        
        <div className="distribution-bars">
          {categories.map((category, index) => {
            const percentage = total > 0 ? (category.count / total) * 100 : 0;
            
            return (
              <div key={index} className="distribution-category">
                <div className="distribution-label">
                  <span>{category.name}</span>
                  <span>{category.count} tx ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="distribution-bar-container">
                  <div 
                    className="distribution-bar" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  const renderTimeSeries = () => {
    if (!gasAnalysis || !gasAnalysis.timeSeries || gasAnalysis.timeSeries.length === 0) {
      return <p>No time series data available.</p>;
    }
    
    return (
      <div className="time-series-chart">
        <h4>Gas Price Over Time</h4>
        <div className="time-series-container">
          <div className="time-series-y-axis">
            <span>Gas Price (Gwei)</span>
          </div>
          <div className="time-series-plot">
            {gasAnalysis.timeSeries.map((point, index) => {
              const heightPercentage = Math.min(100, (point.gasPrice / 500) * 100);
              
              return (
                <div key={index} className="time-point">
                  <div 
                    className="time-bar"
                    style={{ height: `${heightPercentage}%` }}
                    title={`${new Date(point.timestamp).toLocaleString()}: ${point.gasPrice.toFixed(2)} Gwei`}
                  ></div>
                  <div className="time-label">
                    {new Date(point.timestamp).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  const renderGasEfficiencyGauge = () => {
    if (!gasAnalysis) {
      return null;
    }
    
    const efficiency = gasAnalysis.gasEfficiency || 0;
    const rotation = (efficiency / 100) * 180 - 90; // -90 to 90 degrees
    
    let gaugeClass = 'low';
    if (efficiency >= 70) {
      gaugeClass = 'high';
    } else if (efficiency >= 40) {
      gaugeClass = 'medium';
    }
    
    return (
      <div className="gas-efficiency-gauge">
        <h4>Gas Efficiency</h4>
        <div className={`gauge ${gaugeClass}`}>
          <div className="gauge-body">
            <div 
              className="gauge-fill"
              style={{
                transform: `rotate(${rotation}deg)`
              }}
            ></div>
            <div className="gauge-cover">
              <span>{efficiency.toFixed(1)}%</span>
              <span className="gauge-label">efficiency</span>
            </div>
          </div>
          <div className="gauge-ticks">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        <p className="gauge-description">
          {efficiency < 40 
            ? "Low efficiency indicates you're wasting potential gas with high limits."
            : efficiency < 70
              ? "Medium efficiency suggests reasonable gas limit usage with room for optimization."
              : "Good efficiency! Your gas limits are well calibrated to actual usage."
          }
        </p>
      </div>
    );
  };
  
  const renderOptimizationTips = () => {
    if (!optimizationTips || !optimizationTips.tips || optimizationTips.tips.length === 0) {
      return <p>No optimization tips available.</p>;
    }
    
    return (
      <div className="optimization-tips">
        <h4>Gas Optimization Recommendations</h4>
        
        {optimizationTips.hasPotentialSavings && (
          <div className="potential-savings">
            <div className="savings-icon">💰</div>
            <div className="savings-details">
              <p>Potential savings identified</p>
              <p className="savings-value">
                {gasAnalysis.wastageAnalysis.potentialSavings.toFixed(4)} ETH
              </p>
            </div>
          </div>
        )}
        
        <div className="tips-list">
          {optimizationTips.tips.map((tip, index) => (
            <div key={index} className="optimization-tip">
              <div className="tip-header">
                <h5>{tip.title}</h5>
                {tip.savingsPotential && (
                  <span className={`savings-potential ${tip.savingsPotential.toLowerCase()}`}>
                    {tip.savingsPotential} savings
                  </span>
                )}
              </div>
              <p className="tip-description">{tip.description}</p>
              {tip.implementation && (
                <div className="tip-implementation">
                  <strong>How to implement:</strong> {tip.implementation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderTransactionsTable = () => {
    if (!gasData || gasData.length === 0) {
      return <p>No transaction data available.</p>;
    }
    
    // Sort transactions by gas used (descending)
    const sortedTransactions = [...gasData].sort((a, b) => b.gasUsed - a.gasUsed);
    
    return (
      <div className="gas-transactions-table">
        <h4>Transaction Gas Usage</h4>
        <div className="transactions-table-container">
          <table>
            <thead>
              <tr>
                <th>Transaction Hash</th>
                <th>Gas Used</th>
                <th>Gas Price</th>
                <th>Gas Fee</th>
                <th>Efficiency</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((tx, index) => {
                const efficiency = tx.gasLimit ? ((tx.gasUsed / tx.gasLimit) * 100).toFixed(1) + '%' : 'N/A';
                const efficiencyClass = tx.gasLimit 
                  ? tx.gasUsed / tx.gasLimit > 0.7 
                    ? 'high-efficiency'
                    : tx.gasUsed / tx.gasLimit > 0.4
                      ? 'medium-efficiency'
                      : 'low-efficiency'
                  : '';
                
                return (
                  <tr key={index}>
                    <td>
                      <a 
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-hash"
                      >
                        {tx.hash.substring(0, 6)}...{tx.hash.substring(tx.hash.length - 4)}
                      </a>
                    </td>
                    <td>{formatGas(tx.gasUsed)}</td>
                    <td>{formatGwei(tx.effectiveGasPrice)}</td>
                    <td>{formatEth(tx.gasFee)}</td>
                    <td className={efficiencyClass}>{efficiency}</td>
                    <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const renderOverviewTab = () => {
    if (!gasAnalysis) {
      return (
        <div className="no-data-message">
          <p>No gas analysis data available.</p>
        </div>
      );
    }
    
    return (
      <div className="gas-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-title">Total Gas Used</div>
            <div className="stat-value primary">{formatGas(gasAnalysis.totalGasUsed)}</div>
            <div className="stat-description">Across {gasAnalysis.totalTransactions} transactions</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">Total Gas Cost</div>
            <div className="stat-value secondary">{formatEth(gasAnalysis.totalGasFee)}</div>
            <div className="stat-description">At average price of {gasAnalysis.averageGasPrice.toFixed(2)} Gwei</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">Average Per Transaction</div>
            <div className="stat-value tertiary">{formatGas(gasAnalysis.averageGasPerTransaction)}</div>
            <div className="stat-description">Median: {formatGas(gasAnalysis.medianGasPerTransaction)}</div>
          </div>
        </div>
        
        <div className="overview-charts">
          <div className="chart-container">
            {renderGasDistributionChart()}
          </div>
          
          <div className="chart-container">
            {renderGasEfficiencyGauge()}
          </div>
        </div>
      </div>
    );
  };
  
  const renderTipsTab = () => {
    return (
      <div className="optimization-tab">
        {renderOptimizationTips()}
      </div>
    );
  };
  
  const renderTransactionsTab = () => {
    return (
      <div className="transactions-tab">
        {renderTransactionsTable()}
      </div>
    );
  };
  
  const renderTrendsTab = () => {
    return (
      <div className="trends-tab">
        {renderTimeSeries()}
        
        <div className="gas-trend-insights">
          <h4>Gas Usage Insights</h4>
          
          {gasAnalysis && gasAnalysis.timeSeries && gasAnalysis.timeSeries.length > 0 ? (
            <div className="insights-container">
              <div className="insight-card">
                <div className="insight-title">Peak Gas Price</div>
                <div className="insight-value">
                  {formatGwei(Math.max(...gasAnalysis.timeSeries.map(point => point.gasPrice * 1e9)))}
                </div>
                <div className="insight-description">
                  {gasAnalysis.timeSeries
                    .sort((a, b) => b.gasPrice - a.gasPrice)[0].timestamp &&
                    `On ${new Date(gasAnalysis.timeSeries
                      .sort((a, b) => b.gasPrice - a.gasPrice)[0].timestamp).toLocaleDateString()}`
                  }
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-title">Lowest Gas Price</div>
                <div className="insight-value">
                  {formatGwei(Math.min(...gasAnalysis.timeSeries.map(point => point.gasPrice * 1e9)))}
                </div>
                <div className="insight-description">
                  {gasAnalysis.timeSeries
                    .sort((a, b) => a.gasPrice - b.gasPrice)[0].timestamp &&
                    `On ${new Date(gasAnalysis.timeSeries
                      .sort((a, b) => a.gasPrice - b.gasPrice)[0].timestamp).toLocaleDateString()}`
                  }
                </div>
              </div>
              
              <div className="insight-card">
                <div className="insight-title">Price Volatility</div>
                <div className="insight-value">
                  {(() => {
                    const prices = gasAnalysis.timeSeries.map(point => point.gasPrice);
                    const max = Math.max(...prices);
                    const min = Math.min(...prices);
                    return `${((max - min) / min * 100).toFixed(0)}%`;
                  })()}
                </div>
                <div className="insight-description">
                  Difference between highest and lowest prices
                </div>
              </div>
            </div>
          ) : (
            <p>Not enough data to generate insights.</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="gas-analysis-container">
      <h3>Gas Usage Analysis</h3>
      
      {isLoading ? (
        <div className="loading-container">
          <p>Analyzing gas usage patterns...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
      ) : (
        <>
          <div className="gas-analysis-tabs">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              Price Trends
            </button>
            <button 
              className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </button>
            <button 
              className={`tab-button ${activeTab === 'tips' ? 'active' : ''}`}
              onClick={() => setActiveTab('tips')}
            >
              Optimization Tips
            </button>
          </div>
          
          <div className="gas-analysis-content">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'trends' && renderTrendsTab()}
            {activeTab === 'transactions' && renderTransactionsTab()}
            {activeTab === 'tips' && renderTipsTab()}
          </div>
        </>
      )}
      
      <div className="analysis-footer">
        <p>Gas analysis examines transaction gas usage patterns to identify potential optimizations and cost savings.</p>
      </div>
    </div>
  );
};

export default GasUsageAnalysis;
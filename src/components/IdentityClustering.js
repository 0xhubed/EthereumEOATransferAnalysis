import React, { useState, useEffect } from 'react';
import { identifyRelatedAddresses, assessClusterRisk } from '../services/identityClusteringService';
import './IdentityClustering.css';

const IdentityClustering = ({ transferPartners, transactions, searchAddress }) => {
  const [clusterResults, setClusterResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterRisk, setClusterRisk] = useState(null);
  
  useEffect(() => {
    // Run identity clustering analysis when the component mounts or data changes
    if (transferPartners && transferPartners.length > 0 && transactions) {
      setIsLoading(true);
      
      // Perform the clustering analysis
      const results = identifyRelatedAddresses(transferPartners, transactions);
      setClusterResults(results);
      
      // If there are clusters, select the first one by default
      if (results.clusters && results.clusters.length > 0) {
        setSelectedCluster(results.clusters[0]);
        
        // Calculate risk assessment for the selected cluster
        const risk = assessClusterRisk(results.clusters[0], transferPartners);
        setClusterRisk(risk);
      }
      
      setIsLoading(false);
    }
  }, [transferPartners, transactions, searchAddress]);
  
  const handleClusterSelect = (cluster) => {
    setSelectedCluster(cluster);
    
    // Calculate risk assessment for the selected cluster
    const risk = assessClusterRisk(cluster, transferPartners);
    setClusterRisk(risk);
  };
  
  const renderClusterList = () => {
    if (!clusterResults || !clusterResults.clusters || clusterResults.clusters.length === 0) {
      return (
        <div className="no-clusters">
          <p>No identity clusters detected.</p>
          <p>This could be due to limited transaction history or lack of patterns suggesting shared ownership.</p>
        </div>
      );
    }
    
    return (
      <div className="clusters-list">
        {clusterResults.clusters.map((cluster, index) => (
          <div 
            key={index} 
            className={`cluster-item ${selectedCluster && selectedCluster.id === cluster.id ? 'selected' : ''}`}
            onClick={() => handleClusterSelect(cluster)}
          >
            <div className="cluster-header">
              <h4>{cluster.name}</h4>
              <span className="cluster-confidence">
                {cluster.confidence}% confidence
              </span>
            </div>
            <div className="cluster-summary">
              <span className="address-count">{cluster.addresses.length} addresses</span>
              <span className="cluster-type">{formatClusterType(cluster.type)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const formatClusterType = (type) => {
    if (!type) return 'Unknown';
    
    switch (type) {
      case 'temporal':
        return 'Temporal Pattern';
      case 'co-spending':
        return 'Co-spending Pattern';
      case 'behavioral':
        return 'Behavioral Similarity';
      case 'heuristic':
        return 'Heuristic Matching';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };
  
  const renderClusterDetails = () => {
    if (!selectedCluster) {
      return (
        <div className="no-cluster-selected">
          <p>Select a cluster to view details.</p>
        </div>
      );
    }
    
    return (
      <div className="cluster-details">
        <h3>{selectedCluster.name}</h3>
        
        <div className="cluster-meta">
          <div className="meta-item">
            <span className="meta-label">Type:</span>
            <span className="meta-value">{formatClusterType(selectedCluster.type)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Confidence:</span>
            <span className={`meta-value confidence-${getConfidenceLevel(selectedCluster.confidence)}`}>
              {selectedCluster.confidence}%
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Addresses:</span>
            <span className="meta-value">{selectedCluster.addresses.length}</span>
          </div>
        </div>
        
        <div className="cluster-reasons">
          <h4>Clustering Evidence:</h4>
          <ul>
            {selectedCluster.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
        
        {clusterRisk && (
          <div className="cluster-risk">
            <h4>Risk Assessment:</h4>
            <div className={`risk-level ${clusterRisk.level.toLowerCase()}`}>
              {clusterRisk.level} Risk ({clusterRisk.score}/100)
            </div>
            
            {clusterRisk.factors.length > 0 && (
              <div className="risk-factors">
                <h5>Risk Factors:</h5>
                <ul>
                  {clusterRisk.factors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="cluster-addresses">
          <h4>Addresses in this Cluster:</h4>
          <div className="addresses-list">
            {selectedCluster.addresses.map((addrObj, index) => {
              // Find the partner data for this address to get transaction info
              const partner = transferPartners.find(p => p.address === addrObj.address);
              
              return (
                <div key={index} className="address-item">
                  <div className="address-header">
                    <div className="address-text">{addrObj.address}</div>
                    <div className="address-confidence">{addrObj.confidence}%</div>
                  </div>
                  {partner && (
                    <div className="address-stats">
                      <div className="stat-item">
                        <span className="stat-label">Transactions:</span>
                        <span className="stat-value">{partner.transactions.length}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Sent:</span>
                        <span className="stat-value">{partner.totalSent.toFixed(4)} ETH</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Received:</span>
                        <span className="stat-value">{partner.totalReceived.toFixed(4)} ETH</span>
                      </div>
                      {partner.anomalies?.hasAnomalies && (
                        <div className="address-anomaly">
                          <span className="anomaly-icon">⚠️</span>
                          <span className="anomaly-text">
                            {formatAnomalyText(partner.anomalies)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
  
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };
  
  const formatAnomalyText = (anomalies) => {
    if (!anomalies) return 'Unknown anomalies';
    
    const anomalyTypes = [];
    if (anomalies.largeTransfers && anomalies.largeTransfers.length > 0) {
      anomalyTypes.push('Large transfers');
    }
    if (anomalies.unusualFrequency) {
      anomalyTypes.push('Unusual timing');
    }
    if (anomalies.irregularPattern) {
      anomalyTypes.push('Irregular pattern');
    }
    
    return anomalyTypes.join(', ');
  };
  
  return (
    <div className="identity-clustering-container">
      <h3>Identity Clustering Analysis</h3>
      
      {isLoading ? (
        <div className="loading-clusters">
          <p>Analyzing address relationships...</p>
        </div>
      ) : (
        <div className="clusters-container">
          <div className="clusters-sidebar">
            <h4>Detected Clusters</h4>
            {renderClusterList()}
          </div>
          
          <div className="cluster-detail-panel">
            {renderClusterDetails()}
          </div>
        </div>
      )}
      
      <div className="clustering-footer">
        <div className="info-box">
          <h4>About Identity Clustering</h4>
          <p>
            Identity clustering identifies groups of addresses that likely belong to the same entity
            based on transaction patterns, behavioral similarities, and advanced heuristics.
          </p>
          <p>
            <strong>Note:</strong> This analysis is probabilistic and based solely on on-chain 
            transaction data. Confidence scores reflect the strength of the clustering evidence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdentityClustering;
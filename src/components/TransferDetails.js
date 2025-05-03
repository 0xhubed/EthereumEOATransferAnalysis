import React, { useState, useEffect } from 'react';
import './TransferDetails.css';
import { saveAddressAnnotation } from '../services/alchemyService';

const TransferDetails = ({ partner, onClose }) => {
  const [annotation, setAnnotation] = useState(partner.annotation || '');
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Update local annotation state when partner changes
  useEffect(() => {
    setAnnotation(partner.annotation || '');
  }, [partner]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleString();
  };

  const formatEther = (value, asset = 'ETH') => {
    if (asset === 'ETH') {
      return parseFloat(value).toFixed(6) + ' ETH';
    }
    return parseFloat(value).toFixed(6) + ' ' + asset;
  };

  const handleSaveAnnotation = () => {
    setIsSaving(true);
    
    try {
      // Save annotation to localStorage
      const success = saveAddressAnnotation(partner.address, annotation);
      
      if (success) {
        partner.annotation = annotation; // Update in memory
        setSavedMessage('Annotation saved successfully');
        setTimeout(() => {
          setSavedMessage('');
          setShowAnnotationForm(false);
        }, 2000);
      } else {
        setSavedMessage('Failed to save annotation');
      }
    } catch (error) {
      console.error("Error saving annotation:", error);
      setSavedMessage('Error saving: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderTimeAnalysis = () => {
    if (partner.transactions.length < 2) return null;
    
    // Sort transactions by timestamp
    const sortedTxs = [...partner.transactions].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
    
    // Get first and last transaction dates
    const firstTx = sortedTxs[0];
    const lastTx = sortedTxs[sortedTxs.length - 1];
    
    const firstDate = firstTx.timestamp ? new Date(firstTx.timestamp) : null;
    const lastDate = lastTx.timestamp ? new Date(lastTx.timestamp) : null;
    
    if (!firstDate || !lastDate) return null;
    
    // Calculate duration between first and last transaction
    const durationMs = lastDate.getTime() - firstDate.getTime();
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
    
    return (
      <div className="time-analysis">
        <h3>Time Analysis</h3>
        <div className="time-stats">
          <div className="stat-item">
            <span className="label">First Transaction:</span>
            <span className="value">{formatTimestamp(firstTx.timestamp)}</span>
          </div>
          <div className="stat-item">
            <span className="label">Last Transaction:</span>
            <span className="value">{formatTimestamp(lastTx.timestamp)}</span>
          </div>
          <div className="stat-item">
            <span className="label">Duration:</span>
            <span className="value">{durationDays} days</span>
          </div>
          <div className="stat-item">
            <span className="label">Transaction Count:</span>
            <span className="value">{partner.transactions.length}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="transfer-details-modal">
      <div className="transfer-details-content">
        <div className="transfer-details-header">
          <h2>Transaction History</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="partner-info">
          <h3>Partner Address</h3>
          <p className="address">{partner.address}</p>
          
          {/* Annotation Section */}
          <div className="annotation-section mb-4">
            {!showAnnotationForm ? (
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Annotation</h4>
                  <p className="annotation-text">
                    {annotation ? annotation : <span className="text-gray-400">No annotation</span>}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAnnotationForm(true)} 
                  className="edit-button"
                >
                  {annotation ? 'Edit' : 'Add Annotation'}
                </button>
              </div>
            ) : (
              <div className="annotation-form">
                <h4 className="text-sm font-medium text-gray-500">Edit Annotation</h4>
                <textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Add a note about this address..."
                  className="annotation-input"
                  rows="3"
                />
                <div className="annotation-form-buttons">
                  {savedMessage && <span className="saved-message">{savedMessage}</span>}
                  <button 
                    onClick={() => setShowAnnotationForm(false)} 
                    className="cancel-button"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveAnnotation} 
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="summary">
            <div className="summary-item">
              <span>Total Sent:</span>
              <span className="sent">{formatEther(partner.totalSent)}</span>
            </div>
            <div className="summary-item">
              <span>Total Received:</span>
              <span className="received">{formatEther(partner.totalReceived)}</span>
            </div>
            
            {/* Anomaly Information */}
            {partner.anomalies && partner.anomalies.hasAnomalies && (
              <div className="anomaly-summary">
                <h4>Anomalies Detected</h4>
                <div className="anomaly-details">
                  {partner.anomalies.largeTransfers && partner.anomalies.largeTransfers.length > 0 && (
                    <div className="anomaly-item">
                      <span className="anomaly-icon">⚠️</span>
                      <span>Large Transfers: {partner.anomalies.largeTransfers.length} transaction(s) with unusually high value</span>
                    </div>
                  )}
                  
                  {partner.anomalies.unusualFrequency && (
                    <div className="anomaly-item">
                      <span className="anomaly-icon">⚠️</span>
                      <span>Unusual Transaction Timing: Irregular time intervals between transactions</span>
                    </div>
                  )}
                  
                  {partner.anomalies.irregularPattern && (
                    <div className="anomaly-item">
                      <span className="anomaly-icon">⚠️</span>
                      <span>Irregular Pattern: Unusual transaction pattern detected</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Time-based Analysis */}
        {renderTimeAnalysis()}

        <div className="transactions">
          <h3>Transactions</h3>
          {partner.transactions.length === 0 ? (
            <p>No transaction history available.</p>
          ) : (
            <div className="transaction-list">
              {partner.transactions
                .sort((a, b) => {
                  // Sort by timestamp, newest first
                  const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                  const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                  return bTime - aTime;
                })
                .map((tx, index) => {
                  // Check if this transaction is marked as an anomaly due to large value
                  const isLargeTransfer = partner.anomalies?.largeTransfers?.some(
                    anomaly => anomaly.txHash === tx.hash
                  );
                  
                  return (
                    <div 
                      key={index} 
                      className={`transaction-item ${isLargeTransfer ? 'anomaly' : ''}`}
                    >
                      <div className="transaction-header">
                        <span className={`direction ${tx.direction}`}>
                          {tx.direction === 'sent' ? 'Sent' : 'Received'}
                        </span>
                        <span className="timestamp">
                          {formatTimestamp(tx.timestamp)}
                          {isLargeTransfer && (
                            <span className="anomaly-badge" title="Unusually large transaction amount">
                              ⚠️ Anomaly
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="transaction-details">
                        <div className="detail-item">
                          <span className="label">Hash:</span>
                          <a 
                            href={`https://etherscan.io/tx/${tx.hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hash"
                          >
                            {tx.hash}
                          </a>
                        </div>
                        <div className="detail-item">
                          <span className="label">Value:</span>
                          <span className={`value ${isLargeTransfer ? 'anomaly-value' : ''}`}>
                            {formatEther(tx.value, tx.asset)}
                            {isLargeTransfer && (
                              <span className="anomaly-detail">
                                {partner.anomalies?.largeTransfers?.find(a => a.txHash === tx.hash)?.ratio.toFixed(1)} standard deviations above average
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Block:</span>
                          <span className="block">{tx.blockNum}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferDetails;
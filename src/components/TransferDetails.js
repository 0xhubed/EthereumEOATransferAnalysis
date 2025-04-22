import React from 'react';
import './TransferDetails.css';

const TransferDetails = ({ partner, onClose }) => {
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
          <div className="summary">
            <div className="summary-item">
              <span>Total Sent:</span>
              <span className="sent">{formatEther(partner.totalSent)}</span>
            </div>
            <div className="summary-item">
              <span>Total Received:</span>
              <span className="received">{formatEther(partner.totalReceived)}</span>
            </div>
          </div>
        </div>

        <div className="transactions">
          <h3>Transactions</h3>
          {partner.transactions.length === 0 ? (
            <p>No transaction history available.</p>
          ) : (
            <div className="transaction-list">
              {partner.transactions.map((tx, index) => (
                <div key={index} className="transaction-item">
                  <div className="transaction-header">
                    <span className={`direction ${tx.direction}`}>
                      {tx.direction === 'sent' ? 'Sent' : 'Received'}
                    </span>
                    <span className="timestamp">{formatTimestamp(tx.timestamp)}</span>
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
                      <span className="value">{formatEther(tx.value, tx.asset)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Block:</span>
                      <span className="block">{tx.blockNum}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferDetails;
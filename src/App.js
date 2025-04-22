import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeAlchemy, getAddressTransactions, processTransferPartners } from './services/alchemyService';
import TransferDetails from './components/TransferDetails';
import TransferGraph from './components/TransferGraph';

function App() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Alchemy settings
  const [isAlchemyInitialized, setIsAlchemyInitialized] = useState(false);
  
  // Transfer data
  const [searchAddress, setSearchAddress] = useState('');
  const [transferPartners, setTransferPartners] = useState([]);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  
  // Selected partner for details view
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'totalValue',
    direction: 'descending'
  });

  useEffect(() => {
    // Auto-initialize Alchemy if API key exists in environment
    if (process.env.REACT_APP_ALCHEMY_API_KEY) {
      initializeAlchemy();
      setIsAlchemyInitialized(true);
    }
  }, []);
  
  // Removed Alchemy manual initialization as we're using the environment variable
  
  const handleAddressChange = (e) => {
    setSearchAddress(e.target.value);
  };
  
  const validateAddress = (address) => {
    // Simple Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  const fetchTransferHistory = async () => {
    if (!isAlchemyInitialized) {
      setError('Please initialize Alchemy SDK with your API key first.');
      return;
    }
    
    if (!validateAddress(searchAddress)) {
      setError('Please enter a valid Ethereum address.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch transactions using Alchemy SDK
      const transactions = await getAddressTransactions(searchAddress);
      
      // Process transactions to find unique EOAs and transfer amounts
      const partners = processTransferPartners(transactions);
      
      setTransferPartners(partners);
      setShowTransferHistory(true);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      setError('Failed to fetch transfer history. Please try again.');
      setLoading(false);
    }
  };
  
  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const formatEther = (value, asset = 'ETH') => {
    if (asset === 'ETH') {
      return parseFloat(value).toFixed(4) + ' ETH';
    }
    return parseFloat(value).toFixed(4) + ' ' + asset;
  };
  
  const openTransferDetails = (partner) => {
    setSelectedPartner(partner);
  };
  
  const closeTransferDetails = () => {
    setSelectedPartner(null);
  };
  
  // Sort function for the transfer partners
  const sortedPartners = React.useMemo(() => {
    const sortablePartners = [...transferPartners];
    if (sortConfig.key) {
      sortablePartners.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'address') {
          aValue = a.address;
          bValue = b.address;
        } else if (sortConfig.key === 'totalSent') {
          aValue = a.totalSent;
          bValue = b.totalSent;
        } else if (sortConfig.key === 'totalReceived') {
          aValue = a.totalReceived;
          bValue = b.totalReceived;
        } else if (sortConfig.key === 'totalValue') {
          aValue = a.totalSent + a.totalReceived;
          bValue = b.totalSent + b.totalReceived;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePartners;
  }, [transferPartners, sortConfig]);
  
  // Handle column header click for sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blockchain Transfer History Explorer</h1>
        {error && <p className="error">{error}</p>}
      </header>

      <main className="app-main">
        <div className="card">
          <h2>Transfer History Explorer</h2>
          <p>
            Enter an Ethereum address to see all EOA accounts it has transferred ETH with,
            along with the amounts transferred.
          </p>
          
          {!isAlchemyInitialized && (
            <div className="api-key-section">
              <p className="error">Alchemy API key not found in environment variables. Please check your .env file.</p>
            </div>
          )}
          
          <div className="search-section">
            <h3>Search Address</h3>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Enter Ethereum address (0x...)" 
                value={searchAddress}
                onChange={handleAddressChange}
                className="text-input"
              />
              <button 
                onClick={fetchTransferHistory} 
                className="action-button"
                disabled={!isAlchemyInitialized || loading}
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
          
          {showTransferHistory && (
            <>
              {/* Transfer Graph Visualization */}
              {transferPartners.length > 0 && (
                <TransferGraph 
                  transferPartners={transferPartners} 
                  searchAddress={searchAddress}
                />
              )}
              
              {/* Transfer Partners List */}
              <div className="results-section">
                <h3>Transfer Partners</h3>
                {transferPartners.length === 0 ? (
                  <p>No transfer history found for this address.</p>
                ) : (
                  <div className="transfer-list">
                    <div className="transfer-item header">
                      <div 
                        className={`address sortable ${sortConfig.key === 'address' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('address')}
                      >
                        <span>Address</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalSent' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalSent')}
                      >
                        <span>Sent</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalReceived' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalReceived')}
                      >
                        <span>Received</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div 
                        className={`amount sortable ${sortConfig.key === 'totalValue' ? sortConfig.direction : ''}`}
                        onClick={() => requestSort('totalValue')}
                      >
                        <span>Total Volume</span>
                        <span className="sort-icon"></span>
                      </div>
                      <div className="actions">Actions</div>
                    </div>
                    {sortedPartners.map((partner, index) => (
                      <div 
                        key={index} 
                        className="transfer-item"
                        onClick={() => openTransferDetails(partner)}
                        style={{cursor: 'pointer'}}
                      >
                        <div className="address" title={partner.address}>
                          {formatAddress(partner.address)}
                        </div>
                        <div className="amount sent">
                          {formatEther(partner.totalSent)}
                        </div>
                        <div className="amount received">
                          {formatEther(partner.totalReceived)}
                        </div>
                        <div className="amount total">
                          {formatEther(partner.totalSent + partner.totalReceived)}
                        </div>
                        <div className="actions">
                          <button className="details-button">Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Blockchain Transfer History Explorer &copy; 2025</p>
      </footer>
      
      {selectedPartner && (
        <TransferDetails 
          partner={selectedPartner} 
          onClose={closeTransferDetails} 
        />
      )}
    </div>
  );
}

export default App;
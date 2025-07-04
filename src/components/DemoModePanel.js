import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getDemoStatus, getDemoAddresses, resetDemoUsage } from '../services/demoService';
import './DemoModePanel.css';

const DemoModePanel = ({ onApiKeyChange, onDemoAddressSelect, userApiKey }) => {
  const [demoStatus, setDemoStatus] = useState(getDemoStatus());
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(userApiKey || '');
  const [showExampleAddresses, setShowExampleAddresses] = useState(!userApiKey);

  useEffect(() => {
    // Update demo status when component mounts or demo usage changes
    setDemoStatus(getDemoStatus());
  }, []);

  useEffect(() => {
    // Auto-expand addresses in demo mode, auto-collapse in API mode
    setShowExampleAddresses(!userApiKey);
  }, [userApiKey]);

  const handleApiKeySubmit = () => {
    onApiKeyChange(tempApiKey);
    setShowApiKeyInput(false);
  };

  const handleDemoAddressClick = (address) => {
    if (onDemoAddressSelect) {
      onDemoAddressSelect(address);
    }
  };

  const handleResetDemo = () => {
    resetDemoUsage();
    setDemoStatus(getDemoStatus());
  };

  return (
    <Card className="demo-mode-panel">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{userApiKey ? '🔑 API Configuration' : '🚀 Demo Mode'}</span>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              onClick={handleResetDemo} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              Reset Demo
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* API Key Status */}
        <div className="api-key-section mb-4">
          {userApiKey ? (
            <div className="api-key-status">
              <div className="flex items-center space-x-2">
                <span className="status-indicator active">✅</span>
                <span className="text-sm font-medium">Using your API key</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Unlimited usage with your personal Alchemy API key
              </p>
              <Button 
                onClick={() => onApiKeyChange('')} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Remove API Key
              </Button>
            </div>
          ) : demoStatus.hasDemoKey ? (
            <div className="demo-status">
              <div className="flex items-center space-x-2">
                <span className={`status-indicator ${demoStatus.canUseDemo ? 'active' : 'exhausted'}`}>
                  {demoStatus.canUseDemo ? '🎯' : '❌'}
                </span>
                <span className="text-sm font-medium">
                  Demo Mode: {demoStatus.remainingCalls} of {demoStatus.maxCalls} calls remaining
                </span>
              </div>
              
              {demoStatus.isExhausted && !userApiKey ? (
                <div className="exhausted-message mt-2 p-3 rounded">
                  <p className="text-sm font-semibold">
                    🚫 Demo limit reached! To continue using EtherFlow:
                  </p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p>• Get a free API key from <a href="https://www.alchemy.com/" target="_blank" rel="noopener noreferrer" className="underline text-white hover:text-blue-200">Alchemy</a></p>
                    <p>• Or refresh the page for a new session</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Try the app with pre-loaded demo addresses below
                </p>
              )}
            </div>
          ) : (
            <div className="no-demo">
              <div className="flex items-center space-x-2">
                <span className="status-indicator inactive">⚠️</span>
                <span className="text-sm font-medium">No API key available</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                You'll need an Alchemy API key to use the app
              </p>
            </div>
          )}
        </div>

        {/* API Key Input */}
        {!userApiKey && (
          <div className="api-key-input mb-4">
            {!showApiKeyInput ? (
              <Button 
                onClick={() => setShowApiKeyInput(true)} 
                variant="secondary" 
                size="sm"
                className="w-full"
              >
                🔑 Use Your Own API Key
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter your Alchemy API key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="text-sm"
                />
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleApiKeySubmit}
                    disabled={!tempApiKey.trim()}
                    size="sm"
                    className="flex-1"
                  >
                    Use Key
                  </Button>
                  <Button 
                    onClick={() => setShowApiKeyInput(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Example Addresses */}
        {(demoStatus.hasDemoKey || userApiKey) && (
          <div className="demo-addresses">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">{userApiKey ? '📋 Example addresses:' : '📋 Try these demo addresses:'}</h4>
              {userApiKey && (
                <Button 
                  onClick={() => setShowExampleAddresses(!showExampleAddresses)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {showExampleAddresses ? 'Hide' : 'Show'}
                </Button>
              )}
            </div>
            {showExampleAddresses && (
              <div className="space-y-2">
              {getDemoAddresses().map((address, index) => (
                <div key={address} className="demo-address-item">
                  <div className="flex items-center justify-between">
                    <div className="address-info flex-1">
                      <div className="address-name text-xs font-medium">
                        {index === 0 && "Vitalik Buterin"}
                        {index === 1 && "Binance Hot Wallet"}
                        {index === 2 && "High-Volume Wallet"}
                      </div>
                      <div className="address-value text-xs text-gray-500 font-mono">
                        {address.slice(0, 20)}...
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDemoAddressClick(address)}
                      disabled={demoStatus.isExhausted && !userApiKey}
                      variant="outline"
                      size="sm"
                      className="ml-2"
                    >
                      {userApiKey ? 'Analyze' : 'Try'}
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Help Text - Only show in Demo Mode */}
        {!userApiKey && (
          <div className="help-text mt-4 p-3 rounded">
            <p className="text-xs">
              💡 <strong>New to Alchemy?</strong> Get a free API key in 2 minutes at{' '}
              <a 
                href="https://www.alchemy.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-white hover:text-blue-200"
              >
                alchemy.com
              </a>{' '}
              for unlimited usage.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DemoModePanel;
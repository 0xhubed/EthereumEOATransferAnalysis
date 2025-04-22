import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Graph } from 'react-d3-graph';
import './TransferGraph.css';

const TransferGraph = ({ transferPartners, searchAddress }) => {
  const [highlightedNode, setHighlightedNode] = useState(null);
  const graphRef = useRef(null);
  const [errorState, setErrorState] = useState(false);
  
  // Create graph data structure
  const data = {
    nodes: [
      // Add the central node (the address being searched)
      { 
        id: searchAddress, 
        symbolType: 'circle',
        color: '#ff6347',
        size: 700,
        labelProperty: 'label',
        label: `${searchAddress.substring(0, 6)}...${searchAddress.substring(searchAddress.length - 4)}`
      }
    ],
    links: []
  };

  // Add partner nodes and links
  transferPartners.forEach(partner => {
    const totalValue = partner.totalSent + partner.totalReceived;
    const nodeSize = Math.max(300, Math.min(600, 300 + Math.log(totalValue + 1) * 50));
    
    // Add node
    data.nodes.push({
      id: partner.address,
      symbolType: 'circle',
      color: '#1f77b4',
      size: nodeSize,
      labelProperty: 'label',
      label: `${partner.address.substring(0, 6)}...${partner.address.substring(partner.address.length - 4)}`
    });

    // Add links - one for sent, one for received
    if (partner.totalSent > 0) {
      data.links.push({
        source: searchAddress,
        target: partner.address,
        strokeWidth: Math.max(1, Math.min(5, Math.log(partner.totalSent + 1))),
        color: '#ff9999',
        label: `Sent: ${partner.totalSent.toFixed(4)} ETH`
      });
    }

    if (partner.totalReceived > 0) {
      data.links.push({
        source: partner.address,
        target: searchAddress,
        strokeWidth: Math.max(1, Math.min(5, Math.log(partner.totalReceived + 1))),
        color: '#99ff99',
        label: `Received: ${partner.totalReceived.toFixed(4)} ETH`
      });
    }
  });

  // Graph configuration
  const graphConfig = {
    automaticRearrangeAfterDropNode: true,
    collapsible: false,
    directed: true,
    focusAnimationDuration: 0.75,
    focusZoom: 1,
    height: 600,
    highlightDegree: 1,
    highlightOpacity: 0.1,
    linkHighlightBehavior: true,
    maxZoom: 3,
    minZoom: 0.5,
    nodeHighlightBehavior: true,
    panAndZoom: false, // Disable built-in pan and zoom to avoid transform errors
    staticGraph: false,
    width: 1100,
    d3: {
      alphaTarget: 0.05,
      gravity: -150,
      linkLength: 180,
      linkStrength: 1
    },
    node: {
      color: '#d3d3d3',
      fontColor: 'black',
      fontSize: 12,
      fontWeight: 'normal',
      highlightColor: 'red',
      highlightFontSize: 14,
      highlightFontWeight: 'bold',
      highlightStrokeColor: 'SAME',
      highlightStrokeWidth: 1.5,
      labelPosition: 'top',
      mouseCursor: 'pointer',
      opacity: 1,
      renderLabel: true,
      size: 400,
      strokeColor: 'none',
      strokeWidth: 1.5,
      svg: '',
      symbolType: 'circle'
    },
    link: {
      color: '#d3d3d3',
      fontColor: 'black',
      fontSize: 10,
      fontWeight: 'normal',
      highlightColor: 'red',
      highlightFontSize: 10,
      highlightFontWeight: 'bold',
      mouseCursor: 'pointer',
      opacity: 1,
      renderLabel: true,
      semanticStrokeWidth: false,
      strokeWidth: 1.5,
      markerHeight: 6,
      markerWidth: 6,
      type: 'CURVE_SMOOTH'
    }
  };

  // Add error handler and custom zoom controls
  useEffect(() => {
    // Reset error state when data changes
    setErrorState(false);
  }, [transferPartners]);

  // Custom error handler
  const handleGraphError = useCallback((error) => {
    console.error('Graph error:', error);
    setErrorState(true);
  }, []);

  // Event handlers
  const onClickNode = useCallback((nodeId) => {
    if (errorState) return;
    setHighlightedNode(nodeId === highlightedNode ? null : nodeId);
  }, [highlightedNode, errorState]);

  return (
    <div className="transfer-graph-container">
      <h3>Transfer Network Visualization</h3>
      <div className="graph-wrapper">
        {errorState ? (
          <div className="graph-error">
            <p>Error rendering graph. Please try a different address or refresh the page.</p>
          </div>
        ) : (
          <Graph
            id="transfer-graph"
            ref={graphRef}
            data={data}
            config={graphConfig}
            onClickNode={onClickNode}
            onError={handleGraphError}
          />
        )}
      </div>
      <div className="graph-controls">
        <p>Use the table below to sort and explore the transfer data</p>
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="node-dot search-address"></span>
          <span>Searched Address</span>
        </div>
        <div className="legend-item">
          <span className="node-dot partner-address"></span>
          <span>Partner Address</span>
        </div>
        <div className="legend-item">
          <span className="link-line sent"></span>
          <span>ETH Sent</span>
        </div>
        <div className="legend-item">
          <span className="link-line received"></span>
          <span>ETH Received</span>
        </div>
        <div className="legend-note">
          <p>* Node size represents transaction volume</p>
          <p>* Line thickness represents transaction amount</p>
          <p>* Click on nodes for more details</p>
        </div>
      </div>
    </div>
  );
};

export default TransferGraph;
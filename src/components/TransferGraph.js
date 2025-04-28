import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Graph } from 'react-d3-graph';
import './TransferGraph.css';

const TransferGraph = ({ transferPartners, searchAddress }) => {
  const [highlightedNode, setHighlightedNode] = useState(null);
  const graphRef = useRef(null);
  const [errorState, setErrorState] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });
  
  // State for graph width
  const [graphWidth, setGraphWidth] = useState(
    window.innerWidth > 1200 ? 1100 : window.innerWidth - 100
  );
  
  // Create graph data structure with central positioning
  const data = {
    nodes: [
      // Add the central node (the address being searched)
      { 
        id: searchAddress, 
        symbolType: 'diamond', // Use diamond shape to distinguish the central node
        color: '#ff6347',
        size: 700,
        labelProperty: 'label',
        label: `${searchAddress.substring(0, 6)}...${searchAddress.substring(searchAddress.length - 4)}`,
        strokeColor: '#ffffff', // Add white stroke for emphasis
        strokeWidth: 3,
        x: graphWidth / 2,
        y: 300
      }
    ],
    links: []
  };

  // Calculate max values for scaling
  const maxTransaction = Math.max(
    ...transferPartners.map(p => Math.max(p.totalSent, p.totalReceived, 0.001))
  );
  
  // Add partner nodes and links in a circular pattern
  transferPartners.forEach((partner, index) => {
    const totalValue = partner.totalSent + partner.totalReceived;
    
    // Logarithmic scaling for node size based on total transaction volume
    // Min size 300, max size 800
    const nodeSize = Math.max(300, Math.min(800, 300 + Math.log(totalValue + 1) * 60));
    
    // Calculate position in a circle around the center node
    const angle = (2 * Math.PI * index) / transferPartners.length;
    const radius = graphWidth * 0.25; // Distance from center
    const x = (graphWidth / 2) + radius * Math.cos(angle);
    const y = 300 + radius * Math.sin(angle);
    
    // Check for anomalies and set node color accordingly
    let nodeColor = '#1f77b4'; // Default blue color
    let nodeStrokeColor = 'none';
    let nodeStrokeWidth = 1.5;
    let nodeSymbolType = 'circle';
    
    // If this partner has anomalies, highlight the node
    if (partner.anomalies && partner.anomalies.hasAnomalies) {
      nodeColor = '#db4437'; // Red color for anomalies
      nodeStrokeColor = '#ffcc00'; // Yellow stroke
      nodeStrokeWidth = 3; // Thicker stroke
      
      // Use different symbol types based on anomaly type
      if (partner.anomalies.irregularPattern) {
        nodeSymbolType = 'triangle'; // Triangle for irregular patterns
      } else if (partner.anomalies.unusualFrequency) {
        nodeSymbolType = 'square'; // Square for unusual frequency
      }
    }
    
    // Add node with tooltip info
    data.nodes.push({
      id: partner.address,
      symbolType: nodeSymbolType,
      color: nodeColor,
      size: nodeSize,
      labelProperty: 'label',
      label: `${partner.address.substring(0, 6)}...${partner.address.substring(partner.address.length - 4)}`,
      // Custom properties for tooltip/info
      totalValue: totalValue.toFixed(4),
      totalSent: partner.totalSent.toFixed(4),
      totalReceived: partner.totalReceived.toFixed(4),
      strokeColor: nodeStrokeColor,
      strokeWidth: nodeStrokeWidth,
      // Save anomaly data for tooltip
      hasAnomalies: partner.anomalies?.hasAnomalies || false,
      anomalyTypes: [
        partner.anomalies?.largeTransfers?.length ? 'Large transfers' : null,
        partner.anomalies?.unusualFrequency ? 'Unusual timing' : null,
        partner.anomalies?.irregularPattern ? 'Irregular pattern' : null
      ].filter(Boolean).join(', '),
      x: x,
      y: y
    });

    // Add links - one for sent, one for received
    // Scale link width based on transaction amount relative to max
    if (partner.totalSent > 0) {
      // Scale thickness between 1-8 based on value relative to maximum
      const sentWidth = Math.max(1, Math.min(8, 1 + 7 * (partner.totalSent / maxTransaction)));
      
      data.links.push({
        source: searchAddress,
        target: partner.address,
        strokeWidth: sentWidth,
        color: '#ff9999',
        label: `Sent: ${partner.totalSent.toFixed(4)} ETH`
      });
    }

    if (partner.totalReceived > 0) {
      // Scale thickness between 1-8 based on value relative to maximum
      const receivedWidth = Math.max(1, Math.min(8, 1 + 7 * (partner.totalReceived / maxTransaction)));
      
      data.links.push({
        source: partner.address,
        target: searchAddress,
        strokeWidth: receivedWidth,
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
    panAndZoom: true, // Enable built-in pan and zoom
    staticGraph: true, // Use static positioning for consistent layout
    width: graphWidth,
    d3: {
      alphaTarget: 0.05,
      gravity: -200, // Increased gravity to center better
      linkLength: 180,
      linkStrength: 1,
      disableLinkForce: false,
      centerAt: { x: graphWidth / 2, y: 300 } // Center in the middle
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
    
    // Handle window resize
    const handleResize = () => {
      setGraphWidth(window.innerWidth > 1200 ? 1100 : window.innerWidth - 100);
    };
    
    // Fix zoom transform error by overriding d3-zoom's transform handler
    // This needs to run after component mount when graph is rendered
    try {
      const fixZoomTransformError = () => {
        // Find the SVG element created by react-d3-graph
        const svgElement = document.querySelector('#transfer-graph-wrapper svg');
        if (svgElement) {
          // Apply a default transform attribute if missing
          if (!svgElement.getAttribute('transform')) {
            svgElement.setAttribute('transform', 'translate(0,0) scale(1)');
          }
          
          // Add a safety check to the zoom handling
          const originalZoom = svgElement.__zoom;
          if (!originalZoom) {
            // Initialize __zoom property with default transform
            svgElement.__zoom = {
              x: 0, y: 0, k: 1,
              toString() { return `translate(${this.x},${this.y}) scale(${this.k})`; }
            };
          }
        }
      };
      
      // Run immediately and after a slight delay to ensure graph is rendered
      fixZoomTransformError();
      setTimeout(fixZoomTransformError, 500);
    } catch (error) {
      console.error("Error fixing zoom transform:", error);
    }
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
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
    
    // Find node data to display extended info
    const nodeData = data.nodes.find(node => node.id === nodeId);
    if (nodeData && nodeData.id !== searchAddress) {
      const totalValue = parseFloat(nodeData.totalValue || 0);
      console.log(`Node clicked: ${nodeId}`);
      console.log(`Total ETH transferred: ${totalValue.toFixed(4)} ETH`);
      console.log(`Sent: ${nodeData.totalSent} ETH, Received: ${nodeData.totalReceived} ETH`);
    }
  }, [highlightedNode, errorState, data.nodes, searchAddress]);
  
  // Mouse over handler to show additional info
  const onMouseOverNode = useCallback((nodeId, event) => {
    if (errorState) return;
    
    // Find node data to show in tooltip
    const nodeData = data.nodes.find(node => node.id === nodeId);
    if (nodeData) {
      // Get mouse position for tooltip placement
      const mouseX = event ? event.clientX : 0;
      const mouseY = event ? event.clientY : 0;
      
      let tooltipContent;
      
      if (nodeId === searchAddress) {
        tooltipContent = `Central Address: ${nodeId.substring(0, 10)}...`;
      } else {
        const totalValue = parseFloat(nodeData.totalValue || 0);
        const sent = parseFloat(nodeData.totalSent || 0);
        const received = parseFloat(nodeData.totalReceived || 0);
        
        // Format values to be more readable
        const formatEth = (value) => {
          if (value >= 100) {
            return value.toFixed(2);
          } else if (value >= 10) {
            return value.toFixed(3);
          } else if (value >= 1) {
            return value.toFixed(4);
          } else if (value >= 0.001) {
            return value.toFixed(5);
          } else {
            return value.toExponential(2);
          }
        };
        
        // Build tooltip content
        tooltipContent = `
          <div class="tooltip-address">${nodeId.substring(0, 10)}...</div>
          <div class="tooltip-value">Total: ${formatEth(totalValue)} ETH</div>
          <div class="tooltip-sent">Sent: ${formatEth(sent)} ETH</div>
          <div class="tooltip-received">Received: ${formatEth(received)} ETH</div>
        `;
        
        // Add anomaly information if present
        if (nodeData.hasAnomalies) {
          tooltipContent += `
            <div class="tooltip-anomaly">
              <span class="anomaly-icon">⚠️</span> 
              <span class="anomaly-text">Anomalies detected: ${nodeData.anomalyTypes}</span>
            </div>
          `;
        }
      }
      
      setTooltip({
        visible: true,
        content: tooltipContent,
        x: mouseX,
        y: mouseY
      });
    }
  }, [errorState, data.nodes, searchAddress]);
  
  // Mouse out handler to hide tooltip
  const onMouseOutNode = useCallback(() => {
    setTooltip({
      ...tooltip,
      visible: false
    });
  }, [tooltip]);

  return (
    <div className="transfer-graph-container">
      <h3>Transfer Network Visualization</h3>
      
      {/* Custom tooltip */}
      {tooltip.visible && (
        <div 
          className="node-tooltip" 
          style={{ 
            left: `${tooltip.x + 10}px`, 
            top: `${tooltip.y + 10}px`,
            position: 'fixed',
            zIndex: 1000 
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
      
      <div className="graph-wrapper">
        {errorState ? (
          <div className="graph-error">
            <p>Error rendering graph. Please try a different address or refresh the page.</p>
          </div>
        ) : (
          <div className="graph-container">
            <div id="transfer-graph-wrapper">
              <Graph
                id="transfer-graph"
                ref={graphRef}
                data={data}
                config={{
                  ...graphConfig,
                  width: graphWidth,
                  d3: {
                    ...graphConfig.d3,
                    alphaTarget: 0.05,
                    gravity: -200,
                    linkLength: 180,
                    linkStrength: 1
                  }
                }}
                onClickNode={onClickNode}
                onMouseOverNode={onMouseOverNode}
                onMouseOutNode={onMouseOutNode}
                onError={handleGraphError}
              />
            </div>
          </div>
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
          <span className="node-dot anomaly-address"></span>
          <span>Address with Anomalies</span>
        </div>
        <div className="legend-item">
          <span className="node-triangle anomaly-pattern"></span>
          <span>Irregular Pattern</span>
        </div>
        <div className="legend-item">
          <span className="node-square anomaly-frequency"></span>
          <span>Unusual Timing</span>
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
          <p>* Bubble size represents total transaction volume (bigger = more ETH transferred)</p>
          <p>* Line thickness represents individual transaction amounts (thicker = more ETH)</p>
          <p>* Red lines: ETH sent from central address</p>
          <p>* Green lines: ETH received by central address</p>
          <p>* Red nodes with yellow border: Addresses with anomalous transaction patterns</p>
          <p>* Click on nodes for more details</p>
        </div>
      </div>
    </div>
  );
};

export default TransferGraph;
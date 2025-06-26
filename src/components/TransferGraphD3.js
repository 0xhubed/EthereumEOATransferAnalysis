import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './TransferGraph.css';

const TransferGraphD3 = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !transferPartners || !Array.isArray(transferPartners) || transferPartners.length === 0) {
      console.log('TransferGraphD3: Missing required data or DOM elements');
      return;
    }

    if (!searchAddress || typeof searchAddress !== 'string') {
      console.log('TransferGraphD3: Invalid searchAddress');
      return;
    }

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    let simulation; // Declare simulation variable for cleanup

    // Set up responsive dimensions
    const containerWidth = containerRef.current.clientWidth;
    const width = Math.max(300, containerWidth - 20);
    const height = Math.max(300, Math.min(600, containerWidth * 0.6));

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Prepare data
    const nodes = [];
    const links = [];

    // Add central node
    nodes.push({
      id: searchAddress,
      type: 'central',
      x: width / 2,
      y: height / 2,
      fx: width / 2,
      fy: height / 2,
      size: 20
    });

    // Find max values for scaling
    const maxValue = Math.max(
      ...transferPartners.map(p => Math.max(p.totalSent || 0, p.totalReceived || 0, 0.001))
    );

    // Limit the number of nodes for performance (show top partners by value)
    const maxNodes = 200; // Reasonable limit for visualization
    const sortedPartners = transferPartners
      .map(partner => ({
        ...partner,
        totalValue: (partner.totalSent || 0) + (partner.totalReceived || 0)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, maxNodes);

    console.log('TransferGraphD3: Using top', sortedPartners.length, 'partners out of', transferPartners.length);

    // Add partner nodes
    sortedPartners.forEach((partner, index) => {
      const nodeSize = 8 + (partner.totalValue / maxValue) * 15;

      nodes.push({
        id: partner.address,
        type: 'partner',
        partner: partner,
        size: nodeSize,
        totalValue: partner.totalValue,
        hasAnomaly: partner.anomalies?.hasAnomalies || false
      });

      // Add links
      if (partner.totalSent > 0) {
        links.push({
          source: searchAddress,
          target: partner.address,
          value: partner.totalSent,
          type: 'sent'
        });
      }

      if (partner.totalReceived > 0) {
        links.push({
          source: partner.address,
          target: searchAddress,
          value: partner.totalReceived,
          type: 'received'
        });
      }
    });

    // Validate data before creating force simulation
    if (!nodes || nodes.length === 0) {
      console.log('TransferGraphD3: No nodes to render');
      return;
    }

    if (!links) {
      console.log('TransferGraphD3: Links array is null');
      return;
    }

    // Ensure all nodes have required properties
    nodes.forEach((node, index) => {
      if (!node.id) {
        console.error('TransferGraphD3: Node missing id', node);
        node.id = `node-${index}`;
      }
      if (typeof node.size !== 'number') {
        node.size = 10;
      }
    });

    // Create a map of node IDs for faster lookup
    const nodeIdMap = new Map();
    nodes.forEach(node => {
      if (nodeIdMap.has(node.id)) {
        console.warn('TransferGraphD3: Duplicate node ID found:', node.id);
      }
      nodeIdMap.set(node.id, node);
    });

    // Ensure all links have valid source and target
    const validLinks = links.filter(link => {
      const hasValidSource = nodeIdMap.has(link.source);
      const hasValidTarget = nodeIdMap.has(link.target);
      
      if (!hasValidSource) {
        console.warn('TransferGraphD3: Link has invalid source:', link.source);
      }
      if (!hasValidTarget) {
        console.warn('TransferGraphD3: Link has invalid target:', link.target);
      }
      
      return hasValidSource && hasValidTarget && link.source !== link.target; // Avoid self-loops
    });

    console.log('TransferGraphD3: Creating simulation with', nodes.length, 'nodes and', validLinks.length, 'links');

    // Create force simulation with error handling
    try {
      simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(validLinks)
          .id(d => d.id)
          .distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(d => d.size + 5));
    } catch (error) {
      console.error('TransferGraphD3: Error creating force simulation:', error);
      console.log('Nodes:', nodes);
      console.log('Valid Links:', validLinks);
      return;
    }

    // Add arrow markers
    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowSent')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ff6b6b');

    defs.append('marker')
      .attr('id', 'arrowReceived')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#51cf66');

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(validLinks)
      .enter()
      .append('line')
      .attr('stroke-width', d => Math.max(1, Math.min(8, (d.value / maxValue) * 6)))
      .attr('stroke', d => d.type === 'sent' ? '#ff6b6b' : '#51cf66')
      .attr('opacity', 0.7)
      .attr('marker-end', d => d.type === 'sent' ? 'url(#arrowSent)' : 'url(#arrowReceived)');

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => {
        if (d.type === 'central') return '#4c6ef5';
        if (d.hasAnomaly) return '#fa5252';
        return '#51cf66';
      })
      .attr('stroke', d => d.type === 'central' ? '#fff' : (d.hasAnomaly ? '#c92a2a' : '#2b8a3e'))
      .attr('stroke-width', d => d.type === 'central' ? 3 : 2)
      .on('mouseover', function(event, d) {
        if (d.type === 'partner') {
          const partner = d.partner;
          // Get the container's position and the mouse position relative to it
          const containerRect = containerRef.current.getBoundingClientRect();
          let mouseX = event.clientX - containerRect.left;
          let mouseY = event.clientY - containerRect.top;
          
          // Adjust position to keep tooltip within container bounds
          const tooltipWidth = 200; // Approximate tooltip width
          const tooltipHeight = 100; // Approximate tooltip height
          
          if (mouseX + tooltipWidth + 15 > containerRect.width) {
            mouseX = mouseX - tooltipWidth - 15; // Move to left of cursor
          }
          if (mouseY - tooltipHeight < 0) {
            mouseY = mouseY + 20; // Move below cursor
          }
          
          setTooltip({
            visible: true,
            content: `
              <div class="tooltip-address">${partner.address.substring(0, 10)}...</div>
              <div class="tooltip-value">Total: ${(d.totalValue || 0).toFixed(4)} ETH</div>
              <div class="tooltip-sent">Sent: ${(partner.totalSent || 0).toFixed(4)} ETH</div>
              <div class="tooltip-received">Received: ${(partner.totalReceived || 0).toFixed(4)} ETH</div>
              ${d.hasAnomaly ? '<div class="tooltip-anomaly">⚠️ Anomalies detected</div>' : ''}
            `,
            x: mouseX,
            y: mouseY
          });
        }
        
        // Highlight connected links
        link.attr('opacity', l => {
          const sourceId = l.source && typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = l.target && typeof l.target === 'object' ? l.target.id : l.target;
          return (sourceId === d.id || targetId === d.id) ? 1 : 0.1;
        });
        
        // Highlight node
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', d.size * 1.3);
      })
      .on('mouseout', function(event, d) {
        setTooltip(prev => ({ ...prev, visible: false }));
        
        // Reset link opacity
        link.attr('opacity', 0.7);
        
        // Reset node size
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', d.size);
      });

    // Add labels
    node.append('text')
      .text(d => {
        const addr = d.id;
        return d.type === 'central' ? 
          `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` :
          `${addr.substring(0, 4)}...${addr.substring(addr.length - 2)}`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', d => -d.size - 8)
      .attr('font-size', d => d.type === 'central' ? '12px' : '10px')
      .attr('font-weight', d => d.type === 'central' ? 'bold' : 'normal')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          if (d.source && typeof d.source === 'object' && typeof d.source.x === 'number') {
            return d.source.x;
          }
          return 0;
        })
        .attr('y1', d => {
          if (d.source && typeof d.source === 'object' && typeof d.source.y === 'number') {
            return d.source.y;
          }
          return 0;
        })
        .attr('x2', d => {
          if (d.target && typeof d.target === 'object' && typeof d.target.x === 'number') {
            return d.target.x;
          }
          return 0;
        })
        .attr('y2', d => {
          if (d.target && typeof d.target === 'object' && typeof d.target.y === 'number') {
            return d.target.y;
          }
          return 0;
        });

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.type !== 'central') {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };

  }, [transferPartners, searchAddress]);

  return (
    <div className="transfer-graph">
      <h3>Transfer Network Visualization</h3>
      <div ref={containerRef} className="graph-container">
        <svg ref={svgRef}></svg>
        
        {tooltip.visible && (
          <div 
            className="graph-tooltip"
            style={{
              position: 'absolute',
              left: tooltip.x + 15,
              top: tooltip.y - 35,
              pointerEvents: 'none',
              zIndex: 1000
            }}
            dangerouslySetInnerHTML={{ __html: tooltip.content }}
          />
        )}
      </div>
      
      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-dot central"></span>
          <span>Central Address</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot partner"></span>
          <span>Partner Address</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot anomaly"></span>
          <span>Address with Anomalies</span>
        </div>
        <div className="legend-item">
          <span className="legend-line sent"></span>
          <span>ETH Sent</span>
        </div>
        <div className="legend-item">
          <span className="legend-line received"></span>
          <span>ETH Received</span>
        </div>
      </div>
      
      <div className="graph-info">
        <p>• Node size represents transaction volume</p>
        <p>• Line thickness represents transaction amounts</p>
        <p>• Drag nodes to rearrange the layout</p>
        <p>• Hover over nodes for detailed information</p>
      </div>
    </div>
  );
};

export default TransferGraphD3;
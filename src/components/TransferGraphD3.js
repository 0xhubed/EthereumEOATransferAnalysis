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
    if (!svgRef.current || !containerRef.current || !transferPartners || transferPartners.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

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

    // Add partner nodes
    transferPartners.forEach((partner, index) => {
      const totalValue = (partner.totalSent || 0) + (partner.totalReceived || 0);
      const nodeSize = 8 + (totalValue / maxValue) * 15;

      nodes.push({
        id: partner.address,
        type: 'partner',
        partner: partner,
        size: nodeSize,
        totalValue: totalValue,
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

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => d.size + 5));

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
      .data(links)
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
        link.attr('opacity', l => 
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
        );
        
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
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
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
      simulation.stop();
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
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './TransferGraph3D.css';

const SimplifiedGraph3D = ({ transferPartners, searchAddress }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !transferPartners) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Set up dimensions
    const width = containerRef.current.clientWidth;
    const height = 600;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Calculate adjusted dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Prepare data for 3D-like visualization
    const nodes = [];
    const links = [];
    
    // Add central node
    nodes.push({
      id: searchAddress,
      type: 'central',
      value: 1,
      x: innerWidth / 2,
      y: innerHeight / 2,
      z: 0
    });
    
    // Find max transaction value for scaling
    const maxValue = Math.max(
      ...transferPartners.map(p => Math.max(p.totalSent, p.totalReceived, 0.001))
    );
    
    // Add partner nodes in a 3D-like circular pattern
    transferPartners.forEach((partner, index) => {
      const totalValue = partner.totalSent + partner.totalReceived;
      
      // Calculate position in a "3D" space
      const angle = (2 * Math.PI * index) / transferPartners.length;
      const nodeDistance = Math.min(innerWidth, innerHeight) * 0.35;
      
      // Use cosine for x, sine for y and modify them to give 3D effect
      let x = innerWidth / 2 + nodeDistance * Math.cos(angle);
      let y = innerHeight / 2 + nodeDistance * Math.sin(angle) * 0.7; // Squash Y to give 3D perspective
      let z = -50 + Math.random() * 100; // Random Z for some variation
      
      // Reduce apparent size based on z-position to fake perspective
      const perspectiveScale = 1 - (z / 300);
      
      // Add node with size scaled by transaction volume
      const nodeSize = 5 + (totalValue / maxValue) * 25;
      
      // Determine color based on anomalies
      let nodeColor = '#1f77b4'; // Default blue
      if (partner.anomalies && partner.anomalies.hasAnomalies) {
        nodeColor = '#db4437'; // Red for anomalies
      }
      
      nodes.push({
        id: partner.address,
        type: 'partner',
        value: totalValue,
        totalSent: partner.totalSent,
        totalReceived: partner.totalReceived,
        x: x,
        y: y,
        z: z,
        size: nodeSize * perspectiveScale,
        color: nodeColor,
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
    
    // Sort nodes by z value for proper layering (painter's algorithm)
    nodes.sort((a, b) => b.z - a.z);
    
    // Draw links first (behind nodes)
    svg.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d => {
        const source = nodes.find(n => n.id === d.source);
        const target = nodes.find(n => n.id === d.target);
        
        if (!source || !target) return '';
        
        // Create a curved path
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2 - 20; // Curve upward
        
        return `M${source.x},${source.y} Q${midX},${midY} ${target.x},${target.y}`;
      })
      .attr('stroke', d => d.type === 'sent' ? '#ff9999' : '#99ff99')
      .attr('stroke-width', d => 1 + (d.value / maxValue) * 5)
      .attr('fill', 'none')
      .attr('opacity', 0.7)
      .attr('marker-end', d => d.type === 'sent' ? 'url(#arrowSent)' : 'url(#arrowReceived)');
    
    // Add arrow markers
    const defs = svg.append('defs');
    
    // Arrow for sent transactions
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
      .attr('fill', '#ff9999');
    
    // Arrow for received transactions
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
      .attr('fill', '#99ff99');
    
    // Draw nodes
    const nodeGroups = svg.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .on('mouseover', function(event, d) {
        // Highlight node
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', 3)
          .attr('r', d.size * 1.2);
        
        // Show tooltip
        if (d.type !== 'central') {
          const tooltip = d3.select('#graph3d-tooltip');
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 30}px`)
            .style('opacity', 1);
          
          const formatEth = (value) => {
            if (value >= 100) return value.toFixed(2);
            if (value >= 10) return value.toFixed(3);
            if (value >= 1) return value.toFixed(4);
            if (value >= 0.001) return value.toFixed(5);
            return value.toExponential(2);
          };
          
          let tooltipContent = `
            <div class="tooltip3d-address">${d.id.substring(0, 10)}...</div>
            <div class="tooltip3d-value">Total: ${formatEth(d.value)} ETH</div>
            <div class="tooltip3d-sent">Sent: ${formatEth(d.totalSent)} ETH</div>
            <div class="tooltip3d-received">Received: ${formatEth(d.totalReceived)} ETH</div>
          `;
          
          if (d.hasAnomaly) {
            tooltipContent += `<div class="tooltip3d-anomaly">⚠️ Anomalies detected</div>`;
          }
          
          tooltip.html(tooltipContent);
        }
      })
      .on('mouseout', function(event, d) {
        // Reset highlighting
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', d.type === 'central' ? 3 : 1)
          .attr('r', d.size);
        
        // Hide tooltip
        d3.select('#graph3d-tooltip')
          .style('opacity', 0);
      });
    
    // Add circles for nodes
    nodeGroups.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.type === 'central' ? '#ff6347' : d.color)
      .attr('stroke', d => {
        if (d.type === 'central') return 'white';
        if (d.hasAnomaly) return '#ffcc00';
        return '#333';
      })
      .attr('stroke-width', d => d.type === 'central' ? 3 : 1);
    
    // Add labels
    nodeGroups.append('text')
      .attr('y', d => -d.size - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .style('font-size', d => d.type === 'central' ? '14px' : '12px')
      .style('font-weight', d => d.type === 'central' ? 'bold' : 'normal')
      .text(d => {
        const addr = d.id;
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
      })
      .style('pointer-events', 'none');
    
    // Add shadow effect for depth
    nodeGroups.append('circle')
      .attr('r', d => d.size)
      .attr('transform', 'translate(3,3)')
      .attr('fill', 'rgba(0,0,0,0.2)')
      .attr('stroke', 'none')
      .lower();
    
    // Add rotation animation
    let rotation = 0;
    let animationId;
    
    function rotateGraph() {
      rotation += 0.5;
      
      // Update node positions to create rotation illusion
      nodeGroups.each(function(d) {
        if (d.type === 'central') return; // Don't rotate central node
        
        // Calculate new position based on rotation
        const angle = (2 * Math.PI * transferPartners.findIndex(p => p.address === d.id)) / transferPartners.length;
        const nodeDistance = Math.min(innerWidth, innerHeight) * 0.35;
        const rotatedAngle = angle + (rotation * Math.PI / 180);
        
        const newX = innerWidth / 2 + nodeDistance * Math.cos(rotatedAngle);
        const newY = innerHeight / 2 + nodeDistance * Math.sin(rotatedAngle) * 0.7;
        
        // Update node position
        d3.select(this)
          .attr('transform', `translate(${newX}, ${newY})`);
      });
      
      // Update links
      svg.selectAll('.link')
        .attr('d', d => {
          const source = nodes.find(n => n.id === d.source);
          const target = nodes.find(n => n.id === d.target);
          
          if (!source || !target) return '';
          
          // Find actual position from the transform attribute for targets
          let sourceX = source.x;
          let sourceY = source.y;
          let targetX = target.x;
          let targetY = target.y;
          
          if (source.type !== 'central') {
            const sourceNode = nodeGroups.filter(n => n.id === source.id).node();
            if (sourceNode) {
              const transform = d3.select(sourceNode).attr('transform');
              const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
              if (match) {
                sourceX = parseFloat(match[1]);
                sourceY = parseFloat(match[2]);
              }
            }
          }
          
          if (target.type !== 'central') {
            const targetNode = nodeGroups.filter(n => n.id === target.id).node();
            if (targetNode) {
              const transform = d3.select(targetNode).attr('transform');
              const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
              if (match) {
                targetX = parseFloat(match[1]);
                targetY = parseFloat(match[2]);
              }
            }
          }
          
          // Create a curved path
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2 - 20;
          
          return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
        });
      
      animationId = requestAnimationFrame(rotateGraph);
    }
    
    // Start rotation
    rotateGraph();
    
    // Add button to control rotation
    const rotationBtn = d3.select('#rotation-toggle');
    let isRotating = true;
    
    rotationBtn.on('click', function() {
      if (isRotating) {
        cancelAnimationFrame(animationId);
        rotationBtn.text('▶️ Start Rotation');
      } else {
        rotateGraph();
        rotationBtn.text('⏹️ Stop Rotation');
      }
      isRotating = !isRotating;
    });
    
    // Cleanup on component unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [transferPartners, searchAddress]);
  
  return (
    <div className="transfer-graph-3d">
      <h3>3D Network Visualization</h3>
      
      <div className="controls-3d">
        <button id="rotation-toggle" className="active">⏹️ Stop Rotation</button>
        <div className="help-text">
          <span>Hover over nodes to see details</span>
          <span>Node size represents transaction volume</span>
          <span>Red nodes indicate anomalies</span>
        </div>
      </div>
      
      <div ref={containerRef} className="canvas-container">
        <svg ref={svgRef}></svg>
        <div id="graph3d-tooltip" className="tooltip3d"></div>
      </div>
      
      <div className="legend-3d">
        <div className="legend-item">
          <span className="node-dot search-address"></span>
          <span>Central Address</span>
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
          <span className="link-line sent"></span>
          <span>ETH Sent</span>
        </div>
        <div className="legend-item">
          <span className="link-line received"></span>
          <span>ETH Received</span>
        </div>
        <div className="legend-note">
          <p>* Sphere size represents total transaction volume</p>
          <p>* Line thickness represents transaction amounts</p>
          <p>* Arrows show direction of ETH flow</p>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedGraph3D;
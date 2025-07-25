import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './TreeMapVisualization.css';
import { Button } from './ui/button';
import { Card } from './ui/card';

const TreeMapVisualization = ({ data, title = 'Transaction Tree Map', colorScheme = 'viridis' }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const colorScales = {
    viridis: d3.interpolateViridis,
    inferno: d3.interpolateInferno,
    plasma: d3.interpolatePlasma,
    magma: d3.interpolateMagma,
    blues: d3.interpolateBlues,
    greens: d3.interpolateGreens,
    reds: d3.interpolateReds,
    purples: d3.interpolatePurples
  };

  useEffect(() => {
    setIsLoading(true);
    
    if (!data || !data.name || !data.children || data.children.length === 0) {
      console.log("TreeMap: Invalid data structure", data);
      setIsLoading(false);
      return;
    }
    
    console.log("TreeMap: Data received", data);
    
    // Reset state when data changes
    setCurrentNode(null);
    setBreadcrumbs([{ name: data.name, data: data }]);

    // Use a slight delay to ensure loading indicator is shown
    // This helps users understand processing is happening
    setTimeout(() => {
      createTreeMap(data);
      setIsLoading(false);
    }, 100);
  }, [data]);

  useEffect(() => {
    if (currentNode) {
      setIsLoading(true);
      setTimeout(() => {
        createTreeMap(currentNode);
        setIsLoading(false);
      }, 100);
    }
  }, [currentNode, colorScheme]);

  useEffect(() => {
    const handleResize = () => {
      if (breadcrumbs.length > 0) {
        setIsLoading(true);
        // Debounce to avoid multiple calls during resize
        setTimeout(() => {
          createTreeMap(breadcrumbs[breadcrumbs.length - 1].data);
          setIsLoading(false);
        }, 300);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breadcrumbs]);

  const createTreeMap = (rootData) => {
    if (!svgRef.current || !containerRef.current) {
      console.log("TreeMap: Missing refs", { svgRef: svgRef.current, containerRef: containerRef.current });
      return;
    }

    // Clear existing SVG
    d3.select(svgRef.current).selectAll('*').remove();

    // Set explicit dimensions instead of relying on clientWidth/Height which might be 0
    const width = containerRef.current.clientWidth || 800;
    const height = 600;
    
    console.log("TreeMap: Dimensions", { width, height, 
      clientWidth: containerRef.current.clientWidth,
      clientHeight: containerRef.current.clientHeight,
      offsetWidth: containerRef.current.offsetWidth,
      offsetHeight: containerRef.current.offsetHeight
    });
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    // Create the treemap layout
    const treemap = d3.treemap()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(20)
      .paddingInner(1)
      .round(true);
    
    // Create the root hierarchy
    const root = d3.hierarchy(rootData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    console.log("TreeMap: Hierarchy created", { 
      rootData, 
      hierarchyNodes: root.descendants().length,
      maxValue: d3.max(root.descendants(), d => d.value) 
    });
    
    // Apply the treemap layout
    treemap(root);
    
    // Color scale based on depth and value
    const colorInterpolator = colorScales[colorScheme] || colorScales.viridis;
    const colorScale = d3.scaleSequential(colorInterpolator)
      .domain([0, d3.max(root.descendants(), d => d.value) || 1]);
    
    // Create group for each node
    const nodes = svg.selectAll('.tree-map-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'tree-map-node-group')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    // Add rectangle for each node
    nodes
      .append('rect')
      .attr('class', 'tree-map-node')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.value))
      .on('click', (event, d) => {
        // Only drill down if the node has children
        if (d.children) {
          setCurrentNode(d.data);
          setBreadcrumbs(prev => [...prev, { name: d.data.name, data: d.data }]);
        }
      })
      .on('mouseover', (event, d) => {
        const tooltip = d3.select(tooltipRef.current);
        tooltip.style('visibility', 'visible')
          .html(`
            <div>
              <strong>${d.data.name}</strong><br/>
              Value: ${d.value.toLocaleString()}<br/>
              ${d.data.address ? `Address: ${d.data.address.substring(0, 10)}...` : ''}
              ${d.data.details ? `<br/>${d.data.details}` : ''}
            </div>
          `)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`);
      })
      .on('mousemove', (event) => {
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`);
      })
      .on('mouseout', () => {
        d3.select(tooltipRef.current).style('visibility', 'hidden');
      });
    
    // Add node titles
    nodes
      .append('text')
      .attr('class', 'tree-map-node-text')
      .attr('dx', 4)
      .attr('dy', 14)
      .text(d => {
        // Calculate available space
        const nodeWidth = d.x1 - d.x0;
        const nodeHeight = d.y1 - d.y0;
        
        // Only show text for large enough nodes
        if (nodeWidth < 30 || nodeHeight < 20) return '';
        
        // Truncate text if needed
        const name = d.data.name;
        const maxLen = Math.floor(nodeWidth / 8); // Estimate characters that can fit
        
        return name.length > maxLen ? name.substring(0, maxLen) + '...' : name;
      })
      .attr('fill', d => {
        // Calculate lightness of background to decide text color
        const rgb = d3.rgb(colorScale(d.value));
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000' : '#fff';
      });
    
    // Add title for each node
    nodes
      .append('title')
      .text(d => `${d.data.name}: ${d.value}`);
  };

  const handleBreadcrumbClick = (index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentNode(newBreadcrumbs[newBreadcrumbs.length - 1].data);
  };

  const handleResetView = () => {
    if (data) {
      setCurrentNode(null);
      setBreadcrumbs([{ name: data.name, data: data }]);
    }
  };

  if (!data || !data.name || !data.children || data.children.length === 0) {
    return (
      <Card className="tree-map-container">
        <div className="tree-map-no-data">
          No data available for tree map visualization
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        
        <div className="tree-map-controls">
          <div className="tree-map-breadcrumb">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span> / </span>}
                <span 
                  className="tree-map-breadcrumb-item"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.name}
                </span>
              </React.Fragment>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetView}
            disabled={breadcrumbs.length <= 1}
          >
            Reset View
          </Button>
        </div>
        
        <div 
          className="tree-map-container" 
          ref={containerRef}
          style={{ width: '100%', height: '600px', position: 'relative' }}
        >
          {isLoading && (
            <div className="tree-map-loading">
              <div className="tree-map-loading-spinner"></div>
              <div className="tree-map-loading-text">Processing data...</div>
            </div>
          )}
          <svg 
            ref={svgRef}
            width="100%"
            height="600"
            style={{ display: 'block' }}
          ></svg>
          <div 
            className="tree-map-tooltip" 
            ref={tooltipRef} 
            style={{ visibility: 'hidden' }}
          ></div>
        </div>
      </div>
    </Card>
  );
};

export default TreeMapVisualization;
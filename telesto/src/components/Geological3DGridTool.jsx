import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Play, Settings, Eye, EyeOff, RotateCw, Zap, FileText, Layers, Box, Grid, Info } from 'lucide-react';

const Geological3DGridTool = () => {
  console.log('Geological3DGridTool component starting...');
  
  const [horizonData, setHorizonData] = useState([]);
  const [faultData, setFaultData] = useState([]);
  const [numLayers, setNumLayers] = useState(5);
  const [gridData, setGridData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualization, setVisualization] = useState(true);
  const [viewMode, setViewMode] = useState('blocks'); // 'points', 'blocks', 'wireframe'
  const [showFaults, setShowFaults] = useState(true);
  const [showWells, setShowWells] = useState(true);
  const canvasRef = useRef(null);
  const [camera, setCamera] = useState({
    rotX: -20,
    rotY: 45,
    rotZ: 0,
    zoom: 1,
    panX: 0,
    panY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  console.log('State initialized, setting up component...');

  // File upload handlers
  const parseCSVData = (csvText, type) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const points = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 3) {
        const point = {};
        
        // Map common column names to standard format
        headers.forEach((header, idx) => {
          const value = parseFloat(values[idx]);
          if (!isNaN(value)) {
            if (header.includes('x') || header.includes('easting')) point.x = value;
            else if (header.includes('y') || header.includes('northing')) point.y = value;
            else if (header.includes('z') || header.includes('depth') || header.includes('elevation')) point.z = value;
            else if (header.includes('seg') || header.includes('fault')) point.segId = Math.floor(value);
          }
        });
        
        if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
          points.push(point);
        }
      }
    }
    
    return points;
  };

  const handleFileUpload = (event, dataType) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const points = parseCSVData(text, dataType);
        
        if (points.length === 0) {
          alert('No valid data points found. Please check your file format.');
          return;
        }
        
        if (dataType === 'horizon') {
          const newHorizon = {
            name: file.name.replace('.csv', ''),
            points: points,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
          };
          setHorizonData(prev => [...prev, newHorizon]);
        } else if (dataType === 'fault') {
          const newFault = {
            name: file.name.replace('.csv', ''),
            points: points,
            color: `hsl(${Math.random() * 360}, 80%, 50%)`
          };
          setFaultData(prev => [...prev, newFault]);
        }
      } catch (error) {
        alert('Error parsing file. Please ensure it\'s a valid CSV with X, Y, Z columns.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Enhanced sample data generators with more realistic geological features
  const generateRealisticHorizons = () => {
    const topHorizon = [];
    const bottomHorizon = [];
    
    // Create more realistic geological surfaces with structural features
    for (let x = 0; x <= 20; x++) {
      for (let y = 0; y <= 20; y++) {
        const realX = x * 50;
        const realY = y * 50;
        
        // Top surface: anticlinal structure with gentle dip
        const topZ = 2000 + 
          Math.sin(x * 0.2) * 150 + 
          Math.cos(y * 0.15) * 100 +
          Math.sin(x * 0.1) * Math.cos(y * 0.1) * 80 +
          (Math.random() - 0.5) * 20; // Add noise
        
        // Bottom surface: deeper with more variation
        const bottomZ = topZ - 400 - 
          Math.sin(x * 0.25) * 120 - 
          Math.cos(y * 0.18) * 80 -
          Math.sin(x * 0.12) * Math.sin(y * 0.08) * 60 +
          (Math.random() - 0.5) * 30;
        
        topHorizon.push({ x: realX, y: realY, z: topZ });
        bottomHorizon.push({ x: realX, y: realY, z: bottomZ });
      }
    }
    
    setHorizonData([
      { name: 'Top Formation', points: topHorizon, color: '#4ade80' },
      { name: 'Base Formation', points: bottomHorizon, color: '#f59e0b' }
    ]);
  };

  const generateRealisticFaults = () => {
    const fault1Points = [];
    const fault2Points = [];
    
    // Main fault - listric fault with curved geometry
    for (let y = 0; y <= 1000; y += 50) {
      for (let z = 1400; z <= 2200; z += 40) {
        const dip = 70 + Math.sin(z * 0.002) * 15; // Variable dip
        const x = 500 + (z - 1400) * Math.tan(dip * Math.PI / 180) * 0.3;
        fault1Points.push({ x, y, z, segId: 1 });
      }
    }
    
    // Secondary fault - normal fault
    for (let x = 200; x <= 800; x += 50) {
      for (let z = 1500; z <= 2100; z += 40) {
        const y = 600 + Math.sin(x * 0.01) * 50;
        fault2Points.push({ x, y, z, segId: 2 });
      }
    }
    
    setFaultData([
      { name: 'Main Fault', points: fault1Points, color: '#ef4444' },
      { name: 'Secondary Fault', points: fault2Points, color: '#8b5cf6' }
    ]);
  };

  // Advanced interpolation with geological constraints
  const geologicalInterpolation = (x, y, points, method = 'kriging') => {
    if (points.length === 0) return 0;
    
    // Find nearest points for local interpolation
    const nearestPoints = points
      .map(p => ({
        ...p,
        distance: Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Math.min(8, points.length));
    
    if (nearestPoints.length === 0) return 0;
    
    // Inverse distance weighting with geological constraints
    let weightSum = 0;
    let valueSum = 0;
    
    nearestPoints.forEach(point => {
      const distance = Math.max(point.distance, 1);
      const weight = 1 / (distance ** 2);
      weightSum += weight;
      valueSum += point.z * weight;
    });
    
    return weightSum > 0 ? valueSum / weightSum : nearestPoints[0].z;
  };

  // Enhanced fault influence calculation
  const calculateAdvancedFaultInfluence = (x, y, z, faults, influenceRadius = 100) => {
    let totalInfluence = 0;
    let dominantFault = 0;
    let maxInfluence = 0;
    
    faults.forEach(fault => {
      fault.points.forEach(point => {
        const distance = Math.sqrt(
          (x - point.x) ** 2 + 
          (y - point.y) ** 2 + 
          (z - point.z) ** 2
        );
        
        if (distance < influenceRadius) {
          const influence = Math.exp(-distance / (influenceRadius * 0.3));
          totalInfluence += influence;
          
          if (influence > maxInfluence) {
            maxInfluence = influence;
            dominantFault = point.segId || 1;
          }
        }
      });
    });
    
    return {
      influence: Math.min(totalInfluence, 1),
      faultFlag: maxInfluence > 0.1 ? dominantFault : 0,
      displacement: totalInfluence * 50 * (Math.random() - 0.5)
    };
  };

  // Main grid generation with geological realism
  const generateGeologicalGrid = async () => {
    if (horizonData.length < 2) {
      alert('Please provide at least two horizon surfaces (top and bottom)');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const topHorizon = horizonData[0].points;
      const bottomHorizon = horizonData[1].points;
      const grid = [];
      
      // Calculate bounds
      const allPoints = [...topHorizon, ...bottomHorizon];
      const bounds = {
        xMin: Math.min(...allPoints.map(p => p.x)),
        xMax: Math.max(...allPoints.map(p => p.x)),
        yMin: Math.min(...allPoints.map(p => p.y)),
        yMax: Math.max(...allPoints.map(p => p.y)),
        zMin: Math.min(...allPoints.map(p => p.z)),
        zMax: Math.max(...allPoints.map(p => p.z))
      };
      
      const gridSpacing = Math.min(
        (bounds.xMax - bounds.xMin) / 50,
        (bounds.yMax - bounds.yMin) / 50
      );
      
      let totalVolume = 0;
      let pointCount = 0;
      
      // Progress tracking
      const totalSteps = Math.ceil((bounds.xMax - bounds.xMin) / gridSpacing) * 
                        Math.ceil((bounds.yMax - bounds.yMin) / gridSpacing);
      let currentStep = 0;
      
      for (let x = bounds.xMin; x <= bounds.xMax; x += gridSpacing) {
        for (let y = bounds.yMin; y <= bounds.yMax; y += gridSpacing) {
          currentStep++;
          
          // Update progress every 100 steps
          if (currentStep % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Get surface elevations using geological interpolation
          const topZ = geologicalInterpolation(x, y, topHorizon);
          const bottomZ = geologicalInterpolation(x, y, bottomHorizon);
          
          if (topZ <= bottomZ) continue; // Skip invalid geology
          
          const thickness = topZ - bottomZ;
          const layerThickness = thickness / (numLayers + 1);
          
          // Generate proportional layers
          for (let layerIdx = 0; layerIdx <= numLayers + 1; layerIdx++) {
            const layerRatio = layerIdx / (numLayers + 1);
            let z = bottomZ + layerRatio * thickness;
            
            // Apply structural deformation
            const structuralDip = Math.sin(x * 0.001) * Math.cos(y * 0.001) * 10;
            z += structuralDip * layerRatio;
            
            // Calculate fault influence
            const faultInfo = calculateAdvancedFaultInfluence(x, y, z, faultData);
            z += faultInfo.displacement;
            
            // Calculate geological properties
            const cellVolume = gridSpacing * gridSpacing * layerThickness;
            const porosity = 0.15 + Math.random() * 0.15; // 15-30%
            const permeability = Math.pow(10, (Math.random() * 3) - 1); // 0.1-100 mD
            
            // Well intersection probability based on structural highs
            const isWellLocation = (Math.random() < 0.02 && 
                                  z > bottomZ + thickness * 0.7) ? 1 : 0;
            
            totalVolume += cellVolume;
            pointCount++;
            
            grid.push({
              x: Math.round(x * 100) / 100,
              y: Math.round(y * 100) / 100,
              z: Math.round(z * 100) / 100,
              layer: layerIdx,
              bulkVolume: Math.round(cellVolume * 100) / 100,
              faultFlag: faultInfo.faultFlag,
              wellPath: isWellLocation,
              porosity: Math.round(porosity * 1000) / 1000,
              permeability: Math.round(permeability * 100) / 100,
              structuralDip: Math.round(structuralDip * 10) / 10
            });
          }
        }
      }
      
      setGridData({
        points: grid,
        totalVolume: Math.round(totalVolume),
        layerCount: numLayers + 2,
        pointCount: pointCount,
        bounds: bounds
      });
      
    } catch (error) {
      console.error('Grid generation failed:', error);
      alert('Grid generation failed. Please check your input data.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Advanced 3D rendering with realistic geological visualization
  const renderAdvanced3D = useCallback(() => {
    if (!gridData || !canvasRef.current || !visualization) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear and set background
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2 + camera.panX;
    const centerY = height / 2 + camera.panY;
    const scale = camera.zoom * Math.min(width, height) / 1000;
    
    // Rotation matrices
    const cosX = Math.cos(camera.rotX * Math.PI / 180);
    const sinX = Math.sin(camera.rotX * Math.PI / 180);
    const cosY = Math.cos(camera.rotY * Math.PI / 180);
    const sinY = Math.sin(camera.rotY * Math.PI / 180);
    const cosZ = Math.cos(camera.rotZ * Math.PI / 180);
    const sinZ = Math.sin(camera.rotZ * Math.PI / 180);
    
    const project3D = (x, y, z) => {
      // Center the model
      const bounds = gridData.bounds;
      const cx = (bounds.xMax + bounds.xMin) / 2;
      const cy = (bounds.yMax + bounds.yMin) / 2;
      const cz = (bounds.zMax + bounds.zMin) / 2;
      
      x -= cx; y -= cy; z -= cz;
      
      // Apply rotations (X, Y, Z order)
      let x1 = x;
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      
      let x2 = x1 * cosY + z1 * sinY;
      let y2 = y1;
      let z2 = -x1 * sinY + z1 * cosY;
      
      let x3 = x2 * cosZ - y2 * sinZ;
      let y3 = x2 * sinZ + y2 * cosZ;
      let z3 = z2;
      
      return {
        x: centerX + x3 * scale,
        y: centerY + y3 * scale,
        z: z3
      };
    };
    
    // Prepare points for rendering
    const renderPoints = gridData.points.map(point => ({
      ...point,
      projected: project3D(point.x, point.y, point.z)
    })).filter(p => 
      p.projected.x >= -50 && p.projected.x < width + 50 &&
      p.projected.y >= -50 && p.projected.y < height + 50
    ).sort((a, b) => b.projected.z - a.projected.z);
    
    // Render based on view mode
    if (viewMode === 'blocks') {
      renderBlocks(ctx, renderPoints);
    } else if (viewMode === 'wireframe') {
      renderWireframe(ctx, renderPoints);
    } else {
      renderPoints3D(ctx, renderPoints);
    }
    
    // Render coordinate system
    renderCoordinateSystem(ctx, project3D, centerX, centerY, scale);
    
  }, [gridData, camera, visualization, viewMode, showFaults, showWells]);

  const renderBlocks = (ctx, points) => {
    const blockSize = Math.max(2, camera.zoom * 4);
    
    points.forEach(point => {
      const { projected } = point;
      
      // Skip if outside visible area
      if (projected.z < -1000) return;
      
      let color, alpha = 0.7;
      
      // Color based on geological properties
      if (!showFaults && point.faultFlag > 0) return;
      if (!showWells && point.wellPath) return;
      
      if (point.wellPath && showWells) {
        color = '#00ff00';
        alpha = 1;
      } else if (point.faultFlag > 0 && showFaults) {
        const hue = (point.faultFlag * 60) % 360;
        color = `hsl(${hue}, 80%, 60%)`;
        alpha = 0.9;
      } else {
        // Color by depth/layer with geological realism
        const depthRatio = point.layer / (gridData.layerCount - 1);
        const hue = 240 - depthRatio * 60; // Blue to yellow
        const saturation = 70 + point.porosity * 30;
        const lightness = 40 + depthRatio * 30;
        color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      }
      
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      
      // 3D block effect
      const size = blockSize * (1 + projected.z * 0.0001);
      
      // Main block
      ctx.fillRect(
        projected.x - size/2, 
        projected.y - size/2, 
        size, 
        size
      );
      
      // Highlight for 3D effect
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
      ctx.fillRect(
        projected.x - size/2, 
        projected.y - size/2, 
        size/3, 
        size/3
      );
    });
    
    ctx.globalAlpha = 1;
  };

  const renderWireframe = (ctx, points) => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    
    // Group points by layer for wireframe connections
    const layerGroups = {};
    points.forEach(point => {
      if (!layerGroups[point.layer]) layerGroups[point.layer] = [];
      layerGroups[point.layer].push(point);
    });
    
    // Draw connections within layers
    Object.values(layerGroups).forEach(layerPoints => {
      for (let i = 0; i < layerPoints.length - 1; i++) {
        const p1 = layerPoints[i].projected;
        const p2 = layerPoints[i + 1].projected;
        
        const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (distance < 50) { // Only connect nearby points
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    
    ctx.globalAlpha = 1;
  };

  const renderPoints3D = (ctx, points) => {
    points.forEach(point => {
      const { projected } = point;
      const size = Math.max(1, 3 * (1 + projected.z * 0.0001));
      
      let color;
      if (point.wellPath && showWells) {
        color = '#00ff00';
      } else if (point.faultFlag > 0 && showFaults) {
        color = '#ef4444';
      } else {
        const depthRatio = point.layer / (gridData.layerCount - 1);
        const hue = 240 - depthRatio * 60;
        color = `hsl(${hue}, 70%, 60%)`;
      }
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  };

  const renderCoordinateSystem = (ctx, project3D, centerX, centerY, scale) => {
    const axisLength = 100;
    const origin = project3D(0, 0, 0);
    const xAxis = project3D(axisLength, 0, 0);
    const yAxis = project3D(0, axisLength, 0);
    const zAxis = project3D(0, 0, axisLength);
    
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    
    // X axis - Red
    ctx.strokeStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(xAxis.x, xAxis.y);
    ctx.stroke();
    
    // Y axis - Green
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(yAxis.x, yAxis.y);
    ctx.stroke();
    
    // Z axis - Blue
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(zAxis.x, zAxis.y);
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  };

  // Mouse interaction handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setLastMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentMouse = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const deltaX = currentMouse.x - lastMouse.x;
    const deltaY = currentMouse.y - lastMouse.y;
    
    if (e.shiftKey) {
      // Pan mode
      setCamera(prev => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY
      }));
    } else {
      // Rotation mode
      setCamera(prev => ({
        ...prev,
        rotY: prev.rotY + deltaX * 0.5,
        rotX: Math.max(-90, Math.min(90, prev.rotX - deltaY * 0.5))
      }));
    }
    
    setLastMouse(currentMouse);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * zoomFactor))
    }));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (visualization && gridData) {
        renderAdvanced3D();
      }
    }, 50); // 20 FPS
    
    return () => clearInterval(timer);
  }, [renderAdvanced3D]);

  // Enhanced export with geological properties
  const exportEnhancedGrid = () => {
    if (!gridData) {
      alert('No grid data to export');
      return;
    }
    
    const headers = [
      'X', 'Y', 'Z', 'Layer', 'BulkVolume', 'FaultFlag', 'WellPath',
      'Porosity', 'Permeability', 'StructuralDip'
    ];
    
    const csvContent = [
      headers.join(','),
      ...gridData.points.map(point => 
        `${point.x},${point.y},${point.z},${point.layer},${point.bulkVolume},${point.faultFlag},${point.wellPath},${point.porosity || 0},${point.permeability || 0},${point.structuralDip || 0}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geological_3d_grid_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">Advanced 3D Geological Grid Generator</h1>
          <p className="text-slate-300">Professional tool for geological subsurface modeling with realistic fault handling</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* Left Panel - Data Input */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* File Upload Section */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-green-400 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Data Upload
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Horizon Surfaces (CSV)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'horizon')}
                    className="w-full text-sm bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  />
                  <p className="text-xs text-slate-400 mt-1">Format: X,Y,Z columns</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Fault Surfaces (CSV)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'fault')}
                    className="w-full text-sm bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  />
                  <p className="text-xs text-slate-400 mt-1">Format: X,Y,Z,SegId columns</p>
                </div>
              </div>
            </div>

            {/* Sample Data Section */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Sample Data</h3>
              <div className="space-y-2">
                <button
                  onClick={generateRealisticHorizons}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm flex items-center justify-center"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Generate Realistic Horizons
                </button>
                
                <button
                  onClick={generateRealisticFaults}
                  className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm flex items-center justify-center"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Fault System
                </button>
              </div>
            </div>

            {/* Parameters Section */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-orange-400 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Parameters
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Layers</label>
                  <input
                    type="number"
                    value={numLayers}
                    onChange={(e) => setNumLayers(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                    min="1"
                    max="50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">View Mode</label>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                  >
                    <option value="blocks">3D Blocks</option>
                    <option value="points">Point Cloud</option>
                    <option value="wireframe">Wireframe</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showFaults}
                      onChange={(e) => setShowFaults(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Show Faults</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showWells}
                      onChange={(e) => setShowWells(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Show Wells</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Summary */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-cyan-400 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                Data Summary
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Horizons:</span>
                  <span className="font-mono">{horizonData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Faults:</span>
                  <span className="font-mono">{faultData.length}</span>
                </div>
                {gridData && (
                  <>
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span>Grid Points:</span>
                        <span className="font-mono">{gridData.pointCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Volume:</span>
                        <span className="font-mono">{(gridData.totalVolume/1e6).toFixed(1)}M m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Layers:</span>
                        <span className="font-mono">{gridData.layerCount}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="space-y-2">
                <button
                  onClick={generateGeologicalGrid}
                  disabled={isGenerating || horizonData.length < 2}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-4 py-2 rounded flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating Grid...' : 'Generate 3D Grid'}
                </button>
                
                {gridData && (
                  <button
                    onClick={exportEnhancedGrid}
                    className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Grid Data
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Visualization Panel */}
          <div className="xl:col-span-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-green-400">Advanced 3D Geological Visualization</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCamera({ rotX: -20, rotY: 45, rotZ: 0, zoom: 1, panX: 0, panY: 0 })}
                    className="bg-slate-600 hover:bg-slate-700 px-3 py-1 rounded flex items-center text-sm"
                  >
                    <RotateCw className="w-4 h-4 mr-1" />
                    Reset View
                  </button>
                  <button
                    onClick={() => setVisualization(!visualization)}
                    className="bg-slate-600 hover:bg-slate-700 px-3 py-1 rounded flex items-center text-sm"
                  >
                    {visualization ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="ml-1">{visualization ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </div>
              
              {visualization && (
                <div className="space-y-4">
                  {/* Camera Controls */}
                  <div className="bg-slate-700 rounded p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <label className="block mb-1">Rotation X: {camera.rotX.toFixed(0)}°</label>
                        <input
                          type="range"
                          min="-90"
                          max="90"
                          value={camera.rotX}
                          onChange={(e) => setCamera(prev => ({...prev, rotX: parseFloat(e.target.value)}))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Rotation Y: {camera.rotY.toFixed(0)}°</label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={camera.rotY}
                          onChange={(e) => setCamera(prev => ({...prev, rotY: parseFloat(e.target.value)}))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-1">Zoom: {camera.zoom.toFixed(1)}x</label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={camera.zoom}
                          onChange={(e) => setCamera(prev => ({...prev, zoom: parseFloat(e.target.value)}))}
                          className="w-full"
                        />
                      </div>
                      <div className="text-xs text-slate-400 pt-2">
                        <div>• Drag to rotate</div>
                        <div>• Shift+drag to pan</div>
                        <div>• Scroll to zoom</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 3D Canvas */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={1200}
                      height={800}
                      className="w-full border border-slate-600 rounded bg-slate-900 cursor-move"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onWheel={handleWheel}
                      style={{ aspectRatio: '3/2' }}
                    />
                    
                    {/* Loading Overlay */}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center rounded">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <div className="text-sm text-slate-300">Generating geological grid...</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Legend */}
                    {gridData && (
                      <div className="absolute top-4 left-4 bg-slate-800 bg-opacity-90 rounded p-3 text-sm">
                        <div className="font-semibold mb-2">Legend</div>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                            <span>Shallow Layers</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
                            <span>Deep Layers</span>
                          </div>
                          {showFaults && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
                              <span>Fault Zones</span>
                            </div>
                          )}
                          {showWells && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
                              <span>Well Locations</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Coordinate System Info */}
                    <div className="absolute bottom-4 right-4 bg-slate-800 bg-opacity-90 rounded p-2 text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center"><span className="w-2 h-0.5 bg-red-400 mr-1"></span>X</span>
                        <span className="flex items-center"><span className="w-2 h-0.5 bg-green-400 mr-1"></span>Y</span>
                        <span className="flex items-center"><span className="w-0.5 h-2 bg-blue-400 mr-1"></span>Z</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!visualization && (
                <div className="h-96 flex items-center justify-center text-slate-500 border border-slate-600 rounded">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div>3D Visualization Hidden</div>
                    <div className="text-sm">Click "Show" to enable visualization</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Geological Features */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center">
              <Box className="w-5 h-5 mr-2" />
              Geological Features
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-400 mb-2">Horizon Processing</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Advanced geological interpolation</li>
                    <li>• Structural dip calculation</li>
                    <li>• Iso-proportionate layer generation</li>
                    <li>• Geological constraint honoring</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-400 mb-2">Fault Modeling</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Multi-fault system support</li>
                    <li>• Distance-based influence zones</li>
                    <li>• Realistic displacement modeling</li>
                    <li>• Smooth fault zone tapering</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-purple-400 flex items-center">
              <Grid className="w-5 h-5 mr-2" />
              Technical Specifications
            </h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-orange-400 mb-2">Input Support</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• CSV file import</li>
                    <li>• Multiple horizon surfaces</li>
                    <li>• Complex fault geometries</li>
                    <li>• Well path integration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-orange-400 mb-2">Output Features</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Complete grid with properties</li>
                    <li>• Porosity and permeability</li>
                    <li>• Structural attributes</li>
                    <li>• Volume calculations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-cyan-400 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Usage Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-green-400 mb-2">1. Data Preparation</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Prepare horizon CSV files with X, Y, Z coordinates</li>
                <li>• Include fault data with X, Y, Z, SegId columns</li>
                <li>• Ensure consistent coordinate system</li>
                <li>• Use sample data generators for testing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">2. Grid Generation</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Upload or generate horizon surfaces</li>
                <li>• Set desired number of layers</li>
                <li>• Configure visualization preferences</li>
                <li>• Click "Generate 3D Grid" to process</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">3. Analysis & Export</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Explore 3D visualization with controls</li>
                <li>• Toggle different view modes</li>
                <li>• Export complete grid data as CSV</li>
                <li>• Use data for reservoir modeling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Geological3DGridTool;
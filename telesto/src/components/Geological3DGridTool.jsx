import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Download, Play, Settings, Eye, EyeOff, RotateCw, Zap, FileText, Layers, Box, Grid, Info, Plus, Minus, ChevronDown, ChevronRight, Palette, Combine, Move3D, RotateCcw, ZoomIn, ZoomOut, Home, Save, Trash2, Copy, RefreshCw } from 'lucide-react';

const Geological3DGridTool = () => {
  const [grids, setGrids] = useState([]);
  const [activeGridId, setActiveGridId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [horizonData, setHorizonData] = useState([]);
  const [faultData, setFaultData] = useState([]);
  const [numLayers, setNumLayers] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualization, setVisualization] = useState(true);
  const [viewMode, setViewMode] = useState('blocks');
  const [showFaults, setShowFaults] = useState(true);
  const [showWells, setShowWells] = useState(true);
  const [colorScheme, setColorScheme] = useState('depth');
  const [pointColors, setPointColors] = useState({
    shallow: '#4ade80',
    deep: '#f59e0b',
    fault: '#ef4444',
    well: '#00ff00'
  });
  const canvasRef = useRef(null);
  const gizmoRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [camera, setCamera] = useState({
    rotX: -20,
    rotY: 45,
    rotZ: 0,
    zoom: 1,
    panX: 0,
    panY: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'rotate', 'pan', 'gizmo'
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [selectedGrids, setSelectedGrids] = useState(new Set());
  const [mergeDirection, setMergeDirection] = useState('vertical'); // 'vertical', 'horizontal'

  // New state for slicing
  const [sliceEnabled, setSliceEnabled] = useState({ x: false, y: false, z: false });
  const [slicePosition, setSlicePosition] = useState({ x: 0.5, y: 0.5, z: 0.5 }); // Normalized 0-1

  // Get current active grid
  const activeGrid = useMemo(() => {
    return grids.find(g => g.id === activeGridId);
  }, [grids, activeGridId]);

  // Enhanced file parsing with better error handling
  const parseCSVData = useCallback((csvText, type) => {
    try {
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) throw new Error('File must contain headers and at least one data row');
      
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const points = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 3) continue;
        
        const point = {};
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
      
      return points;
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }, []);

  // Enhanced file upload with progress
  const handleFileUpload = useCallback((event, dataType) => {
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
        
        const newData = {
          name: file.name.replace('.csv', ''),
          points: points,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`
        };
        
        if (dataType === 'horizon') {
          setHorizonData(prev => [...prev, newData]);
        } else if (dataType === 'fault') {
          setFaultData(prev => [...prev, newData]);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    };
    
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };
    
    reader.readAsText(file);
    event.target.value = '';
  }, [parseCSVData]);

  // Enhanced realistic data generators
  const generateRealisticHorizons = useCallback(() => {
    const topHorizon = [];
    const bottomHorizon = [];
    
    for (let x = 0; x <= 25; x++) {
      for (let y = 0; y <= 25; y++) {
        const realX = x * 40;
        const realY = y * 40;
        
        const topZ = 2000 + 
          Math.sin(x * 0.15) * 180 + 
          Math.cos(y * 0.12) * 120 +
          Math.sin(x * 0.08) * Math.cos(y * 0.06) * 100 +
          (Math.random() - 0.5) * 25;
        
        const bottomZ = topZ - 500 - 
          Math.sin(x * 0.2) * 150 - 
          Math.cos(y * 0.16) * 90 +
          (Math.random() - 0.5) * 35;
        
        topHorizon.push({ x: realX, y: realY, z: topZ });
        bottomHorizon.push({ x: realX, y: realY, z: bottomZ });
      }
    }
    
    setHorizonData([
      { name: 'Top Formation', points: topHorizon, color: pointColors.shallow },
      { name: 'Base Formation', points: bottomHorizon, color: pointColors.deep }
    ]);
  }, [pointColors]);

  const generateRealisticFaults = useCallback(() => {
    const fault1Points = [];
    const fault2Points = [];
    
    for (let y = 0; y <= 1000; y += 35) {
      for (let z = 1400; z <= 2300; z += 30) {
        const dip = 65 + Math.sin(z * 0.0015) * 20;
        const x = 450 + (z - 1400) * Math.tan(dip * Math.PI / 180) * 0.25;
        fault1Points.push({ x, y, z, segId: 1 });
      }
    }
    
    for (let x = 150; x <= 850; x += 40) {
      for (let z = 1500; z <= 2200; z += 35) {
        const y = 650 + Math.sin(x * 0.008) * 80;
        fault2Points.push({ x, y, z, segId: 2 });
      }
    }
    
    setFaultData([
      { name: 'Main Fault', points: fault1Points, color: pointColors.fault },
      { name: 'Secondary Fault', points: fault2Points, color: '#8b5cf6' }
    ]);
  }, [pointColors]);

  // Advanced interpolation with performance optimization
  const geologicalInterpolation = useCallback((x, y, points, method = 'idw') => {
    if (points.length === 0) return 0;
    
    const nearestPoints = points
      .map(p => ({
        ...p,
        distance: Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, Math.min(6, points.length));
    
    if (nearestPoints.length === 0) return 0;
    if (nearestPoints[0].distance < 1) return nearestPoints[0].z;
    
    let weightSum = 0;
    let valueSum = 0;
    
    nearestPoints.forEach(point => {
      const weight = 1 / Math.pow(Math.max(point.distance, 0.1), 2);
      weightSum += weight;
      valueSum += point.z * weight;
    });
    
    return weightSum > 0 ? valueSum / weightSum : nearestPoints[0].z;
  }, []);

  // Enhanced fault influence calculation
  const calculateAdvancedFaultInfluence = useCallback((x, y, z, faults, influenceRadius = 120) => {
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
          const influence = Math.exp(-distance / (influenceRadius * 0.25));
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
      faultFlag: maxInfluence > 0.08 ? dominantFault : 0,
      displacement: totalInfluence * 60 * (Math.random() - 0.5)
    };
  }, []);

  // Optimized grid generation with Web Workers concept
  const generateGeologicalGrid = useCallback(async () => {
    if (horizonData.length < 2) {
      alert('Please provide at least two horizon surfaces (top and bottom)');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const topHorizon = horizonData[0].points;
      const bottomHorizon = horizonData[1].points;
      const grid = [];
      
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
        (bounds.xMax - bounds.xMin) / 45,
        (bounds.yMax - bounds.yMin) / 45
      );
      
      let totalVolume = 0;
      let pointCount = 0;
      
      const totalSteps = Math.ceil((bounds.xMax - bounds.xMin) / gridSpacing) * 
                        Math.ceil((bounds.yMax - bounds.yMin) / gridSpacing);
      let currentStep = 0;
      
      for (let x = bounds.xMin; x <= bounds.xMax; x += gridSpacing) {
        for (let y = bounds.yMin; y <= bounds.yMax; y += gridSpacing) {
          currentStep++;
          
          if (currentStep % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          const topZ = geologicalInterpolation(x, y, topHorizon);
          const bottomZ = geologicalInterpolation(x, y, bottomHorizon);
          
          if (topZ <= bottomZ) continue;
          
          const thickness = topZ - bottomZ;
          const layerThickness = thickness / (numLayers + 1);
          
          for (let layerIdx = 0; layerIdx <= numLayers + 1; layerIdx++) {
            const layerRatio = layerIdx / (numLayers + 1);
            let z = bottomZ + layerRatio * thickness;
            
            const structuralDip = Math.sin(x * 0.0008) * Math.cos(y * 0.0006) * 12;
            z += structuralDip * layerRatio;
            
            const faultInfo = calculateAdvancedFaultInfluence(x, y, z, faultData);
            z += faultInfo.displacement;
            
            const cellVolume = gridSpacing * gridSpacing * layerThickness;
            const porosity = 0.12 + Math.random() * 0.18;
            const permeability = Math.pow(10, (Math.random() * 3.5) - 0.5);
            
            const isWellLocation = (Math.random() < 0.015 && 
                                  z > bottomZ + thickness * 0.75) ? 1 : 0;
            
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
      
      const newGrid = {
        id: Date.now().toString(),
        name: `Grid_${grids.length + 1}`,
        points: grid,
        totalVolume: Math.round(totalVolume),
        layerCount: numLayers + 2,
        pointCount: pointCount,
        bounds: bounds,
        timestamp: new Date(),
        horizons: horizonData.map(h => h.name).join(', '),
        faults: faultData.map(f => f.name).join(', ')
      };
      
      setGrids(prev => [...prev, newGrid]);
      setActiveGridId(newGrid.id);
      
    } catch (error) {
      console.error('Grid generation failed:', error);
      alert('Grid generation failed. Please check your input data.');
    } finally {
      setIsGenerating(false);
    }
  }, [horizonData, faultData, numLayers, geologicalInterpolation, calculateAdvancedFaultInfluence, grids.length]);

  // Enhanced compatibility checker
  const canCombineGrids = useCallback((gridIds) => {
    if (gridIds.length < 2) return { canCombine: false, reason: 'Need at least 2 grids', details: [] };
    
    const selectedGridData = gridIds.map(id => grids.find(g => g.id === id));
    
    const details = [];
    
    // Check spatial bounds compatibility
    const firstBounds = selectedGridData[0].bounds;
    const tolerancePercent = 0.1; // 10% tolerance
    let boundsCompatible = true;
    
    for (let i = 1; i < selectedGridData.length; i++) {
      const bounds = selectedGridData[i].bounds;
      const xTolerance = (firstBounds.xMax - firstBounds.xMin) * tolerancePercent;
      const yTolerance = (firstBounds.yMax - firstBounds.yMin) * tolerancePercent;
      const zTolerance = (firstBounds.zMax - firstBounds.zMin) * tolerancePercent;
      
      const boundDiffs = {
        xDiff: Math.max(
          Math.abs(bounds.xMin - firstBounds.xMin),
          Math.abs(bounds.xMax - firstBounds.xMax)
        ),
        yDiff: Math.max(
          Math.abs(bounds.yMin - firstBounds.yMin),
          Math.abs(bounds.yMax - firstBounds.yMax)
        ),
        zDiff: Math.max(
          Math.abs(bounds.zMin - firstBounds.zMin),
          Math.abs(bounds.zMax - firstBounds.zMax)
        )
      };
      
      if (boundDiffs.xDiff > xTolerance ||
          boundDiffs.yDiff > yTolerance ||
          boundDiffs.zDiff > zTolerance) {
        boundsCompatible = false;
        details.push(`Grid "${selectedGridData[i].name}" bounds mismatch: X diff ${boundDiffs.xDiff.toFixed(0)} (tol ${xTolerance.toFixed(0)}), Y diff ${boundDiffs.yDiff.toFixed(0)} (tol ${yTolerance.toFixed(0)}), Z diff ${boundDiffs.zDiff.toFixed(0)} (tol ${zTolerance.toFixed(0)})`);
      }
    }
    
    // Check layer count similarity
    const layerCounts = selectedGridData.map(g => g.layerCount);
    const maxLayerDiff = Math.max(...layerCounts) - Math.min(...layerCounts);
    if (maxLayerDiff > 5) {
      details.push(`Layer count variation too high: ${maxLayerDiff} (max diff allowed: 5)`);
    }
    
    // Check point count similarity
    const pointCounts = selectedGridData.map(g => g.pointCount);
    const avgPoints = pointCounts.reduce((a, b) => a + b, 0) / pointCounts.length;
    const pointVariance = pointCounts.reduce((sum, p) => sum + Math.abs(p - avgPoints) / avgPoints, 0) / pointCounts.length;
    if (pointVariance > 0.3) {
      details.push(`Point count variance too high: ${(pointVariance * 100).toFixed(0)}% (max 30%)`);
    }
    
    // Overall compatibility
    const canCombine = boundsCompatible && maxLayerDiff <= 5 && pointVariance <= 0.3;
    
    return { 
      canCombine,
      reason: canCombine ? 'Compatible grids' : 'Incompatible grids - see details',
      details,
      compatibilityScore: Math.round(100 - (details.length * 20)) // Simple score
    };
  }, [grids]);

  // Enhanced grid combination with directional merging
  const combineGrids = useCallback(() => {
    const gridIds = Array.from(selectedGrids);
    const compatibility = canCombineGrids(gridIds);
    
    if (!compatibility.canCombine) {
      alert(`Cannot combine grids: ${compatibility.reason}\n\nDetails:\n${compatibility.details.join('\n')}`);
      return;
    }
    
    const selectedGridData = gridIds.map(id => grids.find(g => g.id === id));
    const combinedPoints = [];
    let totalVolume = 0;
    let totalPointCount = 0;
    
    // Calculate offsets based on merge direction - seamless for horizontal
    const calculateOffset = (index, bounds, allBounds) => {
      const separation = 50; // Gap for vertical stacking only
      
      if (mergeDirection === 'vertical') {
        return { x: 0, y: 0, z: index * separation };
      } else if (mergeDirection === 'horizontal') {
        // Calculate seamless X offset - place next grid exactly at the end of previous
        let xOffset = 0;
        for (let i = 0; i < index; i++) {
          const prevBounds = allBounds[i];
          const prevWidth = prevBounds.xMax - prevBounds.xMin;
          xOffset += prevWidth; // No separation - seamless join
        }
        return { x: xOffset, y: 0, z: 0 };
      }
      return { x: 0, y: 0, z: 0 };
    };
    
    // Get all grid bounds for horizontal positioning
    const allGridBounds = selectedGridData.map(grid => grid.bounds);
    
    // Get reference bounds from first grid
    const referenceBounds = selectedGridData[0].bounds;
    
    selectedGridData.forEach((grid, index) => {
      const offset = calculateOffset(index, grid.bounds, allGridBounds);
      const colorShift = index * 120;
      
      grid.points.forEach(point => {
        const blendedPoint = {
          ...point,
          x: point.x + offset.x,
          y: point.y + offset.y,
          z: point.z + offset.z,
          originalGrid: grid.name,
          combinedLayer: point.layer + (index * (grid.layerCount + 1)),
          gridIndex: index,
          sourceColor: `hsl(${(colorShift + (point.layer * 30)) % 360}, 70%, 60%)`,
          combinedPorosity: point.porosity * (1 + index * 0.1),
          combinedPermeability: point.permeability * (1 + index * 0.15),
          mergeWeight: 1 / (index + 1)
        };
        
        combinedPoints.push(blendedPoint);
      });
      
      totalVolume += grid.totalVolume;
      totalPointCount += grid.pointCount;
    });
    
    // Sort points for better rendering
    if (mergeDirection === 'vertical') {
      combinedPoints.sort((a, b) => a.z - b.z);
    } else {
      combinedPoints.sort((a, b) => a.x - b.x);
    }
    
    // Calculate enhanced combined bounds
    const combinedBounds = {
      xMin: Math.min(...combinedPoints.map(p => p.x)),
      xMax: Math.max(...combinedPoints.map(p => p.x)),
      yMin: Math.min(...combinedPoints.map(p => p.y)),
      yMax: Math.max(...combinedPoints.map(p => p.y)),
      zMin: Math.min(...combinedPoints.map(p => p.z)),
      zMax: Math.max(...combinedPoints.map(p => p.z))
    };
    
    const directionLabel = mergeDirection === 'vertical' ? 'V' : 'H';
    const combinedGrid = {
      id: Date.now().toString(),
      name: `${directionLabel}-Merged_${selectedGridData.map(g => g.name.split('_')[1] || g.name).join('+')}`,
      points: combinedPoints,
      totalVolume: totalVolume,
      layerCount: Math.max(...selectedGridData.map(g => g.layerCount)) * selectedGridData.length,
      pointCount: totalPointCount,
      bounds: combinedBounds,
      timestamp: new Date(),
      isCombined: true,
      sourceGrids: selectedGridData.map(g => g.name),
      mergeType: mergeDirection,
      mergeStats: {
        avgPorosity: combinedPoints.reduce((sum, p) => sum + (p.porosity || 0), 0) / combinedPoints.length,
        avgPermeability: combinedPoints.reduce((sum, p) => sum + (p.permeability || 0), 0) / combinedPoints.length,
        faultDensity: combinedPoints.filter(p => p.faultFlag > 0).length / combinedPoints.length,
        wellDensity: combinedPoints.filter(p => p.wellPath > 0).length / combinedPoints.length
      }
    };
    
    setGrids(prev => [...prev, combinedGrid]);
    setActiveGridId(combinedGrid.id);
    setSelectedGrids(new Set());
    
    const directionText = mergeDirection === 'vertical' ? 'stacked vertically' : 'arranged horizontally';
    alert(`Successfully merged ${selectedGridData.length} grids ${directionText}!\nNew grid "${combinedGrid.name}" created with ${combinedGrid.pointCount.toLocaleString()} points.`);
    
  }, [selectedGrids, grids, canCombineGrids, mergeDirection]);

  // 3D Gizmo Component
  const render3DGizmo = useCallback((ctx, centerX, centerY, size = 60) => {
    const gizmoX = centerX - 150;
    const gizmoY = centerY + 120;
    
    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(gizmoX, gizmoY, size, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Calculate axis endpoints based on camera rotation
    const cosX = Math.cos(camera.rotX * Math.PI / 180);
    const sinX = Math.sin(camera.rotX * Math.PI / 180);
    const cosY = Math.cos(camera.rotY * Math.PI / 180);
    const sinY = Math.sin(camera.rotY * Math.PI / 180);
    
    // X axis (red)
    let xEnd = { x: size * 0.7, y: 0, z: 0 };
    let xRot = {
      x: xEnd.x * cosY + xEnd.z * sinY,
      y: xEnd.y * cosX - (xEnd.x * sinY - xEnd.z * cosY) * sinX,
      z: xEnd.y * sinX + (xEnd.x * sinY - xEnd.z * cosY) * cosX
    };
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gizmoX, gizmoY);
    ctx.lineTo(gizmoX + xRot.x, gizmoY + xRot.y);
    ctx.stroke();
    
    // Y axis (green)
    let yEnd = { x: 0, y: size * 0.7, z: 0 };
    let yRot = {
      x: yEnd.x * cosY + yEnd.z * sinY,
      y: yEnd.y * cosX - (yEnd.x * sinY - yEnd.z * cosY) * sinX,
      z: yEnd.y * sinX + (yEnd.x * sinY - yEnd.z * cosY) * cosX
    };
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gizmoX, gizmoY);
    ctx.lineTo(gizmoX + yRot.x, gizmoY + yRot.y);
    ctx.stroke();
    
    // Z axis (blue)
    let zEnd = { x: 0, y: 0, z: size * 0.7 };
    let zRot = {
      x: zEnd.x * cosY + zEnd.z * sinY,
      y: zEnd.y * cosX - (zEnd.x * sinY - zEnd.z * cosY) * sinX,
      z: zEnd.y * sinX + (zEnd.x * sinY - zEnd.z * cosY) * cosX
    };
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gizmoX, gizmoY);
    ctx.lineTo(gizmoX + zRot.x, gizmoY + zRot.y);
    ctx.stroke();
    
    // Store gizmo info for interaction
    return { center: { x: gizmoX, y: gizmoY }, radius: size };
  }, [camera]);

  // Enhanced 3D rendering with performance optimizations and slicing
  const renderAdvanced3D = useCallback(() => {
    if (!activeGrid || !canvasRef.current || !visualization) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear with gradient background
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const centerX = width / 2 + camera.panX;
    const centerY = height / 2 + camera.panY;
    const scale = camera.zoom * Math.min(width, height) / 800;
    
    // Rotation matrices
    const cosX = Math.cos(camera.rotX * Math.PI / 180);
    const sinX = Math.sin(camera.rotX * Math.PI / 180);
    const cosY = Math.cos(camera.rotY * Math.PI / 180);
    const sinY = Math.sin(camera.rotY * Math.PI / 180);
    
    const project3D = (x, y, z) => {
      const bounds = activeGrid.bounds;
      const cx = (bounds.xMax + bounds.xMin) / 2;
      const cy = (bounds.yMax + bounds.yMin) / 2;
      const cz = (bounds.zMax + bounds.zMin) / 2;
      
      x -= cx; y -= cy; z -= cz;
      
      // Apply rotations
      let x1 = x;
      let y1 = y * cosX - z * sinX;
      let z1 = y * sinX + z * cosX;
      
      let x2 = x1 * cosY + z1 * sinY;
      let y2 = y1;
      let z2 = -x1 * sinY + z1 * cosY;
      
      return {
        x: centerX + x2 * scale,
        y: centerY + y2 * scale,
        z: z2
      };
    };
    
    // Performance optimization: improved culling with larger margins and slicing
    const maxPoints = 15000; // Increased limit
    const bounds = activeGrid.bounds;
    const sliceXPos = bounds.xMin + (bounds.xMax - bounds.xMin) * slicePosition.x;
    const sliceYPos = bounds.yMin + (bounds.yMax - bounds.yMin) * slicePosition.y;
    const sliceZPos = bounds.zMin + (bounds.zMax - bounds.zMin) * slicePosition.z;
    const sliceThickness = Math.max((bounds.xMax - bounds.xMin) * 0.02, 10); // 2% of range or min 10

    let visiblePoints = activeGrid.points
      .filter(point => {
        // Apply slicing filters
        if (sliceEnabled.x && Math.abs(point.x - sliceXPos) > sliceThickness) return false;
        if (sliceEnabled.y && Math.abs(point.y - sliceYPos) > sliceThickness) return false;
        if (sliceEnabled.z && Math.abs(point.z - sliceZPos) > sliceThickness) return false;
        return true;
      })
      .map(point => ({
        ...point,
        projected: project3D(point.x, point.y, point.z)
      }))
      .filter(p => 
        p.projected.x >= -200 && p.projected.x < width + 200 &&
        p.projected.y >= -200 && p.projected.y < height + 200 &&
        p.projected.z > -5000 // Increased Z culling range
      )
      .sort((a, b) => b.projected.z - a.projected.z)
      .slice(0, maxPoints);
    
    // Render based on view mode
    if (viewMode === 'blocks') {
      renderOptimizedBlocks(ctx, visiblePoints);
    } else if (viewMode === 'wireframe') {
      renderOptimizedWireframe(ctx, visiblePoints);
    } else {
      renderOptimizedPoints(ctx, visiblePoints);
    }
    
    // Render 3D gizmo with proper canvas dimensions
    const gizmoInfo = render3DGizmo(ctx, width, height);
    gizmoRef.current = gizmoInfo;
    
  }, [activeGrid, camera, visualization, viewMode, showFaults, showWells, colorScheme, pointColors, render3DGizmo, sliceEnabled, slicePosition]);

  const getPointColor = useCallback((point) => {
    if (!showFaults && point.faultFlag > 0) return null;
    if (!showWells && point.wellPath) return null;
    
    // Special coloring for combined grids
    if (activeGrid?.isCombined && point.sourceColor) {
      if (point.wellPath && showWells) {
        return pointColors.well;
      } else if (point.faultFlag > 0 && showFaults) {
        const hue = (point.faultFlag * 60 + point.gridIndex * 120) % 360;
        return `hsl(${hue}, 80%, 60%)`;
      } else {
        // Use source grid color with some variation
        return point.sourceColor;
      }
    }
    
    if (point.wellPath && showWells) {
      return pointColors.well;
    } else if (point.faultFlag > 0 && showFaults) {
      const hue = (point.faultFlag * 60) % 360;
      return `hsl(${hue}, 80%, 60%)`;
    } else {
      switch (colorScheme) {
        case 'depth':
          const depthRatio = point.layer / (activeGrid.layerCount - 1);
          const hue = 240 - depthRatio * 60;
          const saturation = 70 + (point.porosity || 0.2) * 30;
          const lightness = 40 + depthRatio * 30;
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        case 'porosity':
          const porosityHue = 60 + (point.porosity || 0.2) * 240;
          return `hsl(${porosityHue}, 70%, 60%)`;
        case 'permeability':
          const permHue = Math.log10(point.permeability || 1) * 60 + 120;
          return `hsl(${Math.max(0, Math.min(360, permHue))}, 70%, 60%)`;
        default:
          return pointColors.shallow;
      }
    }
  }, [showFaults, showWells, pointColors, colorScheme, activeGrid]);

  const renderOptimizedBlocks = useCallback((ctx, points) => {
    const blockSize = Math.max(1, camera.zoom * 3);
    
    points.forEach(point => {
      const color = getPointColor(point);
      if (!color) return;
      
      const { projected } = point;
      const size = blockSize * (1 + projected.z * 0.00005);
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      
      ctx.fillRect(
        projected.x - size/2, 
        projected.y - size/2, 
        size, 
        size
      );
      
      // Add subtle highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(
        projected.x - size/2, 
        projected.y - size/2, 
        size/4, 
        size/4
      );
    });
    
    ctx.globalAlpha = 1;
  }, [camera.zoom, getPointColor]);

  const renderOptimizedWireframe = useCallback((ctx, points) => {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    
    const layerGroups = {};
    points.forEach(point => {
      if (!layerGroups[point.layer]) layerGroups[point.layer] = [];
      layerGroups[point.layer].push(point);
    });
    
    Object.values(layerGroups).forEach(layerPoints => {
      for (let i = 0; i < layerPoints.length - 1; i++) {
        const p1 = layerPoints[i].projected;
        const p2 = layerPoints[i + 1].projected;
        
        const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        if (distance < 40) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    
    ctx.globalAlpha = 1;
  }, []);

  const renderOptimizedPoints = useCallback((ctx, points) => {
    points.forEach(point => {
      const color = getPointColor(point);
      if (!color) return;
      
      const { projected } = point;
      const size = Math.max(1, 2 * (1 + projected.z * 0.00008));
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }, [getPointColor]);

  // Enhanced mouse interaction handlers
  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if clicking on gizmo
    if (gizmoRef.current) {
      const { center, radius } = gizmoRef.current;
      const distToGizmo = Math.sqrt(
        (mouseX - center.x) ** 2 + (mouseY - center.y) ** 2
      );
      
      if (distToGizmo <= radius) {
        setDragMode('gizmo');
        setIsDragging(true);
        setLastMouse({ x: mouseX, y: mouseY });
        return;
      }
    }
    
    setIsDragging(true);
    setDragMode(e.shiftKey ? 'pan' : 'rotate');
    setLastMouse({ x: mouseX, y: mouseY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const currentMouse = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const deltaX = currentMouse.x - lastMouse.x;
    const deltaY = currentMouse.y - lastMouse.y;
    
    switch (dragMode) {
      case 'pan':
        setCamera(prev => ({
          ...prev,
          panX: prev.panX + deltaX,
          panY: prev.panY + deltaY
        }));
        break;
      case 'rotate':
      case 'gizmo':
        setCamera(prev => ({
          ...prev,
          rotY: prev.rotY + deltaX * 0.8,
          rotX: Math.max(-90, Math.min(90, prev.rotX - deltaY * 0.8))
        }));
        break;
    }
    
    setLastMouse(currentMouse);
  }, [isDragging, dragMode, lastMouse]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.18;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(8, prev.zoom * zoomFactor))
    }));
  }, []);

  // Preset camera views
  const setCameraPreset = useCallback((preset) => {
    let newCamera;
    switch (preset) {
      case 'iso':
        newCamera = { rotX: -20, rotY: 45, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      case 'top':
        newCamera = { rotX: -90, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      case 'bottom':
        newCamera = { rotX: 90, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      case 'front':
        newCamera = { rotX: 0, rotY: 0, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      case 'side':
        newCamera = { rotX: 0, rotY: 90, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      case 'back':
        newCamera = { rotX: 0, rotY: 180, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
        break;
      default:
        newCamera = { rotX: -20, rotY: 45, rotZ: 0, zoom: 1, panX: 0, panY: 0 };
    }
    setCamera(newCamera);
  }, []);

  // Animation loop with RAF
  useEffect(() => {
    const animate = () => {
      renderAdvanced3D();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    if (visualization && activeGrid) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderAdvanced3D, visualization, activeGrid]);

  // Enhanced export functionality
  const exportEnhancedGrid = useCallback(() => {
    if (!activeGrid) {
      alert('No active grid to export');
      return;
    }
    
    const headers = [
      'X', 'Y', 'Z', 'Layer', 'BulkVolume', 'FaultFlag', 'WellPath',
      'Porosity', 'Permeability', 'StructuralDip', 'GridID', 'Timestamp'
    ];
    
    const csvContent = [
      headers.join(','),
      ...activeGrid.points.map(point => 
        `${point.x},${point.y},${point.z},${point.layer},${point.bulkVolume},${point.faultFlag},${point.wellPath},${point.porosity || 0},${point.permeability || 0},${point.structuralDip || 0},${activeGrid.id},${activeGrid.timestamp.toISOString()}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geological_3d_grid_${activeGrid.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeGrid]);

  // Color picker component
  const ColorPicker = ({ colorKey, currentColor, onChange, onClose }) => (
    <div className="absolute z-50 bg-slate-700 rounded-lg p-4 shadow-2xl border border-slate-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">Pick Color</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
      </div>
      <input
        type="color"
        value={currentColor}
        onChange={(e) => onChange(colorKey, e.target.value)}
        className="w-full h-10 rounded border-none bg-transparent cursor-pointer"
      />
      <div className="grid grid-cols-6 gap-2 mt-3">
        {['#4ade80', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', 
          '#10b981', '#3b82f6', '#e11d48', '#84cc16', '#f59e0b', '#6366f1'].map(color => (
          <button
            key={color}
            className="w-6 h-6 rounded border border-slate-500 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onClick={() => onChange(colorKey, color)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white flex overflow-hidden m-0 p-0" style={{ margin: 0, padding: 0, width: '100vw', height: '100vh' }}>
      
      {/* Collapsible Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-slate-900/95 backdrop-blur-sm border-r border-slate-700/50 transition-all duration-300 flex flex-col shadow-2xl`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  SEISMIC GRID (BETA)
                </h1>
                <p className="text-xs text-slate-400">Simulation Engine(Telesto)</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Grid Management */}
            <div className="p-4 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold mb-3 text-green-400 flex items-center">
                <Grid className="w-4 h-4 mr-2" />
                Active Grids ({grids.length})
              </h3>
              
              {grids.length === 0 && (
                <div className="text-xs text-slate-400 p-3 bg-slate-800/50 rounded border border-slate-600">
                  No grids created yet. Generate some demo data or upload CSV files to get started.
                </div>
              )}
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {grids.map(grid => (
                  <div
                    key={grid.id}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      activeGridId === grid.id 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                    } ${selectedGrids.has(grid.id) ? 'ring-1 ring-purple-500' : ''}`}
                    onClick={() => setActiveGridId(grid.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{grid.name}</div>
                        <div className="text-xs text-slate-400">
                          {grid.pointCount.toLocaleString()} points
                          {grid.isCombined && (
                            <span className="ml-2 text-purple-400">• Merged</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={selectedGrids.has(grid.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedGrids);
                            if (e.target.checked) {
                              newSet.add(grid.id);
                            } else {
                              newSet.delete(grid.id);
                            }
                            setSelectedGrids(newSet);
                          }}
                          className="text-blue-500"
                          onClick={(e) => e.stopPropagation()}
                          title="Select for merging"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGrids(prev => prev.filter(g => g.id !== grid.id));
                            if (activeGridId === grid.id) setActiveGridId(null);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete grid"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Merge Instructions */}
              {grids.length > 1 && selectedGrids.size === 0 && (
                <div className="mt-3 p-2 bg-blue-900/20 rounded border border-blue-700/30">
                  <div className="text-xs text-blue-300 font-medium mb-1">How to Merge Grids:</div>
                  <div className="text-xs text-slate-300">
                    1. Select 2+ grids using checkboxes<br/>
                    2. Check compatibility status<br/>
                    3. Click "Merge" to combine
                  </div>
                </div>
              )}
              
              {selectedGrids.size > 1 && (
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-purple-300">
                      Merge {selectedGrids.size} Grids
                    </div>
                    <div className="text-xs text-slate-400">
                      {canCombineGrids(Array.from(selectedGrids)).canCombine ? '✓' : '✗'}
                    </div>
                  </div>
                  
                  {/* Merge Direction Selector */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-2 text-slate-300">Merge Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setMergeDirection('vertical')}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          mergeDirection === 'vertical' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        ↕ Vertical Stack
                      </button>
                      <button
                        onClick={() => setMergeDirection('horizontal')}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          mergeDirection === 'horizontal' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        ↔ Horizontal
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Compatibility Details */}
                  <div className="mb-3">
                    <div className="text-xs text-slate-300 mb-1">Compatibility Score: {canCombineGrids(Array.from(selectedGrids)).compatibilityScore}%</div>
                    <div className="text-xs text-slate-300">
                      {canCombineGrids(Array.from(selectedGrids)).reason}
                    </div>
                    {canCombineGrids(Array.from(selectedGrids)).details.length > 0 && (
                      <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-700/30 text-xs text-red-300">
                        Issues:
                        <ul className="list-disc pl-4 mt-1">
                          {canCombineGrids(Array.from(selectedGrids)).details.map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {canCombineGrids(Array.from(selectedGrids)).canCombine && (
                      <div className="mt-1 text-purple-300">
                        {mergeDirection === 'vertical' ? 'Stacking grids vertically (Z-axis)' : 'Arranging grids horizontally (X-axis)'}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={combineGrids}
                      disabled={!canCombineGrids(Array.from(selectedGrids)).canCombine}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:opacity-50 px-3 py-2 rounded text-xs flex items-center justify-center transition-all transform hover:scale-105 disabled:scale-100"
                    >
                      <Combine className="w-3 h-3 mr-1" />
                      Merge {mergeDirection === 'vertical' ? '↕' : '↔'}
                    </button>
                    
                    <button
                      onClick={() => setSelectedGrids(new Set())}
                      className="bg-slate-600 hover:bg-slate-700 px-3 py-2 rounded text-xs flex items-center justify-center transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {canCombineGrids(Array.from(selectedGrids)).canCombine && (
                    <div className="mt-2 p-2 bg-green-900/20 rounded border border-green-700/30">
                      <div className="text-xs text-green-300">
                        Ready to merge: {mergeDirection === 'vertical' 
                          ? `${selectedGrids.size * 50}m total depth` 
                          : 'Adjacent placement with 50m gaps'
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Upload Section */}
            <div className="p-4 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold mb-3 text-cyan-400 flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Data Import
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Horizon Surfaces</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'horizon')}
                    className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-300">Fault Systems</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'fault')}
                    className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-red-600 file:text-white hover:file:bg-red-700 transition-colors"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={generateRealisticHorizons}
                    className="flex-1 bg-blue-600/80 hover:bg-blue-600 px-2 py-1 rounded text-xs flex items-center justify-center transition-colors"
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    Demo Horizons
                  </button>
                  
                  <button
                    onClick={generateRealisticFaults}
                    className="flex-1 bg-red-600/80 hover:bg-red-600 px-2 py-1 rounded text-xs flex items-center justify-center transition-colors"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Demo Faults
                  </button>
                </div>
              </div>
            </div>

            {/* Parameters Section */}
            <div className="p-4 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold mb-3 text-orange-400 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Grid Parameters
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Layers: {numLayers}</label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={numLayers}
                    onChange={(e) => setNumLayers(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">View Mode</label>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 transition-colors"
                  >
                    <option value="blocks">3D Blocks</option>
                    <option value="points">Point Cloud</option>
                    <option value="wireframe">Wireframe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Color Scheme</label>
                  <select
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 transition-colors"
                  >
                    <option value="depth">Depth Based</option>
                    <option value="porosity">Porosity</option>
                    <option value="permeability">Permeability</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={showFaults}
                      onChange={(e) => setShowFaults(e.target.checked)}
                      className="mr-2 text-red-500"
                    />
                    Faults
                  </label>
                  
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={showWells}
                      onChange={(e) => setShowWells(e.target.checked)}
                      className="mr-2 text-green-500"
                    />
                    Wells
                  </label>
                </div>
              </div>
            </div>

            {/* Slicing Section */}
            <div className="p-4 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold mb-3 text-yellow-400 flex items-center">
                <Box className="w-4 h-4 mr-2" />
                Slicing Options
              </h3>
              
              <div className="space-y-3">
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis}>
                    <label className="flex items-center text-xs mb-1">
                      <input
                        type="checkbox"
                        checked={sliceEnabled[axis]}
                        onChange={(e) => setSliceEnabled(prev => ({ ...prev, [axis]: e.target.checked }))}
                        className="mr-2 text-yellow-500"
                      />
                      Slice {axis.toUpperCase()}-Axis
                    </label>
                    {sliceEnabled[axis] && (
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={slicePosition[axis]}
                        onChange={(e) => setSlicePosition(prev => ({ ...prev, [axis]: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Color Customization */}
            <div className="p-4 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold mb-3 text-purple-400 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Color Customization
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(pointColors).map(([key, color]) => (
                  <div key={key} className="relative">
                    <button
                      onClick={() => setShowColorPicker(showColorPicker === key ? null : key)}
                      className="w-full flex items-center space-x-2 p-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 transition-colors"
                    >
                      <div 
                        className="w-4 h-4 rounded border border-slate-500"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs capitalize">{key}</span>
                    </button>
                    
                    {showColorPicker === key && (
                      <div className="absolute top-full left-0 mt-1 z-10">
                        <ColorPicker
                          colorKey={key}
                          currentColor={color}
                          onChange={(key, newColor) => {
                            setPointColors(prev => ({ ...prev, [key]: newColor }));
                          }}
                          onClose={() => setShowColorPicker(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Data Summary */}
            {activeGrid && (
              <div className="p-4 border-b border-slate-700/30">
                <h3 className="text-sm font-semibold mb-3 text-cyan-400 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Grid Statistics
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Points:</span>
                    <span className="font-mono">{activeGrid.pointCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Volume:</span>
                    <span className="font-mono">{(activeGrid.totalVolume/1e6).toFixed(1)}M m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Layers:</span>
                    <span className="font-mono">{activeGrid.layerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Horizons:</span>
                    <span className="font-mono text-green-400">{horizonData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Faults:</span>
                    <span className="font-mono text-red-400">{faultData.length}</span>
                  </div>
                  {activeGrid.isCombined && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-sm font-medium text-purple-300 mb-2">Merged Grid Analysis</div>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Source Grids:</span>
                          <span className="font-mono">{activeGrid.sourceGrids?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Porosity:</span>
                          <span className="font-mono">{(activeGrid.mergeStats?.avgPorosity * 100 || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Permeability:</span>
                          <span className="font-mono">{(activeGrid.mergeStats?.avgPermeability || 0).toFixed(1)} mD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fault Density:</span>
                          <span className="font-mono">{((activeGrid.mergeStats?.faultDensity || 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Well Density:</span>
                          <span className="font-mono">{((activeGrid.mergeStats?.wellDensity || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        Sources: {activeGrid.sourceGrids?.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4">
              <div className="space-y-2">
                <button
                  onClick={generateGeologicalGrid}
                  disabled={isGenerating || horizonData.length < 2}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 px-3 py-2 rounded flex items-center justify-center transition-all transform hover:scale-105 disabled:scale-100"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Grid
                    </>
                  )}
                </button>
                
                {activeGrid && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportEnhancedGrid}
                      className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded flex items-center justify-center text-xs transition-all transform hover:scale-105"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </button>
                    
                    <button
                      onClick={() => {
                        const newGrid = { ...activeGrid, id: Date.now().toString(), name: `${activeGrid.name}_Copy` };
                        setGrids(prev => [...prev, newGrid]);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded flex items-center justify-center text-xs transition-all transform hover:scale-105"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Clone
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Top Toolbar */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                GRID VISUALISER
              </h2>
              {activeGrid && (
                <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-600">
                  <span className="text-xs text-slate-300">Active: </span>
                  <span className="text-xs font-medium text-blue-400">{activeGrid.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Camera Controls */}
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-1">
                <button
                  onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(8, prev.zoom * 1.2) }))}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom * 0.8) }))}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setCamera({ rotX: -20, rotY: 45, rotZ: 0, zoom: 1, panX: 0, panY: 0 })}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Reset View"
                >
                  <Home className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Presets */}
              <select
                onChange={(e) => setCameraPreset(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs focus:border-blue-500 transition-colors"
                value=""
              >
                <option value="" disabled>Camera Views</option>
                <option value="iso">Isometric</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="front">Front</option>
                <option value="side">Side</option>
                <option value="back">Back</option>
              </select>
              
              <button
                onClick={() => setVisualization(!visualization)}
                className={`px-3 py-1 rounded transition-colors ${
                  visualization 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-slate-600 hover:bg-slate-700'
                }`}
              >
                {visualization ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative">
          {visualization ? (
            <div className="h-full w-full relative">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-move bg-gradient-to-br from-slate-900 to-slate-800"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                width={1920}
                height={1080}
                style={{ imageRendering: 'pixelated' }}
              />
              
              {/* Loading Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center p-8 bg-slate-800/90 rounded-xl border border-slate-600">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-green-400 mb-2">Generating Geological Grid</div>
                    <div className="text-sm text-slate-300">Processing geological data...</div>
                  </div>
                </div>
              )}
              
              {/* Interactive Legend */}
              {activeGrid && (
                <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50 shadow-2xl">
                  <div className="font-semibold mb-3 text-cyan-400">Legend</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded mr-3 border border-slate-500" style={{ backgroundColor: pointColors.shallow }}></div>
                      <span>Shallow Layers</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded mr-3 border border-slate-500" style={{ backgroundColor: pointColors.deep }}></div>
                      <span>Deep Layers</span>
                    </div>
                    {showFaults && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded mr-3 border border-slate-500" style={{ backgroundColor: pointColors.fault }}></div>
                        <span>Fault Zones</span>
                      </div>
                    )}
                    {showWells && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded mr-3 border border-slate-500" style={{ backgroundColor: pointColors.well }}></div>
                        <span>Well Locations</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Control Instructions */}
              <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 text-xs">
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center">
                    <Move3D className="w-3 h-3 mr-2 text-blue-400" />
                    <span>Drag to rotate • Shift+drag to pan • Scroll to zoom</span>
                  </div>
                  <div className="flex items-center">
                    <RotateCcw className="w-3 h-3 mr-2 text-green-400" />
                    <span>Click gizmo for direct axis control</span>
                  </div>
                </div>
              </div>
              
              {/* Performance Stats */}
              {activeGrid && (
                <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 text-xs">
                  <div className="text-slate-300 space-y-1">
                    <div>Rendering: {Math.min(activeGrid.points.length, 10000).toLocaleString()} points</div>
                    <div>View: {viewMode} • Zoom: {camera.zoom.toFixed(1)}x</div>
                    <div>Rotation: {camera.rotX.toFixed(0)}°, {camera.rotY.toFixed(0)}°</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="text-center p-12 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-600/50">
                <Eye className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">3D Visualization Disabled</h3>
                <p className="text-slate-400 mb-6">Enable visualization to see your geological grids in 3D</p>
                <button
                  onClick={() => setVisualization(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center mx-auto transition-colors"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Enable Visualization
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-slate-900/90 backdrop-blur-sm border-t border-slate-700/50 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="text-slate-400">
                Status: {isGenerating ? 'Generating...' : activeGrid ? 'Ready' : 'No active grid'}
              </div>
              {activeGrid && (
                <div className="text-slate-400">
                  Created: {activeGrid.timestamp.toLocaleDateString()} {activeGrid.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-slate-400">
              <div>Grids: {grids.length}</div>
              <div>Horizons: {horizonData.length}</div>
              <div>Faults: {faultData.length}</div>
              {selectedGrids.size > 0 && (
                <div className="text-purple-400">Selected: {selectedGrids.size}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-600 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <div className="text-lg font-medium text-green-400">Processing Geological Data</div>
                <div className="text-sm text-slate-300">Generating 3D grid structure...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        
        #__next, [data-reactroot] {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e293b;
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        
        @keyframes merge-highlight {
          0%, 100% { 
            border-color: rgba(147, 51, 234, 0.3);
            background: rgba(147, 51, 234, 0.1);
          }
          50% { 
            border-color: rgba(147, 51, 234, 0.6);
            background: rgba(147, 51, 234, 0.2);
          }
        }
        
        .merge-ready {
          animation: merge-highlight 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Geological3DGridTool;
import React, { useRef, useEffect, useCallback } from 'react';
import { Eye, EyeOff, RotateCw } from 'lucide-react';
import useGeologicalStore from '../../stores/geologicalStore';
import Card from '../ui/Card';
import Button from '../ui/Button';

const Visualization3D = () => {
  const {
    gridData,
    visualization,
    viewMode,
    showFaults,
    showWells,
    camera,
    lighting,
    isDragging,
    lastMouse,
    setVisualization,
    setCamera,
    resetCamera,
    setIsDragging,
    setLastMouse
  } = useGeologicalStore();

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Optimized 3D rendering with requestAnimationFrame
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
    
    // Prepare points for rendering with culling
    const renderPoints = gridData.points
      .map(point => ({
        ...point,
        projected: project3D(point.x, point.y, point.z)
      }))
      .filter(p => 
        p.projected.x >= -50 && p.projected.x < width + 50 &&
        p.projected.y >= -50 && p.projected.y < height + 50 &&
        p.projected.z > -1000
      )
      .sort((a, b) => b.projected.z - a.projected.z);

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
      
      // Skip based on visibility settings
      if (!showFaults && point.faultFlag > 0) return;
      if (!showWells && point.wellPath) return;
      
      let color, alpha = 0.7;
      
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
        
        // Apply lighting from store
        const baseLightness = 40 + depthRatio * 30;
        const ambientContribution = lighting.ambient * 30;
        const directionalContribution = lighting.directional * 20;
        const finalLightness = Math.min(90, Math.max(10, 
          (baseLightness + ambientContribution + directionalContribution) * lighting.intensity
        ));
        
        color = `hsl(${hue}, ${saturation}%, ${finalLightness}%)`;
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
      
      // Highlight for 3D effect with lighting intensity
      const highlightAlpha = alpha * 0.3 * lighting.intensity;
      ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
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

  // Optimized rendering loop
  useEffect(() => {
    const animate = () => {
      if (visualization && gridData) {
        renderAdvanced3D();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderAdvanced3D, visualization, gridData]);

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
      setCamera({
        panX: camera.panX + deltaX,
        panY: camera.panY + deltaY
      });
    } else {
      // Rotation mode
      setCamera({
        rotY: camera.rotY + deltaX * 0.5,
        rotX: Math.max(-90, Math.min(90, camera.rotX - deltaY * 0.5))
      });
    }
    
    setLastMouse(currentMouse);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera({
      zoom: Math.max(0.1, Math.min(5, camera.zoom * zoomFactor))
    });
  };

  return (
    <Card 
      title="Advanced 3D Geological Visualization"
      headerClassName="bg-gradient-to-r from-slate-800 to-slate-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetCamera}
            variant="secondary"
            size="sm"
            icon={<RotateCw className="w-4 h-4" />}
          >
            Reset View
          </Button>
          <Button
            onClick={() => setVisualization(!visualization)}
            variant="outline"
            size="sm"
            icon={visualization ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          >
            {visualization ? 'Hide' : 'Show'}
          </Button>
        </div>
      </div>
      
      {visualization && (
        <div className="space-y-4">
          {/* Camera Controls */}
          <div className="bg-slate-700 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="block mb-1 text-slate-300">
                  Rotation X: {camera.rotX.toFixed(0)}°
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={camera.rotX}
                  onChange={(e) => setCamera({ rotX: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-300">
                  Rotation Y: {camera.rotY.toFixed(0)}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={camera.rotY}
                  onChange={(e) => setCamera({ rotY: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-300">
                  Zoom: {camera.zoom.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={camera.zoom}
                  onChange={(e) => setCamera({ zoom: parseFloat(e.target.value) })}
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
              className="w-full border border-slate-600 rounded-lg bg-slate-900 cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ aspectRatio: '3/2' }}
            />
            
            {/* Legend */}
            {gridData && (
              <div className="absolute top-4 left-4 bg-slate-800 bg-opacity-90 rounded-lg p-3 text-sm">
                <div className="font-semibold mb-2 text-slate-200">Legend</div>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                    <span className="text-slate-300">Shallow Layers</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded mr-2"></div>
                    <span className="text-slate-300">Deep Layers</span>
                  </div>
                  {showFaults && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
                      <span className="text-slate-300">Fault Zones</span>
                    </div>
                  )}
                  {showWells && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded mr-2"></div>
                      <span className="text-slate-300">Well Locations</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Coordinate System Info */}
            <div className="absolute bottom-4 right-4 bg-slate-800 bg-opacity-90 rounded-lg p-2 text-xs">
              <div className="flex items-center space-x-3">
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-0.5 bg-red-400 mr-1"></span>X
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-2 h-0.5 bg-green-400 mr-1"></span>Y
                </span>
                <span className="flex items-center text-slate-300">
                  <span className="w-0.5 h-2 bg-blue-400 mr-1"></span>Z
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!visualization && (
        <div className="h-96 flex items-center justify-center text-slate-500 border border-slate-600 rounded-lg">
          <div className="text-center">
            <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-slate-300">3D Visualization Hidden</div>
            <div className="text-sm">Click "Show" to enable visualization</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Visualization3D;
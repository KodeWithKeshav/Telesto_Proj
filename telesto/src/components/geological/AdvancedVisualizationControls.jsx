import React, { useState } from 'react';
import { 
  Camera, 
  Sun, 
  Layers, 
  Scissors, 
  Play, 
  Pause, 
  RotateCcw,
  Move3d,
  Zap,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AdvancedVisualizationControls = () => {
  const {
    visualization,
    viewMode,
    setViewMode,
    camera,
    setCamera,
    resetCamera,
    showFaults,
    setShowFaults,
    showWells,
    setShowWells,
    lighting,
    setAmbientLight,
    setDirectionalLight,
    setLightIntensity,
    wellPaths,
    toggleWellPathVisibility
  } = useGeologicalStore();

  const [isAnimating, setIsAnimating] = useState(false);
  const [showLighting, setShowLighting] = useState(false);
  const [showCrossSection, setShowCrossSection] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  const handleCameraPreset = (preset) => {
    const presets = {
      top: { rotX: -90, rotY: 0, rotZ: 0, zoom: 1 },
      front: { rotX: 0, rotY: 0, rotZ: 0, zoom: 1 },
      side: { rotX: 0, rotY: 90, rotZ: 0, zoom: 1 },
      iso: { rotX: -30, rotY: 45, rotZ: 0, zoom: 1 },
      perspective: { rotX: -45, rotY: 30, rotZ: 15, zoom: 0.8 }
    };

    if (presets[preset]) {
      setCamera(presets[preset]);
    }
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const handleResetCamera = () => {
    resetCamera();
  };

  const handleRenderModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleLightingChange = (property, value) => {
    switch(property) {
      case 'ambient':
        setAmbientLight(value);
        break;
      case 'directional':
        setDirectionalLight(value);
        break;
      case 'intensity':
        setLightIntensity(value);
        break;
    }
  };

  const toggleCrossSection = () => {
    setShowCrossSection(!showCrossSection);
  };

  return (
    <Card 
      title="Visualization Controls" 
      icon={<Camera className="w-5 h-5 text-cyan-400" />}
    >
      <div className="space-y-4">
        
        {/* Camera Presets */}
        <div>
          <h4 className="font-medium text-green-400 mb-2 flex items-center">
            <Move3d className="w-4 h-4 mr-2" />
            Camera Presets
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCameraPreset('top')}
            >
              Top View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCameraPreset('front')}
            >
              Front View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCameraPreset('side')}
            >
              Side View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCameraPreset('iso')}
            >
              Isometric
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCameraPreset('perspective')}
              className="col-span-2"
            >
              Perspective
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetCamera}
            className="w-full mt-2"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Camera
          </Button>
        </div>

        {/* Render Modes */}
        <div>
          <h4 className="font-medium text-blue-400 mb-2 flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Render Mode
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={viewMode === 'blocks' ? 'primary' : 'secondary'}
              onClick={() => handleRenderModeChange('blocks')}
            >
              Solid
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'wireframe' ? 'primary' : 'secondary'}
              onClick={() => handleRenderModeChange('wireframe')}
            >
              Wireframe
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'points' ? 'primary' : 'secondary'}
              onClick={() => handleRenderModeChange('points')}
            >
              Points
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleRenderModeChange('transparent')}
            >
              Transparent
            </Button>
          </div>
        </div>

        {/* Lighting Controls */}
        <div>
          <button
            onClick={() => setShowLighting(!showLighting)}
            className="w-full flex items-center justify-between p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
          >
            <span className="font-medium text-orange-400 flex items-center">
              <Sun className="w-4 h-4 mr-2" />
              Lighting Controls
            </span>
            <Settings className={`w-4 h-4 transition-transform ${showLighting ? 'rotate-90' : ''}`} />
          </button>
          
          {showLighting && (
            <div className="mt-2 space-y-3 p-3 bg-slate-800 rounded">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Ambient Light</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={lighting.ambient}
                  onChange={(e) => handleLightingChange('ambient', parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-slate-400">{lighting.ambient}</span>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Directional Light</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={lighting.directional}
                  onChange={(e) => handleLightingChange('directional', parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-slate-400">{lighting.directional}</span>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Intensity</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={lighting.intensity}
                  onChange={(e) => handleLightingChange('intensity', parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-slate-400">{lighting.intensity}</span>
              </div>
            </div>
          )}
        </div>

        {/* Animation Controls */}
        <div>
          <h4 className="font-medium text-purple-400 mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Animation
          </h4>
          <div className="space-y-2">
            <Button
              size="sm"
              variant={isAnimating ? 'primary' : 'secondary'}
              onClick={toggleAnimation}
              className="w-full"
            >
              {isAnimating ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Rotation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Auto Rotate
                </>
              )}
            </Button>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Speed</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-slate-400">{animationSpeed}x</span>
            </div>
          </div>
        </div>

        {/* Cross Sections */}
        <div>
          <button
            onClick={toggleCrossSection}
            className="w-full flex items-center justify-between p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
          >
            <span className="font-medium text-red-400 flex items-center">
              <Scissors className="w-4 h-4 mr-2" />
              Cross Sections
            </span>
            <Settings className={`w-4 h-4 transition-transform ${showCrossSection ? 'rotate-90' : ''}`} />
          </button>
          
          {showCrossSection && (
            <div className="mt-2 space-y-2 p-3 bg-slate-800 rounded">
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
              >
                XY Plane
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
              >
                XZ Plane
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
              >
                YZ Plane
              </Button>
            </div>
          )}
        </div>

        {/* Layer Visibility */}
        <div>
          <h4 className="font-medium text-cyan-400 mb-2 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Layer Visibility
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Show Faults</span>
              <button
                onClick={() => setShowFaults(!showFaults)}
                className={`p-1 rounded transition-colors ${
                  showFaults ? 'text-green-400' : 'text-slate-500'
                }`}
              >
                {showFaults ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show Wells</span>
              <button
                onClick={() => setShowWells(!showWells)}
                className={`p-1 rounded transition-colors ${
                  showWells ? 'text-green-400' : 'text-slate-500'
                }`}
              >
                {showWells ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Well Path Visibility */}
        {wellPaths && wellPaths.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">Well Paths</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {wellPaths.map((well) => (
                <div key={well.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{well.name || `Well ${well.id}`}</span>
                  <button
                    onClick={() => toggleWellPathVisibility(well.id)}
                    className={`p-1 rounded transition-colors ${
                      well.visible !== false ? 'text-green-400' : 'text-slate-500'
                    }`}
                  >
                    {well.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Card>
  );
};

export default AdvancedVisualizationControls;
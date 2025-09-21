import React from 'react';
import { Settings } from 'lucide-react';
import useGeologicalStore from '../../stores/geologicalStore';
import Card from '../ui/Card';

const ParameterControls = () => {
  const {
    numLayers,
    viewMode,
    showFaults,
    showWells,
    setNumLayers,
    setViewMode,
    setShowFaults,
    setShowWells
  } = useGeologicalStore();

  return (
    <Card 
      title="Parameters" 
      icon={<Settings className="w-5 h-5 text-orange-400" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Number of Layers: {numLayers}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={numLayers}
            onChange={(e) => setNumLayers(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">View Mode</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="blocks">3D Blocks</option>
            <option value="points">Point Cloud</option>
            <option value="wireframe">Wireframe</option>
          </select>
        </div>
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">Display Options</h4>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showFaults}
              onChange={(e) => setShowFaults(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Show Faults</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showWells}
              onChange={(e) => setShowWells(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Show Wells</span>
          </label>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </Card>
  );
};

export default ParameterControls;
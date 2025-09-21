import React, { useState, useRef } from 'react';
import { Upload, Download, Eye, EyeOff, Plus, Trash2, MapPin, BarChart3 } from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import { parseWellPathCSV, generateSampleWellPath, calculateWellIntersections } from '../../utils/wellPathUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { toast } from 'react-hot-toast';

const WellPathManager = () => {
  const {
    wellPaths,
    addWellPath,
    removeWellPath,
    toggleWellPathVisibility,
    updateWellPathIntersections,
    gridCells
  } = useGeologicalStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const wellPathData = await parseWellPathCSV(file);
      addWellPath(wellPathData);
      toast.success(`Well path "${wellPathData.name}" imported successfully`);
    } catch (error) {
      toast.error(`Failed to import well path: ${error.message}`);
    }
  };

  const generateSampleWell = () => {
    const sampleWell = generateSampleWellPath();
    addWellPath(sampleWell);
    toast.success(`Sample well path "${sampleWell.name}" generated`);
  };

  const analyzeIntersections = async () => {
    if (wellPaths.length === 0 || gridCells.length === 0) {
      toast.error('Please load well paths and generate a geological grid first');
      return;
    }

    setIsAnalyzing(true);
    try {
      for (const wellPath of wellPaths) {
        const intersections = await calculateWellIntersections(wellPath, gridCells);
        updateWellPathIntersections(wellPath.id, intersections);
      }
      toast.success('Well path intersections calculated successfully');
    } catch (error) {
      toast.error(`Failed to analyze intersections: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportWellData = (wellPath) => {
    const csvContent = [
      ['X', 'Y', 'Z', 'MD', 'TVD', 'Layer', 'Porosity', 'Permeability'].join(','),
      ...wellPath.intersections.map(point => [
        point.x.toFixed(2),
        point.y.toFixed(2),
        point.z.toFixed(2),
        point.md.toFixed(2),
        point.tvd.toFixed(2),
        point.layer || '',
        point.porosity?.toFixed(4) || '',
        point.permeability?.toFixed(2) || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${wellPath.name}_intersections.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card title="Well Path Manager" icon={<MapPin className="w-5 h-5 text-emerald-400" />}>
      <div className="space-y-4">
        
        {/* Upload and Generation Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Well
          </Button>
          
          <Button
            onClick={generateSampleWell}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Sample Well
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Well Paths List */}
        {wellPaths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Loaded Well Paths</h4>
            {wellPaths.map((wellPath) => (
              <div
                key={wellPath.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600"
              >
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => toggleWellPathVisibility(wellPath.id)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {wellPath.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  
                  <div>
                    <p className="text-sm font-medium text-white">{wellPath.name}</p>
                    <p className="text-xs text-slate-400">
                      {wellPath.points.length} points, 
                      {wellPath.totalDepth?.toFixed(0)}m MD
                    </p>
                    {wellPath.intersections && (
                      <p className="text-xs text-emerald-400">
                        {wellPath.intersections.length} grid intersections
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {wellPath.intersections && (
                    <Button
                      onClick={() => exportWellData(wellPath)}
                      variant="ghost"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => removeWellPath(wellPath.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analysis Controls */}
        {wellPaths.length > 0 && (
          <div className="pt-4 border-t border-slate-600">
            <Button
              onClick={analyzeIntersections}
              disabled={isAnalyzing || gridCells.length === 0}
              className="w-full"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Well Intersections'}
            </Button>
            
            {gridCells.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                Generate a geological grid first to enable intersection analysis
              </p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-slate-400 space-y-1">
          <p>• Import CSV files with X,Y,Z,MD columns</p>
          <p>• Use sample wells for testing and demos</p>
          <p>• Analyze intersections with geological grid</p>
          <p>• Export detailed well data with properties</p>
        </div>
      </div>
    </Card>
  );
};

export default WellPathManager;
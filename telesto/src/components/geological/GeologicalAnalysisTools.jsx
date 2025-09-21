import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calculator, 
  Map, 
  TrendingUp, 
  Layers,
  Activity,
  PieChart,
  LineChart,
  Target
} from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import { 
  calculateVolumeStatistics,
  generateThicknessMap,
  performStructuralAnalysis,
  calculateReservoirProperties,
  generateStatisticalSummary
} from '../../utils/analysisUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

const GeologicalAnalysisTools = () => {
  const { gridCells, horizonData, wellPaths } = useGeologicalStore();
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const analysisTools = [
    {
      id: 'volume',
      name: 'Volume Analysis',
      icon: <Calculator className="w-4 h-4" />,
      description: 'Calculate volumes, areas, and reservoir capacity',
      requiresGrid: true
    },
    {
      id: 'thickness',
      name: 'Thickness Mapping',
      icon: <Map className="w-4 h-4" />,
      description: 'Generate isopach and net-to-gross maps',
      requiresGrid: true
    },
    {
      id: 'structural',
      name: 'Structural Analysis',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Analyze dip, strike, and structural trends',
      requiresHorizons: true
    },
    {
      id: 'reservoir',
      name: 'Reservoir Properties',
      icon: <Activity className="w-4 h-4" />,
      description: 'Statistical analysis of porosity and permeability',
      requiresGrid: true
    },
    {
      id: 'statistics',
      name: 'Data Statistics',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Comprehensive statistical summary',
      requiresAny: true
    }
  ];

  const canRunAnalysis = (tool) => {
    if (tool.requiresGrid && (!gridCells || gridCells.length === 0)) return false;
    if (tool.requiresHorizons && (!horizonData || horizonData.length === 0)) return false;
    if (tool.requiresAny && (!gridCells || gridCells.length === 0) && 
        (!horizonData || horizonData.length === 0) && 
        (!wellPaths || wellPaths.length === 0)) return false;
    return true;
  };

  const runAnalysis = async (toolId) => {
    if (!canRunAnalysis(analysisTools.find(t => t.id === toolId))) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setActiveAnalysis(toolId);

    try {
      let result;
      
      switch (toolId) {
        case 'volume':
          setAnalysisProgress(25);
          result = await calculateVolumeStatistics(gridCells);
          break;
          
        case 'thickness':
          setAnalysisProgress(25);
          result = await generateThicknessMap(gridCells, horizonData);
          break;
          
        case 'structural':
          setAnalysisProgress(25);
          result = await performStructuralAnalysis(horizonData);
          break;
          
        case 'reservoir':
          setAnalysisProgress(25);
          result = await calculateReservoirProperties(gridCells);
          break;
          
        case 'statistics':
          setAnalysisProgress(25);
          result = await generateStatisticalSummary(gridCells, horizonData, wellPaths);
          break;
          
        default:
          throw new Error(`Unknown analysis type: ${toolId}`);
      }

      setAnalysisProgress(100);
      setAnalysisResults(prev => ({ ...prev, [toolId]: result }));
      
    } catch (error) {
      console.error(`Analysis failed for ${toolId}:`, error);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  const renderVolumeResults = (results) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Total Volume</p>
          <p className="text-lg font-bold text-blue-400">
            {results.totalVolume?.toLocaleString()} m³
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Pore Volume</p>
          <p className="text-lg font-bold text-green-400">
            {results.poreVolume?.toLocaleString()} m³
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Net Volume</p>
          <p className="text-lg font-bold text-orange-400">
            {results.netVolume?.toLocaleString()} m³
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Net/Gross Ratio</p>
          <p className="text-lg font-bold text-purple-400">
            {(results.netGrossRatio * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      
      {results.layerVolumes && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2">Volume by Layer</h5>
          <div className="space-y-1">
            {results.layerVolumes.map(layer => (
              <div key={layer.layer} className="flex justify-between text-xs">
                <span className="text-slate-400">Layer {layer.layer}</span>
                <span className="text-white">{layer.volume.toLocaleString()} m³</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderThicknessResults = (results) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Average Thickness</p>
          <p className="text-lg font-bold text-blue-400">
            {results.averageThickness?.toFixed(1)} m
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Max Thickness</p>
          <p className="text-lg font-bold text-red-400">
            {results.maxThickness?.toFixed(1)} m
          </p>
        </div>
      </div>
      
      {results.thicknessMap && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2">Thickness Distribution</h5>
          <div className="space-y-1">
            {results.thicknessMap.ranges.map(range => (
              <div key={range.range} className="flex justify-between text-xs">
                <span className="text-slate-400">{range.range}</span>
                <span className="text-white">{range.count} cells ({range.percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStructuralResults = (results) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Average Dip</p>
          <p className="text-lg font-bold text-blue-400">
            {results.averageDip?.toFixed(1)}°
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Dominant Strike</p>
          <p className="text-lg font-bold text-green-400">
            {results.dominantStrike?.toFixed(0)}°
          </p>
        </div>
      </div>
      
      {results.structuralTrends && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2">Structural Trends</h5>
          <div className="space-y-1">
            {results.structuralTrends.map((trend, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-slate-400">{trend.direction}</span>
                <span className="text-white">{trend.strength.toFixed(2)} intensity</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderReservoirResults = (results) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Avg Porosity</p>
          <p className="text-lg font-bold text-blue-400">
            {(results.averagePorosity * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Avg Permeability</p>
          <p className="text-lg font-bold text-green-400">
            {results.averagePermeability?.toFixed(0)} mD
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Flow Capacity</p>
          <p className="text-lg font-bold text-orange-400">
            {results.flowCapacity?.toFixed(0)} mD·m
          </p>
        </div>
        <div className="bg-slate-800 p-3 rounded border border-slate-600">
          <p className="text-xs text-slate-400">Storage Capacity</p>
          <p className="text-lg font-bold text-purple-400">
            {results.storageCapacity?.toFixed(0)} m
          </p>
        </div>
      </div>
      
      {results.qualityRanking && (
        <div>
          <h5 className="text-sm font-medium text-slate-300 mb-2">Reservoir Quality</h5>
          <div className="space-y-1">
            {results.qualityRanking.map(quality => (
              <div key={quality.category} className="flex justify-between text-xs">
                <span className="text-slate-400">{quality.category}</span>
                <span className="text-white">{quality.percentage.toFixed(1)}% ({quality.count} cells)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStatisticsResults = (results) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {results.gridStats && (
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
            <h5 className="text-sm font-medium text-slate-300 mb-2">Grid Statistics</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">Total Cells:</span>
              <span className="text-white">{results.gridStats.totalCells.toLocaleString()}</span>
              <span className="text-slate-400">Active Cells:</span>
              <span className="text-white">{results.gridStats.activeCells.toLocaleString()}</span>
              <span className="text-slate-400">Layers:</span>
              <span className="text-white">{results.gridStats.layers}</span>
            </div>
          </div>
        )}
        
        {results.wellStats && (
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
            <h5 className="text-sm font-medium text-slate-300 mb-2">Well Statistics</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">Total Wells:</span>
              <span className="text-white">{results.wellStats.totalWells}</span>
              <span className="text-slate-400">Total Depth:</span>
              <span className="text-white">{results.wellStats.totalDepth.toFixed(0)} m</span>
              <span className="text-slate-400">Avg Depth:</span>
              <span className="text-white">{results.wellStats.averageDepth.toFixed(0)} m</span>
            </div>
          </div>
        )}
        
        {results.dataQuality && (
          <div className="bg-slate-800 p-3 rounded border border-slate-600">
            <h5 className="text-sm font-medium text-slate-300 mb-2">Data Quality</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">Completeness:</span>
              <span className="text-white">{(results.dataQuality.completeness * 100).toFixed(1)}%</span>
              <span className="text-slate-400">Consistency:</span>
              <span className="text-white">{(results.dataQuality.consistency * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalysisResults = (toolId) => {
    const results = analysisResults[toolId];
    if (!results) return null;

    switch (toolId) {
      case 'volume':
        return renderVolumeResults(results);
      case 'thickness':
        return renderThicknessResults(results);
      case 'structural':
        return renderStructuralResults(results);
      case 'reservoir':
        return renderReservoirResults(results);
      case 'statistics':
        return renderStatisticsResults(results);
      default:
        return <p className="text-xs text-slate-400">Analysis results available</p>;
    }
  };

  return (
    <Card 
      title="Geological Analysis Tools" 
      icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
    >
      <div className="space-y-4">
        
        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                Running {analysisTools.find(t => t.id === activeAnalysis)?.name}...
              </span>
              <span className="text-xs text-slate-400">{analysisProgress}%</span>
            </div>
            <ProgressBar progress={analysisProgress} className="h-2" />
          </div>
        )}

        {/* Analysis Tools */}
        <div className="space-y-3">
          {analysisTools.map(tool => (
            <div key={tool.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {tool.icon}
                  <div>
                    <p className="text-sm font-medium text-white">{tool.name}</p>
                    <p className="text-xs text-slate-400">{tool.description}</p>
                  </div>
                </div>
                
                <Button
                  onClick={() => runAnalysis(tool.id)}
                  disabled={!canRunAnalysis(tool) || isAnalyzing}
                  variant={analysisResults[tool.id] ? 'default' : 'outline'}
                  size="sm"
                >
                  {analysisResults[tool.id] ? 'Update' : 'Run'}
                </Button>
              </div>
              
              {/* Results */}
              {analysisResults[tool.id] && (
                <div className="ml-7 p-3 bg-slate-900 rounded border border-slate-700">
                  {renderAnalysisResults(tool.id)}
                </div>
              )}
              
              {/* Requirements Message */}
              {!canRunAnalysis(tool) && (
                <p className="text-xs text-amber-400 ml-7">
                  {tool.requiresGrid && 'Requires geological grid data'}
                  {tool.requiresHorizons && 'Requires horizon data'}
                  {tool.requiresAny && 'Requires any geological data'}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="pt-4 border-t border-slate-700">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400">Grid Cells</p>
              <p className="text-sm font-bold text-blue-400">
                {gridCells?.length?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Horizons</p>
              <p className="text-sm font-bold text-green-400">
                {horizonData?.length?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Wells</p>
              <p className="text-sm font-bold text-purple-400">
                {wellPaths?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Volume analysis calculates reservoir capacity</p>
          <p>• Thickness mapping shows geological layers</p>
          <p>• Structural analysis reveals geological trends</p>
          <p>• Reservoir properties assess flow potential</p>
        </div>
      </div>
    </Card>
  );
};

export default GeologicalAnalysisTools;
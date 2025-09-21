import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Database, 
  Code, 
  Image, 
  Settings, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import { 
  exportToCSV, 
  exportToPetrel, 
  exportToEclipse, 
  exportToVTK,
  exportToJSON,
  exportToGeoJSON,
  generateExportSummary
} from '../../utils/exportUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { toast } from 'react-hot-toast';

const AdvancedExportManager = () => {
  const { gridCells, wellPaths, horizonData, faultData, lighting, camera, viewMode } = useGeologicalStore();
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [exportOptions, setExportOptions] = useState({
    includeWells: true,
    includeFaults: true,
    includeProperties: true,
    includeHeaders: true,
    includeMetadata: true,
    includeLighting: true,
    includeCamera: true,
    precision: 2,
    coordinateSystem: 'UTM',
    units: 'meters',
    compression: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportFormats = [
    {
      id: 'csv',
      name: 'CSV (Comma Separated)',
      icon: <FileText className="w-4 h-4" />,
      description: 'Universal format for spreadsheets and analysis',
      extension: '.csv',
      supports: ['grid', 'wells', 'horizons', 'faults']
    },
    {
      id: 'petrel',
      name: 'Petrel ASCII',
      icon: <Database className="w-4 h-4" />,
      description: 'Schlumberger Petrel import format',
      extension: '.dat',
      supports: ['grid', 'wells', 'horizons']
    },
    {
      id: 'eclipse',
      name: 'Eclipse Simulator',
      icon: <Code className="w-4 h-4" />,
      description: 'Reservoir simulation input format',
      extension: '.grdecl',
      supports: ['grid', 'properties']
    },
    {
      id: 'vtk',
      name: 'VTK (Visualization)',
      icon: <Image className="w-4 h-4" />,
      description: 'Paraview and 3D visualization',
      extension: '.vtk',
      supports: ['grid', 'wells', 'properties']
    },
    {
      id: 'json',
      name: 'JSON Data',
      icon: <Code className="w-4 h-4" />,
      description: 'Web applications and APIs',
      extension: '.json',
      supports: ['grid', 'wells', 'horizons', 'faults', 'metadata']
    },
    {
      id: 'geojson',
      name: 'GeoJSON',
      icon: <Database className="w-4 h-4" />,
      description: 'Geographic information systems',
      extension: '.geojson',
      supports: ['horizons', 'faults', 'wells']
    },
    {
      id: 'ambient',
      name: 'Ambient Settings',
      icon: <Settings className="w-4 h-4" />,
      description: 'Lighting and visualization settings',
      extension: '.json',
      supports: ['lighting', 'camera', 'visualization']
    }
  ];

  const exportAmbientSettings = async () => {
    const ambientData = {
      lighting: {
        ambient: lighting.ambient,
        directional: lighting.directional,
        intensity: lighting.intensity
      },
      camera: exportOptions.includeCamera ? {
        rotX: camera.rotX,
        rotY: camera.rotY,
        rotZ: camera.rotZ,
        zoom: camera.zoom,
        panX: camera.panX,
        panY: camera.panY
      } : null,
      visualization: {
        viewMode: viewMode,
        enabled: true
      },
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        description: 'Telesto Ambient Lighting and Visualization Settings'
      }
    };

    return JSON.stringify(ambientData, null, 2);
  };

  const handleExport = async () => {
    if (selectedFormat !== 'ambient' && gridCells.length === 0) {
      toast.error('No geological grid data to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const exportData = {
        gridCells: exportOptions.includeProperties ? gridCells : 
          gridCells.map(cell => ({ x: cell.x, y: cell.y, z: cell.z, layer: cell.layer })),
        wellPaths: exportOptions.includeWells ? wellPaths : [],
        horizonData: horizonData,
        faultData: exportOptions.includeFaults ? faultData : [],
        metadata: exportOptions.includeMetadata ? {
          exportDate: new Date().toISOString(),
          totalCells: gridCells.length,
          totalWells: wellPaths.length,
          coordinateSystem: exportOptions.coordinateSystem,
          units: exportOptions.units,
          precision: exportOptions.precision
        } : null
      };

      let result;
      let filename;

      // Update progress
      setExportProgress(25);

      switch (selectedFormat) {
        case 'csv':
          result = await exportToCSV(exportData, exportOptions);
          filename = 'geological_grid.csv';
          break;
        case 'petrel':
          result = await exportToPetrel(exportData, exportOptions);
          filename = 'geological_grid.dat';
          break;
        case 'eclipse':
          result = await exportToEclipse(exportData, exportOptions);
          filename = 'geological_grid.grdecl';
          break;
        case 'vtk':
          result = await exportToVTK(exportData, exportOptions);
          filename = 'geological_grid.vtk';
          break;
        case 'json':
          result = await exportToJSON(exportData, exportOptions);
          filename = 'geological_grid.json';
          break;
        case 'geojson':
          result = await exportToGeoJSON(exportData, exportOptions);
          filename = 'geological_grid.geojson';
          break;
        case 'ambient':
          result = await exportAmbientSettings();
          filename = 'ambient_settings.json';
          break;
        default:
          throw new Error(`Unsupported export format: ${selectedFormat}`);
      }

      setExportProgress(75);

      // Create and download file
      const format = exportFormats.find(f => f.id === selectedFormat);
      const blob = new Blob([result], { 
        type: selectedFormat === 'json' || selectedFormat === 'geojson' ? 
          'application/json' : 'text/plain' 
      });
      
      if (exportOptions.compression && window.CompressionStream) {
        // Add compression if supported
        const compressed = await compressData(blob);
        downloadFile(compressed, filename + '.gz');
      } else {
        downloadFile(blob, filename);
      }

      setExportProgress(100);

      // Generate export summary
      const summary = generateExportSummary(exportData, selectedFormat, exportOptions);
      toast.success(`Export completed: ${summary.totalSize} KB, ${summary.totalRecords} records`);

    } catch (error) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const compressData = async (blob) => {
    const stream = new CompressionStream('gzip');
    const compressedStream = blob.stream().pipeThrough(stream);
    return new Response(compressedStream).blob();
  };

  const updateExportOption = (key, value) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const getDataAvailability = () => {
    return {
      grid: gridCells.length > 0,
      wells: wellPaths.length > 0,
      horizons: horizonData.length > 0,
      faults: faultData.length > 0
    };
  };

  const dataAvailability = getDataAvailability();
  const selectedFormatInfo = exportFormats.find(f => f.id === selectedFormat);

  return (
    <Card 
      title="Advanced Export Manager" 
      icon={<Download className="w-5 h-5 text-purple-400" />}
    >
      <div className="space-y-4">
        
        {/* Data Availability Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`flex items-center space-x-2 p-2 rounded ${
            dataAvailability.grid ? 'bg-green-900/30' : 'bg-slate-800'
          }`}>
            {dataAvailability.grid ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> :
              <AlertCircle className="w-3 h-3 text-slate-500" />
            }
            <span>Grid ({gridCells.length})</span>
          </div>
          <div className={`flex items-center space-x-2 p-2 rounded ${
            dataAvailability.wells ? 'bg-green-900/30' : 'bg-slate-800'
          }`}>
            {dataAvailability.wells ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> :
              <AlertCircle className="w-3 h-3 text-slate-500" />
            }
            <span>Wells ({wellPaths.length})</span>
          </div>
          <div className={`flex items-center space-x-2 p-2 rounded ${
            dataAvailability.horizons ? 'bg-green-900/30' : 'bg-slate-800'
          }`}>
            {dataAvailability.horizons ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> :
              <AlertCircle className="w-3 h-3 text-slate-500" />
            }
            <span>Horizons ({horizonData.length})</span>
          </div>
          <div className={`flex items-center space-x-2 p-2 rounded ${
            dataAvailability.faults ? 'bg-green-900/30' : 'bg-slate-800'
          }`}>
            {dataAvailability.faults ? 
              <CheckCircle className="w-3 h-3 text-green-400" /> :
              <AlertCircle className="w-3 h-3 text-slate-500" />
            }
            <span>Faults ({faultData.length})</span>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Export Format</h4>
          <div className="grid grid-cols-1 gap-2">
            {exportFormats.map(format => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedFormat === format.id
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {format.icon}
                  <div>
                    <p className="text-sm font-medium text-white">{format.name}</p>
                    <p className="text-xs text-slate-400">{format.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports: {format.supports.join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Options */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Export Options</h4>
          <div className="space-y-3">
            
            {/* Data Selection */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeWells}
                  onChange={(e) => updateExportOption('includeWells', e.target.checked)}
                  disabled={!dataAvailability.wells || !selectedFormatInfo?.supports.includes('wells')}
                  className="rounded"
                />
                <span>Include Wells</span>
              </label>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeFaults}
                  onChange={(e) => updateExportOption('includeFaults', e.target.checked)}
                  disabled={!dataAvailability.faults || !selectedFormatInfo?.supports.includes('faults')}
                  className="rounded"
                />
                <span>Include Faults</span>
              </label>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeProperties}
                  onChange={(e) => updateExportOption('includeProperties', e.target.checked)}
                  disabled={!selectedFormatInfo?.supports.includes('properties')}
                  className="rounded"
                />
                <span>Include Properties</span>
              </label>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => updateExportOption('includeMetadata', e.target.checked)}
                  disabled={!selectedFormatInfo?.supports.includes('metadata')}
                  className="rounded"
                />
                <span>Include Metadata</span>
              </label>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeLighting}
                  onChange={(e) => updateExportOption('includeLighting', e.target.checked)}
                  disabled={!selectedFormatInfo?.supports.includes('lighting')}
                  className="rounded"
                />
                <span>Include Lighting</span>
              </label>
              <label className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCamera}
                  onChange={(e) => updateExportOption('includeCamera', e.target.checked)}
                  disabled={!selectedFormatInfo?.supports.includes('camera')}
                  className="rounded"
                />
                <span>Include Camera</span>
              </label>
            </div>

            {/* Format-specific options */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400">Precision</label>
                <select
                  value={exportOptions.precision}
                  onChange={(e) => updateExportOption('precision', parseInt(e.target.value))}
                  className="w-full mt-1 p-1 bg-slate-800 border border-slate-600 rounded text-xs"
                >
                  <option value={0}>0 decimals</option>
                  <option value={1}>1 decimal</option>
                  <option value={2}>2 decimals</option>
                  <option value={4}>4 decimals</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Units</label>
                <select
                  value={exportOptions.units}
                  onChange={(e) => updateExportOption('units', e.target.value)}
                  className="w-full mt-1 p-1 bg-slate-800 border border-slate-600 rounded text-xs"
                >
                  <option value="meters">Meters</option>
                  <option value="feet">Feet</option>
                  <option value="kilometers">Kilometers</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-slate-300">Exporting...</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={!dataAvailability.grid || isExporting}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : `Export as ${selectedFormatInfo?.name}`}
        </Button>

        {/* Instructions */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Choose format based on target application</p>
          <p>• Petrel format for Schlumberger software</p>
          <p>• Eclipse format for reservoir simulation</p>
          <p>• VTK format for 3D visualization tools</p>
        </div>
      </div>
    </Card>
  );
};

export default AdvancedExportManager;
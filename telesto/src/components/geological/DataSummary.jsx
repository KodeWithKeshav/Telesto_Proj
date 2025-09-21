import React from 'react';
import { Info, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import useGeologicalStore from '../../stores/geologicalStore';
import { exportGridToCSV, downloadFile } from '../../utils/geologicalUtils';
import Card from '../ui/Card';
import Button from '../ui/Button';

const DataSummary = () => {
  const { horizonData, faultData, gridData, isGenerating } = useGeologicalStore();

  const handleExportGrid = () => {
    try {
      if (!gridData) {
        toast.error('No grid data to export');
        return;
      }
      
      const csvContent = exportGridToCSV(gridData);
      const filename = `geological_3d_grid_${new Date().toISOString().split('T')[0]}.csv`;
      downloadFile(csvContent, filename);
      
      toast.success(`Grid data exported as ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export grid data');
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        title="Data Summary" 
        icon={<Info className="w-5 h-5 text-cyan-400" />}
      >
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300">Horizons:</span>
                <span className="font-mono text-cyan-400">{horizonData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Faults:</span>
                <span className="font-mono text-cyan-400">{faultData.length}</span>
              </div>
            </div>
            
            {gridData && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Grid Points:</span>
                  <span className="font-mono text-green-400">
                    {gridData.pointCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Layers:</span>
                  <span className="font-mono text-green-400">{gridData.layerCount}</span>
                </div>
              </div>
            )}
          </div>
          
          {gridData && (
            <div className="pt-3 border-t border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Volume:</span>
                <span className="font-mono text-blue-400">
                  {(gridData.totalVolume / 1e6).toFixed(1)}M m³
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Generated:</span>
                <span>{new Date(gridData.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {gridData && (
        <Card>
          <Button
            onClick={handleExportGrid}
            variant="warning"
            icon={<Download className="w-4 h-4" />}
            className="w-full"
            disabled={isGenerating}
          >
            Export Grid Data
          </Button>
          
          <div className="mt-3 text-xs text-slate-400">
            <p>Exports complete geological grid with properties including:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Coordinates (X, Y, Z) and layer information</li>
              <li>Geological properties (porosity, permeability)</li>
              <li>Fault flags and well intersections</li>
              <li>Bulk volume and structural dip data</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DataSummary;
import React from 'react';
import { Layers, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import useGeologicalStore from '../../stores/geologicalStore';
import { generateRealisticHorizons, generateRealisticFaults } from '../../utils/geologicalUtils';
import Card from '../ui/Card';
import Button from '../ui/Button';

const SampleDataGenerator = () => {
  const { setHorizonData, setFaultData } = useGeologicalStore();

  const handleGenerateHorizons = () => {
    try {
      const horizons = generateRealisticHorizons();
      setHorizonData(horizons);
      toast.success(`Generated ${horizons.length} realistic horizon surfaces`);
    } catch (error) {
      console.error('Error generating horizons:', error);
      toast.error('Failed to generate horizon data');
    }
  };

  const handleGenerateFaults = () => {
    try {
      const faults = generateRealisticFaults();
      setFaultData(faults);
      toast.success(`Generated ${faults.length} fault systems`);
    } catch (error) {
      console.error('Error generating faults:', error);
      toast.error('Failed to generate fault data');
    }
  };

  return (
    <Card 
      title="Sample Data" 
      icon={<Layers className="w-5 h-5 text-purple-400" />}
    >
      <div className="space-y-3">
        <Button
          onClick={handleGenerateHorizons}
          variant="primary"
          icon={<Layers className="w-4 h-4" />}
          className="w-full"
        >
          Generate Realistic Horizons
        </Button>
        
        <Button
          onClick={handleGenerateFaults}
          variant="danger"
          icon={<Zap className="w-4 h-4" />}
          className="w-full"
        >
          Generate Fault System
        </Button>
      </div>
      
      <div className="mt-4 p-3 bg-slate-700 rounded-lg">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Sample Data Features:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• Realistic geological structures (anticlines, synclines)</li>
          <li>• Variable dip angles and structural features</li>
          <li>• Listric and planar fault geometries</li>
          <li>• Geologically consistent data relationships</li>
        </ul>
      </div>
    </Card>
  );
};

export default SampleDataGenerator;
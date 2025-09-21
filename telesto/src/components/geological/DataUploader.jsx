import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useGeologicalStore from '../../stores/geologicalStore';
import { parseCSVData, validateGeologicalData } from '../../utils/geologicalUtils';
import Card from '../ui/Card';
import Button from '../ui/Button';

const DataUploader = () => {
  const { addHorizon, addFault } = useGeologicalStore();

  const handleFileUpload = useCallback((event, dataType) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const points = parseCSVData(text, dataType);
        
        // Validate data
        const validation = validateGeologicalData(points, dataType);
        
        if (!validation.isValid) {
          toast.error(`Invalid ${dataType} data: ${validation.errors.join(', ')}`);
          return;
        }
        
        if (validation.warnings.length > 0) {
          validation.warnings.forEach(warning => toast.warning(warning));
        }
        
        if (points.length === 0) {
          toast.error('No valid data points found. Please check your file format.');
          return;
        }
        
        const newData = {
          name: file.name.replace('.csv', ''),
          points: points,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          uploadedAt: new Date().toISOString()
        };
        
        if (dataType === 'horizon') {
          addHorizon(newData);
          toast.success(`Successfully uploaded horizon: ${newData.name} (${points.length} points)`);
        } else if (dataType === 'fault') {
          addFault(newData);
          toast.success(`Successfully uploaded fault: ${newData.name} (${points.length} points)`);
        }
        
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Error parsing file. Please ensure it\'s a valid CSV with X, Y, Z columns.');
      }
    };
    
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    
    reader.readAsText(file);
    event.target.value = '';
  }, [addHorizon, addFault]);

  const FileUploadField = ({ dataType, label, description, accept = ".csv" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={(e) => handleFileUpload(e, dataType)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg px-4 py-3 text-center hover:border-slate-500 hover:bg-slate-650 transition-colors">
          <Upload className="w-5 h-5 mx-auto mb-2 text-slate-400" />
          <span className="text-sm text-slate-300">Click to upload or drag & drop</span>
        </div>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </motion.div>
  );

  return (
    <Card 
      title="Data Upload" 
      icon={<Upload className="w-5 h-5 text-green-400" />}
      className="space-y-4"
    >
      <div className="space-y-4">
        <FileUploadField
          dataType="horizon"
          label="Horizon Surfaces (CSV)"
          description="Format: X,Y,Z columns with coordinate data"
        />
        
        <FileUploadField
          dataType="fault"
          label="Fault Surfaces (CSV)"
          description="Format: X,Y,Z,SegId columns with fault geometry"
        />
      </div>
      
      <div className="mt-4 p-3 bg-slate-700 rounded-lg">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Supported Formats:</h4>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• CSV files with comma-separated values</li>
          <li>• Column headers: X/Easting, Y/Northing, Z/Depth/Elevation</li>
          <li>• For faults: additional SegId column for segment identification</li>
          <li>• Consistent coordinate system recommended</li>
        </ul>
      </div>
    </Card>
  );
};

export default DataUploader;
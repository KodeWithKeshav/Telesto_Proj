import React from 'react';
import { Toaster } from 'react-hot-toast';
import { FileText } from 'lucide-react';
import DataUploader from './geological/DataUploader';
import SampleDataGenerator from './geological/SampleDataGenerator';
import ParameterControls from './geological/ParameterControls';
import DataSummary from './geological/DataSummary';
import GridGenerationActions from './geological/GridGenerationActions';
import WellPathManager from './geological/WellPathManager';
import ProjectManager from './geological/ProjectManager';
import AdvancedVisualizationControls from './geological/AdvancedVisualizationControls';
import AdvancedExportManager from './geological/AdvancedExportManager';
import GeologicalAnalysisTools from './geological/GeologicalAnalysisTools';
import DataValidationManager from './geological/DataValidationManager';
import Visualization3D from './geological/Visualization3D';
import Card from './ui/Card';

const Geological3DGridTool = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f1f5f9'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9'
            }
          }
        }}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">
            Advanced 3D Geological Grid Generator
          </h1>
          <p className="text-slate-300 text-lg">
            Professional tool for geological subsurface modeling with realistic fault handling
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Left Panel - Data Controls */}
          <div className="xl:col-span-1 space-y-6">
            <ProjectManager />
            <DataUploader />
            <SampleDataGenerator />
            <WellPathManager />
            <ParameterControls />
            <DataSummary />
            <GridGenerationActions />
          </div>

          {/* Center Panel - Visualization */}
          <div className="xl:col-span-3">
            <Visualization3D />
          </div>

          {/* Right Panel - Advanced Controls */}
          <div className="xl:col-span-1 space-y-6">
            <AdvancedVisualizationControls />
            <GeologicalAnalysisTools />
            <DataValidationManager />
            <AdvancedExportManager />
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Geological Features */}
          <Card 
            title="Geological Features" 
            icon={<div className="w-5 h-5 bg-blue-400 rounded"></div>}
          >
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-medium text-green-400 mb-2">Horizon Processing</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Advanced geological interpolation algorithms</li>
                    <li>• Structural dip calculation and modeling</li>
                    <li>• Iso-proportionate layer generation</li>
                    <li>• Geological constraint honoring</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-400 mb-2">Fault Modeling</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Multi-fault system support</li>
                    <li>• Distance-based influence zones</li>
                    <li>• Realistic displacement modeling</li>
                    <li>• Smooth fault zone tapering</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Technical Specifications */}
          <Card 
            title="Technical Specifications" 
            icon={<div className="w-5 h-5 bg-purple-400 rounded"></div>}
          >
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-medium text-orange-400 mb-2">Input Support</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• CSV file import with validation</li>
                    <li>• Multiple horizon surfaces</li>
                    <li>• Complex fault geometries</li>
                    <li>• Well path integration</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-orange-400 mb-2">Output Features</h4>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Complete grid with geological properties</li>
                    <li>• Porosity and permeability calculations</li>
                    <li>• Structural attributes</li>
                    <li>• Volume calculations and statistics</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Usage Instructions */}
        <Card 
          title="Usage Instructions" 
          icon={<FileText className="w-5 h-5 text-cyan-400" />}
          className="mt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-green-400 mb-2">1. Data Preparation</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Prepare horizon CSV files with X, Y, Z coordinates</li>
                <li>• Include fault data with X, Y, Z, SegId columns</li>
                <li>• Ensure consistent coordinate system</li>
                <li>• Use sample data generators for testing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">2. Grid Generation</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Upload or generate horizon surfaces</li>
                <li>• Set desired number of layers</li>
                <li>• Configure visualization preferences</li>
                <li>• Click "Generate 3D Grid" to process</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-400 mb-2">3. Analysis & Export</h4>
              <ul className="text-slate-300 space-y-1">
                <li>• Explore 3D visualization with controls</li>
                <li>• Toggle different view modes</li>
                <li>• Export complete grid data as CSV</li>
                <li>• Use data for reservoir modeling</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Geological3DGridTool;
// Type definitions for geological data structures

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HorizonPoint extends Point3D {
  id?: string | number;
}

export interface FaultPoint extends Point3D {
  segId: string | number;
}

export interface GridCell extends Point3D {
  layer: number;
  porosity?: number;
  permeability?: number;
  facies?: string;
  properties?: Record<string, any>;
}

export interface GeologicalParameters {
  numLayers: number;
  cellSize: number;
  minPorosity: number;
  maxPorosity: number;
  minPermeability: number;
  maxPermeability: number;
  interpolationMethod: 'linear' | 'kriging' | 'idw';
  faultInfluenceRadius: number;
}

export interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface DataSummary {
  totalHorizonPoints: number;
  totalFaultPoints: number;
  totalLayers: number;
  totalCells: number;
  bounds: GridBounds;
  generationTime?: number;
}

export interface VisualizationState {
  rotation: { x: number; y: number; z: number };
  zoom: number;
  showWireframe: boolean;
  showFaults: boolean;
  showCells: boolean;
  selectedLayer?: number;
  colorBy: 'layer' | 'porosity' | 'permeability' | 'facies';
}

export interface GeologicalStore {
  // Data
  horizonData: HorizonPoint[];
  faultData: FaultPoint[];
  gridCells: GridCell[];
  
  // Parameters
  parameters: GeologicalParameters;
  
  // State
  isGenerating: boolean;
  generationProgress: number;
  dataSummary: DataSummary | null;
  visualization: VisualizationState;
  
  // Actions
  setHorizonData: (data: HorizonPoint[]) => void;
  setFaultData: (data: FaultPoint[]) => void;
  setGridCells: (cells: GridCell[]) => void;
  updateParameters: (params: Partial<GeologicalParameters>) => void;
  setGenerating: (generating: boolean) => void;
  updateProgress: (progress: number) => void;
  setDataSummary: (summary: DataSummary) => void;
  updateVisualization: (updates: Partial<VisualizationState>) => void;
  reset: () => void;
}

export interface CSVData {
  headers: string[];
  rows: string[][];
  fileName: string;
  size: number;
}

export interface GenerationResult {
  success: boolean;
  gridCells: GridCell[];
  summary: DataSummary;
  error?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'petrel';
  includeProperties: boolean;
  includeHeaders: boolean;
  precision: number;
}
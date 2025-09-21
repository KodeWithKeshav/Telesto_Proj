import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useGeologicalStore = create(
  immer((set, get) => ({
    // Data state
    horizonData: [],
    faultData: [],
    gridData: null,
    wellPaths: [],
    gridCells: [],
    
    // UI state
    numLayers: 5,
    isGenerating: false,
    visualization: true,
    viewMode: 'blocks', // 'points', 'blocks', 'wireframe'
    showFaults: true,
    showWells: true,
    
    // Camera state
    camera: {
      rotX: -20,
      rotY: 45,
      rotZ: 0,
      zoom: 1,
      panX: 0,
      panY: 0
    },
    
    // Lighting state
    lighting: {
      ambient: 0.4,
      directional: 0.8,
      intensity: 1.0
    },
    
    // Interaction state
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    
    // Actions
    setHorizonData: (data) => set(state => {
      state.horizonData = data;
    }),
    
    addHorizon: (horizon) => set(state => {
      state.horizonData.push(horizon);
    }),
    
    setFaultData: (data) => set(state => {
      state.faultData = data;
    }),
    
    addFault: (fault) => set(state => {
      state.faultData.push(fault);
    }),
    
    setGridData: (data) => set(state => {
      state.gridData = data;
    }),
    
    setNumLayers: (layers) => set(state => {
      state.numLayers = Math.max(1, Math.min(50, layers));
    }),
    
    setIsGenerating: (generating) => set(state => {
      state.isGenerating = generating;
    }),
    
    setVisualization: (vis) => set(state => {
      state.visualization = vis;
    }),
    
    setViewMode: (mode) => set(state => {
      state.viewMode = mode;
    }),
    
    setShowFaults: (show) => set(state => {
      state.showFaults = show;
    }),
    
    setShowWells: (show) => set(state => {
      state.showWells = show;
    }),
    
    setCamera: (camera) => set(state => {
      state.camera = { ...state.camera, ...camera };
    }),
    
    resetCamera: () => set(state => {
      state.camera = {
        rotX: -20,
        rotY: 45,
        rotZ: 0,
        zoom: 1,
        panX: 0,
        panY: 0
      };
    }),
    
    setIsDragging: (dragging) => set(state => {
      state.isDragging = dragging;
    }),
    
    setLastMouse: (mouse) => set(state => {
      state.lastMouse = mouse;
    }),

    // Lighting actions
    setLighting: (lighting) => set(state => {
      state.lighting = { ...state.lighting, ...lighting };
    }),

    setAmbientLight: (ambient) => set(state => {
      state.lighting.ambient = ambient;
    }),

    setDirectionalLight: (directional) => set(state => {
      state.lighting.directional = directional;
    }),

    setLightIntensity: (intensity) => set(state => {
      state.lighting.intensity = intensity;
    }),
    
    // Computed values
    canGenerateGrid: () => {
      const state = get();
      return state.horizonData.length >= 2 && !state.isGenerating;
    },
    
    // Clear all data
    clearAllData: () => set(state => {
      state.horizonData = [];
      state.faultData = [];
      state.gridData = null;
      state.wellPaths = [];
      state.gridCells = [];
    }),

    // Well path actions
    addWellPath: (wellPath) => set(state => {
      state.wellPaths.push(wellPath);
    }),

    removeWellPath: (wellPathId) => set(state => {
      state.wellPaths = state.wellPaths.filter(wp => wp.id !== wellPathId);
    }),

    toggleWellPathVisibility: (wellPathId) => set(state => {
      const wellPath = state.wellPaths.find(wp => wp.id === wellPathId);
      if (wellPath) {
        wellPath.visible = !wellPath.visible;
      }
    }),

    updateWellPathIntersections: (wellPathId, intersections) => set(state => {
      const wellPath = state.wellPaths.find(wp => wp.id === wellPathId);
      if (wellPath) {
        wellPath.intersections = intersections;
      }
    }),

    setGridCells: (cells) => set(state => {
      state.gridCells = cells;
    })
  }))
);

export { useGeologicalStore };
export default useGeologicalStore;
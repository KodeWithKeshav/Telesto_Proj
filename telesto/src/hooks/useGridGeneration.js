import { useCallback } from 'react';
import toast from 'react-hot-toast';
import useGeologicalStore from '../stores/geologicalStore';
import { 
  geologicalInterpolation, 
  calculateAdvancedFaultInfluence, 
  calculateBounds 
} from '../utils/geologicalUtils';

const useGridGeneration = () => {
  const {
    horizonData,
    faultData,
    numLayers,
    setGridData,
    setIsGenerating
  } = useGeologicalStore();

  const generateGeologicalGrid = useCallback(async () => {
    if (horizonData.length < 2) {
      toast.error('Please provide at least two horizon surfaces (top and bottom)');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const topHorizon = horizonData[0].points;
      const bottomHorizon = horizonData[1].points;
      const grid = [];
      
      // Calculate bounds
      const allPoints = [...topHorizon, ...bottomHorizon];
      const bounds = calculateBounds(allPoints);
      
      if (!bounds) {
        throw new Error('Unable to calculate data bounds');
      }
      
      const gridSpacing = Math.min(
        (bounds.xMax - bounds.xMin) / 50,
        (bounds.yMax - bounds.yMin) / 50
      );
      
      let totalVolume = 0;
      let pointCount = 0;
      
      // Progress tracking
      const totalSteps = Math.ceil((bounds.xMax - bounds.xMin) / gridSpacing) * 
                        Math.ceil((bounds.yMax - bounds.yMin) / gridSpacing);
      let currentStep = 0;
      
      // Show progress toast
      const progressToast = toast.loading('Generating geological grid...', {
        duration: Infinity
      });
      
      for (let x = bounds.xMin; x <= bounds.xMax; x += gridSpacing) {
        for (let y = bounds.yMin; y <= bounds.yMax; y += gridSpacing) {
          currentStep++;
          
          // Update progress every 100 steps
          if (currentStep % 100 === 0) {
            const progress = (currentStep / totalSteps * 100).toFixed(1);
            toast.loading(`Generating grid... ${progress}%`, {
              id: progressToast
            });
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          
          // Get surface elevations using geological interpolation
          const topZ = geologicalInterpolation(x, y, topHorizon);
          const bottomZ = geologicalInterpolation(x, y, bottomHorizon);
          
          if (topZ <= bottomZ) continue; // Skip invalid geology
          
          const thickness = topZ - bottomZ;
          const layerThickness = thickness / (numLayers + 1);
          
          // Generate proportional layers
          for (let layerIdx = 0; layerIdx <= numLayers + 1; layerIdx++) {
            const layerRatio = layerIdx / (numLayers + 1);
            let z = bottomZ + layerRatio * thickness;
            
            // Apply structural deformation
            const structuralDip = Math.sin(x * 0.001) * Math.cos(y * 0.001) * 10;
            z += structuralDip * layerRatio;
            
            // Calculate fault influence
            const faultInfo = calculateAdvancedFaultInfluence(x, y, z, faultData);
            z += faultInfo.displacement;
            
            // Calculate geological properties
            const cellVolume = gridSpacing * gridSpacing * layerThickness;
            const porosity = 0.15 + Math.random() * 0.15; // 15-30%
            const permeability = Math.pow(10, (Math.random() * 3) - 1); // 0.1-100 mD
            
            // Well intersection probability based on structural highs
            const isWellLocation = (Math.random() < 0.02 && 
                                  z > bottomZ + thickness * 0.7) ? 1 : 0;
            
            totalVolume += cellVolume;
            pointCount++;
            
            grid.push({
              x: Math.round(x * 100) / 100,
              y: Math.round(y * 100) / 100,
              z: Math.round(z * 100) / 100,
              layer: layerIdx,
              bulkVolume: Math.round(cellVolume * 100) / 100,
              faultFlag: faultInfo.faultFlag,
              wellPath: isWellLocation,
              porosity: Math.round(porosity * 1000) / 1000,
              permeability: Math.round(permeability * 100) / 100,
              structuralDip: Math.round(structuralDip * 10) / 10
            });
          }
        }
      }
      
      const gridData = {
        points: grid,
        totalVolume: Math.round(totalVolume),
        layerCount: numLayers + 2,
        pointCount: pointCount,
        bounds: bounds,
        generatedAt: new Date().toISOString()
      };
      
      setGridData(gridData);
      
      toast.success(`Grid generated successfully! ${pointCount.toLocaleString()} points`, {
        id: progressToast
      });
      
    } catch (error) {
      console.error('Grid generation failed:', error);
      toast.error(`Grid generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [horizonData, faultData, numLayers, setGridData, setIsGenerating]);

  return {
    generateGeologicalGrid
  };
};

export default useGridGeneration;
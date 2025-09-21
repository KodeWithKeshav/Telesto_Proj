// Geological analysis utilities for reservoir characterization and structural analysis

/**
 * Calculate volume statistics for geological grid
 */
export const calculateVolumeStatistics = async (gridCells) => {
  if (!gridCells || gridCells.length === 0) {
    throw new Error('No grid data available for volume analysis');
  }

  // Calculate cell volumes (assuming cubic cells)
  const cellVolumes = gridCells.map(cell => {
    // Estimate cell volume based on spacing to nearby cells
    const cellSize = 25; // Default 25m x 25m x variable thickness
    const thickness = 10; // Default 10m thickness
    return cellSize * cellSize * thickness;
  });

  const totalVolume = cellVolumes.reduce((sum, vol) => sum + vol, 0);
  
  // Calculate pore volume using porosity
  const poreVolume = gridCells.reduce((sum, cell, index) => {
    const porosity = cell.porosity || 0.15; // Default 15% porosity
    return sum + (cellVolumes[index] * porosity);
  }, 0);

  // Calculate net volume (cells with porosity > cutoff)
  const porosityCutoff = 0.05; // 5% cutoff
  const netCells = gridCells.filter(cell => (cell.porosity || 0.15) > porosityCutoff);
  const netVolume = netCells.reduce((sum, cell, index) => {
    const cellIndex = gridCells.indexOf(cell);
    return sum + cellVolumes[cellIndex];
  }, 0);

  const netGrossRatio = netVolume / totalVolume;

  // Volume by layer
  const layerVolumes = {};
  gridCells.forEach((cell, index) => {
    const layer = cell.layer || 1;
    if (!layerVolumes[layer]) {
      layerVolumes[layer] = 0;
    }
    layerVolumes[layer] += cellVolumes[index];
  });

  const layerVolumeArray = Object.entries(layerVolumes).map(([layer, volume]) => ({
    layer: parseInt(layer),
    volume
  })).sort((a, b) => a.layer - b.layer);

  return {
    totalVolume,
    poreVolume,
    netVolume,
    netGrossRatio,
    layerVolumes: layerVolumeArray,
    averagePorosity: gridCells.reduce((sum, cell) => sum + (cell.porosity || 0.15), 0) / gridCells.length,
    cellCount: gridCells.length,
    netCellCount: netCells.length
  };
};

/**
 * Generate thickness map and isopach analysis
 */
export const generateThicknessMap = async (gridCells, horizonData) => {
  if (!gridCells || gridCells.length === 0) {
    throw new Error('No grid data available for thickness analysis');
  }

  // Calculate thickness for each cell based on layer positions
  const thicknesses = [];
  const layers = [...new Set(gridCells.map(cell => cell.layer))].sort((a, b) => a - b);
  
  if (layers.length < 2) {
    throw new Error('Need at least 2 layers for thickness calculation');
  }

  // Group cells by X,Y position
  const positionGroups = {};
  gridCells.forEach(cell => {
    const key = `${Math.round(cell.x)},${Math.round(cell.y)}`;
    if (!positionGroups[key]) {
      positionGroups[key] = [];
    }
    positionGroups[key].push(cell);
  });

  // Calculate thickness at each position
  Object.values(positionGroups).forEach(cells => {
    if (cells.length >= 2) {
      cells.sort((a, b) => a.z - b.z); // Sort by depth
      const topZ = cells[0].z;
      const bottomZ = cells[cells.length - 1].z;
      const thickness = Math.abs(bottomZ - topZ);
      
      thicknesses.push({
        x: cells[0].x,
        y: cells[0].y,
        thickness,
        layers: cells.length
      });
    }
  });

  if (thicknesses.length === 0) {
    throw new Error('Could not calculate thicknesses from grid data');
  }

  const thicknessValues = thicknesses.map(t => t.thickness);
  const averageThickness = thicknessValues.reduce((sum, t) => sum + t, 0) / thicknessValues.length;
  const maxThickness = Math.max(...thicknessValues);
  const minThickness = Math.min(...thicknessValues);

  // Create thickness distribution
  const ranges = [
    { min: 0, max: maxThickness * 0.2, range: `0-${(maxThickness * 0.2).toFixed(0)}m` },
    { min: maxThickness * 0.2, max: maxThickness * 0.4, range: `${(maxThickness * 0.2).toFixed(0)}-${(maxThickness * 0.4).toFixed(0)}m` },
    { min: maxThickness * 0.4, max: maxThickness * 0.6, range: `${(maxThickness * 0.4).toFixed(0)}-${(maxThickness * 0.6).toFixed(0)}m` },
    { min: maxThickness * 0.6, max: maxThickness * 0.8, range: `${(maxThickness * 0.6).toFixed(0)}-${(maxThickness * 0.8).toFixed(0)}m` },
    { min: maxThickness * 0.8, max: maxThickness, range: `${(maxThickness * 0.8).toFixed(0)}-${maxThickness.toFixed(0)}m` }
  ];

  ranges.forEach(range => {
    range.count = thicknessValues.filter(t => t >= range.min && t < range.max).length;
    range.percentage = (range.count / thicknessValues.length) * 100;
  });

  return {
    averageThickness,
    maxThickness,
    minThickness,
    thicknessMap: {
      points: thicknesses,
      ranges
    },
    totalPositions: thicknesses.length
  };
};

/**
 * Perform structural analysis on horizon data
 */
export const performStructuralAnalysis = async (horizonData) => {
  if (!horizonData || horizonData.length < 3) {
    throw new Error('Need at least 3 horizon points for structural analysis');
  }

  const dips = [];
  const strikes = [];
  const structuralTrends = [];

  // Calculate local dip and strike for each set of 3 points
  for (let i = 0; i < horizonData.length - 2; i++) {
    const p1 = horizonData[i];
    const p2 = horizonData[i + 1];
    const p3 = horizonData[i + 2];

    // Calculate vectors
    const v1 = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: p2.z - p1.z
    };
    
    const v2 = {
      x: p3.x - p1.x,
      y: p3.y - p1.y,
      z: p3.z - p1.z
    };

    // Cross product to find normal vector
    const normal = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };

    // Normalize
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (length > 0) {
      normal.x /= length;
      normal.y /= length;
      normal.z /= length;

      // Calculate dip (angle from horizontal)
      const dip = Math.acos(Math.abs(normal.z)) * (180 / Math.PI);
      dips.push(dip);

      // Calculate strike (direction of horizontal line on plane)
      const strike = Math.atan2(normal.x, normal.y) * (180 / Math.PI);
      strikes.push(strike < 0 ? strike + 360 : strike);
    }
  }

  const averageDip = dips.length > 0 ? dips.reduce((sum, dip) => sum + dip, 0) / dips.length : 0;
  const maxDip = dips.length > 0 ? Math.max(...dips) : 0;
  
  // Calculate dominant strike direction
  const strikeBins = new Array(36).fill(0); // 10-degree bins
  strikes.forEach(strike => {
    const bin = Math.floor(strike / 10);
    strikeBins[bin]++;
  });
  
  const dominantBin = strikeBins.indexOf(Math.max(...strikeBins));
  const dominantStrike = dominantBin * 10 + 5; // Center of bin

  // Identify structural trends
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  directions.forEach((direction, index) => {
    const binStart = index * 45;
    const binEnd = (index + 1) * 45;
    const count = strikes.filter(s => s >= binStart && s < binEnd).length;
    
    if (count > 0) {
      structuralTrends.push({
        direction,
        strength: count / strikes.length,
        count
      });
    }
  });

  structuralTrends.sort((a, b) => b.strength - a.strength);

  return {
    averageDip,
    maxDip,
    dominantStrike,
    structuralTrends: structuralTrends.slice(0, 3), // Top 3 trends
    dipDistribution: {
      gentle: dips.filter(d => d < 10).length,
      moderate: dips.filter(d => d >= 10 && d < 30).length,
      steep: dips.filter(d => d >= 30).length
    },
    totalMeasurements: dips.length
  };
};

/**
 * Calculate reservoir properties and flow characteristics
 */
export const calculateReservoirProperties = async (gridCells) => {
  if (!gridCells || gridCells.length === 0) {
    throw new Error('No grid data available for reservoir analysis');
  }

  const cellsWithProperties = gridCells.filter(cell => 
    cell.porosity !== undefined && cell.permeability !== undefined
  );

  if (cellsWithProperties.length === 0) {
    throw new Error('No cells with porosity and permeability data');
  }

  const porosities = cellsWithProperties.map(cell => cell.porosity);
  const permeabilities = cellsWithProperties.map(cell => cell.permeability);

  const averagePorosity = porosities.reduce((sum, p) => sum + p, 0) / porosities.length;
  const averagePermeability = permeabilities.reduce((sum, k) => sum + k, 0) / permeabilities.length;

  // Calculate flow capacity (kh product)
  const thickness = 10; // Assumed cell thickness
  const flowCapacity = averagePermeability * thickness;

  // Calculate storage capacity (phi*h product)
  const storageCapacity = averagePorosity * thickness;

  // Reservoir quality ranking
  const qualityRanking = [
    {
      category: 'Excellent',
      criteria: (p, k) => p > 0.20 && k > 100,
      count: 0,
      percentage: 0
    },
    {
      category: 'Good',
      criteria: (p, k) => p > 0.15 && k > 50,
      count: 0,
      percentage: 0
    },
    {
      category: 'Fair',
      criteria: (p, k) => p > 0.10 && k > 10,
      count: 0,
      percentage: 0
    },
    {
      category: 'Poor',
      criteria: (p, k) => p > 0.05 && k > 1,
      count: 0,
      percentage: 0
    },
    {
      category: 'Tight',
      criteria: (p, k) => p <= 0.05 || k <= 1,
      count: 0,
      percentage: 0
    }
  ];

  cellsWithProperties.forEach(cell => {
    for (let i = 0; i < qualityRanking.length; i++) {
      if (qualityRanking[i].criteria(cell.porosity, cell.permeability)) {
        qualityRanking[i].count++;
        break;
      }
    }
  });

  qualityRanking.forEach(quality => {
    quality.percentage = (quality.count / cellsWithProperties.length) * 100;
  });

  // Permeability statistics
  const logPermeabilities = permeabilities.map(k => Math.log10(Math.max(k, 0.001)));
  const geometricMeanPerm = Math.pow(10, logPermeabilities.reduce((sum, logK) => sum + logK, 0) / logPermeabilities.length);

  return {
    averagePorosity,
    averagePermeability,
    geometricMeanPermeability: geometricMeanPerm,
    flowCapacity,
    storageCapacity,
    qualityRanking,
    porosityRange: {
      min: Math.min(...porosities),
      max: Math.max(...porosities),
      std: calculateStandardDeviation(porosities)
    },
    permeabilityRange: {
      min: Math.min(...permeabilities),
      max: Math.max(...permeabilities),
      std: calculateStandardDeviation(permeabilities)
    },
    cellsAnalyzed: cellsWithProperties.length
  };
};

/**
 * Generate comprehensive statistical summary
 */
export const generateStatisticalSummary = async (gridCells, horizonData, wellPaths) => {
  const summary = {};

  // Grid statistics
  if (gridCells && gridCells.length > 0) {
    const activeCells = gridCells.filter(cell => 
      cell.porosity !== undefined || cell.permeability !== undefined
    );
    
    const layers = [...new Set(gridCells.map(cell => cell.layer))];
    
    summary.gridStats = {
      totalCells: gridCells.length,
      activeCells: activeCells.length,
      layers: layers.length,
      bounds: {
        x: { min: Math.min(...gridCells.map(c => c.x)), max: Math.max(...gridCells.map(c => c.x)) },
        y: { min: Math.min(...gridCells.map(c => c.y)), max: Math.max(...gridCells.map(c => c.y)) },
        z: { min: Math.min(...gridCells.map(c => c.z)), max: Math.max(...gridCells.map(c => c.z)) }
      }
    };
  }

  // Well statistics
  if (wellPaths && wellPaths.length > 0) {
    const totalDepth = wellPaths.reduce((sum, well) => sum + (well.totalDepth || 0), 0);
    const averageDepth = totalDepth / wellPaths.length;
    const totalPoints = wellPaths.reduce((sum, well) => sum + (well.points?.length || 0), 0);

    summary.wellStats = {
      totalWells: wellPaths.length,
      totalDepth,
      averageDepth,
      totalPoints,
      wellsWithIntersections: wellPaths.filter(well => well.intersections?.length > 0).length
    };
  }

  // Horizon statistics
  if (horizonData && horizonData.length > 0) {
    summary.horizonStats = {
      totalPoints: horizonData.length,
      bounds: {
        x: { min: Math.min(...horizonData.map(h => h.x)), max: Math.max(...horizonData.map(h => h.x)) },
        y: { min: Math.min(...horizonData.map(h => h.y)), max: Math.max(...horizonData.map(h => h.y)) },
        z: { min: Math.min(...horizonData.map(h => h.z)), max: Math.max(...horizonData.map(h => h.z)) }
      }
    };
  }

  // Data quality assessment
  const dataQuality = {
    completeness: 0,
    consistency: 0,
    coverage: 0
  };

  if (gridCells && gridCells.length > 0) {
    const cellsWithPorosity = gridCells.filter(cell => cell.porosity !== undefined).length;
    const cellsWithPermeability = gridCells.filter(cell => cell.permeability !== undefined).length;
    
    dataQuality.completeness = Math.min(
      cellsWithPorosity / gridCells.length,
      cellsWithPermeability / gridCells.length
    );

    // Simple consistency check (values within reasonable ranges)
    const validPorosity = gridCells.filter(cell => 
      cell.porosity !== undefined && cell.porosity >= 0 && cell.porosity <= 1
    ).length;
    const validPermeability = gridCells.filter(cell => 
      cell.permeability !== undefined && cell.permeability >= 0 && cell.permeability <= 10000
    ).length;

    dataQuality.consistency = Math.min(
      validPorosity / Math.max(cellsWithPorosity, 1),
      validPermeability / Math.max(cellsWithPermeability, 1)
    );

    dataQuality.coverage = gridCells.length / (gridCells.length * 1.1); // Assume 10% potential missing
  }

  summary.dataQuality = dataQuality;

  return summary;
};

/**
 * Helper function to calculate standard deviation
 */
const calculateStandardDeviation = (values) => {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  
  return Math.sqrt(variance);
};
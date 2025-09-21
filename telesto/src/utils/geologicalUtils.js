/**
 * Parse CSV data and extract geological coordinates
 * @param {string} csvText - Raw CSV text
 * @param {string} type - Data type ('horizon' or 'fault')
 * @returns {Array} Array of parsed points
 */
export const parseCSVData = (csvText, type) => {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const points = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 3) {
        const point = {};
        
        // Map common column names to standard format
        headers.forEach((header, idx) => {
          const value = parseFloat(values[idx]);
          if (!isNaN(value)) {
            if (header.includes('x') || header.includes('easting')) point.x = value;
            else if (header.includes('y') || header.includes('northing')) point.y = value;
            else if (header.includes('z') || header.includes('depth') || header.includes('elevation')) point.z = value;
            else if (header.includes('seg') || header.includes('fault')) point.segId = Math.floor(value);
          }
        });
        
        if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
          points.push(point);
        }
      }
    }
    
    return points;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

/**
 * Generate realistic horizon data for testing
 * @returns {Array} Array of horizon objects
 */
export const generateRealisticHorizons = () => {
  const topHorizon = [];
  const bottomHorizon = [];
  
  // Create more realistic geological surfaces with structural features
  for (let x = 0; x <= 20; x++) {
    for (let y = 0; y <= 20; y++) {
      const realX = x * 50;
      const realY = y * 50;
      
      // Top surface: anticlinal structure with gentle dip
      const topZ = 2000 + 
        Math.sin(x * 0.2) * 150 + 
        Math.cos(y * 0.15) * 100 +
        Math.sin(x * 0.1) * Math.cos(y * 0.1) * 80 +
        (Math.random() - 0.5) * 20; // Add noise
      
      // Bottom surface: deeper with more variation
      const bottomZ = topZ - 400 - 
        Math.sin(x * 0.25) * 120 - 
        Math.cos(y * 0.18) * 80 -
        Math.sin(x * 0.12) * Math.sin(y * 0.08) * 60 +
        (Math.random() - 0.5) * 30;
      
      topHorizon.push({ x: realX, y: realY, z: topZ });
      bottomHorizon.push({ x: realX, y: realY, z: bottomZ });
    }
  }
  
  return [
    { name: 'Top Formation', points: topHorizon, color: '#4ade80' },
    { name: 'Base Formation', points: bottomHorizon, color: '#f59e0b' }
  ];
};

/**
 * Generate realistic fault data for testing
 * @returns {Array} Array of fault objects
 */
export const generateRealisticFaults = () => {
  const fault1Points = [];
  const fault2Points = [];
  
  // Main fault - listric fault with curved geometry
  for (let y = 0; y <= 1000; y += 50) {
    for (let z = 1400; z <= 2200; z += 40) {
      const dip = 70 + Math.sin(z * 0.002) * 15; // Variable dip
      const x = 500 + (z - 1400) * Math.tan(dip * Math.PI / 180) * 0.3;
      fault1Points.push({ x, y, z, segId: 1 });
    }
  }
  
  // Secondary fault - normal fault
  for (let x = 200; x <= 800; x += 50) {
    for (let z = 1500; z <= 2100; z += 40) {
      const y = 600 + Math.sin(x * 0.01) * 50;
      fault2Points.push({ x, y, z, segId: 2 });
    }
  }
  
  return [
    { name: 'Main Fault', points: fault1Points, color: '#ef4444' },
    { name: 'Secondary Fault', points: fault2Points, color: '#8b5cf6' }
  ];
};

/**
 * Advanced interpolation with geological constraints
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Array} points - Array of point data
 * @param {string} method - Interpolation method
 * @returns {number} Interpolated Z value
 */
export const geologicalInterpolation = (x, y, points, method = 'kriging') => {
  if (points.length === 0) return 0;
  
  // Find nearest points for local interpolation
  const nearestPoints = points
    .map(p => ({
      ...p,
      distance: Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, Math.min(8, points.length));
  
  if (nearestPoints.length === 0) return 0;
  
  // Inverse distance weighting with geological constraints
  let weightSum = 0;
  let valueSum = 0;
  
  nearestPoints.forEach(point => {
    const distance = Math.max(point.distance, 1);
    const weight = 1 / (distance ** 2);
    weightSum += weight;
    valueSum += point.z * weight;
  });
  
  return weightSum > 0 ? valueSum / weightSum : nearestPoints[0].z;
};

/**
 * Calculate advanced fault influence
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @param {Array} faults - Array of fault data
 * @param {number} influenceRadius - Radius of fault influence
 * @returns {Object} Fault influence information
 */
export const calculateAdvancedFaultInfluence = (x, y, z, faults, influenceRadius = 100) => {
  let totalInfluence = 0;
  let dominantFault = 0;
  let maxInfluence = 0;
  
  faults.forEach(fault => {
    fault.points.forEach(point => {
      const distance = Math.sqrt(
        (x - point.x) ** 2 + 
        (y - point.y) ** 2 + 
        (z - point.z) ** 2
      );
      
      if (distance < influenceRadius) {
        const influence = Math.exp(-distance / (influenceRadius * 0.3));
        totalInfluence += influence;
        
        if (influence > maxInfluence) {
          maxInfluence = influence;
          dominantFault = point.segId || 1;
        }
      }
    });
  });
  
  return {
    influence: Math.min(totalInfluence, 1),
    faultFlag: maxInfluence > 0.1 ? dominantFault : 0,
    displacement: totalInfluence * 50 * (Math.random() - 0.5)
  };
};

/**
 * Export grid data to CSV format
 * @param {Object} gridData - Grid data object
 * @returns {string} CSV content
 */
export const exportGridToCSV = (gridData) => {
  if (!gridData || !gridData.points) {
    throw new Error('No grid data to export');
  }
  
  const headers = [
    'X', 'Y', 'Z', 'Layer', 'BulkVolume', 'FaultFlag', 'WellPath',
    'Porosity', 'Permeability', 'StructuralDip'
  ];
  
  const csvContent = [
    headers.join(','),
    ...gridData.points.map(point => 
      `${point.x},${point.y},${point.z},${point.layer},${point.bulkVolume},${point.faultFlag},${point.wellPath},${point.porosity || 0},${point.permeability || 0},${point.structuralDip || 0}`
    )
  ].join('\n');
  
  return csvContent;
};

/**
 * Download file with given content
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType = 'text/csv') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Calculate bounds from point data
 * @param {Array} points - Array of points
 * @returns {Object} Bounds object
 */
export const calculateBounds = (points) => {
  if (points.length === 0) return null;
  
  return {
    xMin: Math.min(...points.map(p => p.x)),
    xMax: Math.max(...points.map(p => p.x)),
    yMin: Math.min(...points.map(p => p.y)),
    yMax: Math.max(...points.map(p => p.y)),
    zMin: Math.min(...points.map(p => p.z)),
    zMax: Math.max(...points.map(p => p.z))
  };
};

/**
 * Validate geological data
 * @param {Array} data - Geological data to validate
 * @param {string} type - Data type ('horizon' or 'fault')
 * @returns {Object} Validation result
 */
export const validateGeologicalData = (data, type) => {
  const errors = [];
  const warnings = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('No data provided');
    return { isValid: false, errors, warnings };
  }
  
  // Check for required properties
  data.forEach((point, index) => {
    if (typeof point.x !== 'number' || isNaN(point.x)) {
      errors.push(`Point ${index + 1}: Invalid X coordinate`);
    }
    if (typeof point.y !== 'number' || isNaN(point.y)) {
      errors.push(`Point ${index + 1}: Invalid Y coordinate`);
    }
    if (typeof point.z !== 'number' || isNaN(point.z)) {
      errors.push(`Point ${index + 1}: Invalid Z coordinate`);
    }
    
    if (type === 'fault' && point.segId === undefined) {
      warnings.push(`Point ${index + 1}: Missing segment ID`);
    }
  });
  
  // Check for data quality
  if (data.length < 10) {
    warnings.push('Small dataset - results may be less accurate');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
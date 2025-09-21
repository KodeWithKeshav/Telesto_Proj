// Well path utilities for geological modeling

/**
 * Parse CSV file containing well path data
 * Expected format: X, Y, Z, MD (Measured Depth)
 */
export const parseWellPathCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain header and at least one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Validate required columns
        const requiredColumns = ['x', 'y', 'z'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const points = [];
        let totalDepth = 0;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          if (values.length !== headers.length) {
            console.warn(`Skipping row ${i + 1}: incorrect number of columns`);
            continue;
          }

          const point = {};
          headers.forEach((header, index) => {
            const value = parseFloat(values[index]);
            if (!isNaN(value)) {
              point[header] = value;
            }
          });

          // Calculate measured depth if not provided
          if (!point.md && points.length > 0) {
            const prevPoint = points[points.length - 1];
            const distance = Math.sqrt(
              Math.pow(point.x - prevPoint.x, 2) +
              Math.pow(point.y - prevPoint.y, 2) +
              Math.pow(point.z - prevPoint.z, 2)
            );
            point.md = prevPoint.md + distance;
          } else if (!point.md) {
            point.md = 0;
          }

          // Calculate TVD (True Vertical Depth)
          point.tvd = Math.abs(point.z);
          
          totalDepth = Math.max(totalDepth, point.md);
          points.push(point);
        }

        const wellPath = {
          id: `well_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace('.csv', ''),
          points,
          totalDepth,
          visible: true,
          intersections: [],
          createdAt: new Date().toISOString()
        };

        resolve(wellPath);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Generate sample well path for testing
 */
export const generateSampleWellPath = () => {
  const points = [];
  const wellTypes = ['vertical', 'deviated', 'horizontal'];
  const wellType = wellTypes[Math.floor(Math.random() * wellTypes.length)];
  
  const startX = 500000 + Math.random() * 1000;
  const startY = 6000000 + Math.random() * 1000;
  const startZ = 0;
  
  let currentX = startX;
  let currentY = startY;
  let currentZ = startZ;
  let md = 0;

  // Generate points based on well type
  for (let i = 0; i <= 100; i++) {
    const depth = i * 20; // 20m intervals
    
    switch (wellType) {
      case 'vertical':
        currentZ = depth;
        break;
        
      case 'deviated':
        if (depth > 500) {
          const deviation = (depth - 500) * 0.5;
          currentX = startX + deviation * Math.cos(Math.PI / 6);
          currentY = startY + deviation * Math.sin(Math.PI / 6);
        }
        currentZ = depth;
        break;
        
      case 'horizontal':
        if (depth < 1000) {
          currentZ = depth;
        } else {
          const horizontal = depth - 1000;
          currentX = startX + horizontal * Math.cos(Math.PI / 4);
          currentY = startY + horizontal * Math.sin(Math.PI / 4);
          currentZ = 1000 + horizontal * 0.1; // Slight inclination
        }
        break;
    }

    // Calculate measured depth
    if (i > 0) {
      const prevPoint = points[points.length - 1];
      const distance = Math.sqrt(
        Math.pow(currentX - prevPoint.x, 2) +
        Math.pow(currentY - prevPoint.y, 2) +
        Math.pow(currentZ - prevPoint.z, 2)
      );
      md += distance;
    }

    points.push({
      x: currentX,
      y: currentY,
      z: currentZ,
      md: md,
      tvd: currentZ
    });
  }

  return {
    id: `sample_well_${Date.now()}`,
    name: `Sample ${wellType.charAt(0).toUpperCase() + wellType.slice(1)} Well`,
    points,
    totalDepth: md,
    visible: true,
    intersections: [],
    createdAt: new Date().toISOString(),
    sampleWell: true
  };
};

/**
 * Calculate intersections between well path and geological grid
 */
export const calculateWellIntersections = async (wellPath, gridCells) => {
  return new Promise((resolve) => {
    const intersections = [];
    
    // For each well point, find the closest grid cell
    wellPath.points.forEach((wellPoint, index) => {
      let closestCell = null;
      let minDistance = Infinity;
      
      // Find the grid cell that contains or is closest to the well point
      gridCells.forEach(cell => {
        const distance = Math.sqrt(
          Math.pow(wellPoint.x - cell.x, 2) +
          Math.pow(wellPoint.y - cell.y, 2) +
          Math.pow(wellPoint.z - cell.z, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestCell = cell;
        }
      });

      if (closestCell && minDistance < 100) { // Within 100m tolerance
        intersections.push({
          wellPointIndex: index,
          x: wellPoint.x,
          y: wellPoint.y,
          z: wellPoint.z,
          md: wellPoint.md,
          tvd: wellPoint.tvd,
          layer: closestCell.layer,
          porosity: closestCell.porosity,
          permeability: closestCell.permeability,
          facies: closestCell.facies,
          distance: minDistance
        });
      }
    });

    // Sort by measured depth
    intersections.sort((a, b) => a.md - b.md);
    
    resolve(intersections);
  });
};

/**
 * Calculate well path statistics
 */
export const calculateWellStatistics = (wellPath) => {
  if (!wellPath.points || wellPath.points.length === 0) {
    return null;
  }

  const points = wellPath.points;
  const stats = {
    totalPoints: points.length,
    totalDepth: wellPath.totalDepth,
    maxTVD: Math.max(...points.map(p => p.tvd)),
    avgDeviation: 0,
    maxDeviation: 0,
    verticalSection: 0,
    deviatedSection: 0,
    horizontalSection: 0
  };

  // Calculate deviations and sections
  let totalDeviation = 0;
  let maxDeviation = 0;
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];
    
    // Calculate inclination angle
    const deltaZ = currentPoint.z - prevPoint.z;
    const deltaH = Math.sqrt(
      Math.pow(currentPoint.x - prevPoint.x, 2) +
      Math.pow(currentPoint.y - prevPoint.y, 2)
    );
    
    const inclination = Math.atan2(deltaH, Math.abs(deltaZ)) * (180 / Math.PI);
    totalDeviation += inclination;
    maxDeviation = Math.max(maxDeviation, inclination);
    
    // Classify section type
    const sectionLength = currentPoint.md - prevPoint.md;
    if (inclination < 10) {
      stats.verticalSection += sectionLength;
    } else if (inclination > 80) {
      stats.horizontalSection += sectionLength;
    } else {
      stats.deviatedSection += sectionLength;
    }
  }

  stats.avgDeviation = totalDeviation / (points.length - 1);
  stats.maxDeviation = maxDeviation;

  return stats;
};

/**
 * Export well path data in various formats
 */
export const exportWellPath = (wellPath, format = 'csv') => {
  switch (format) {
    case 'csv':
      return exportWellPathCSV(wellPath);
    case 'las':
      return exportWellPathLAS(wellPath);
    case 'json':
      return exportWellPathJSON(wellPath);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

const exportWellPathCSV = (wellPath) => {
  const headers = ['X', 'Y', 'Z', 'MD', 'TVD'];
  const rows = wellPath.points.map(point => [
    point.x.toFixed(2),
    point.y.toFixed(2),
    point.z.toFixed(2),
    point.md.toFixed(2),
    point.tvd.toFixed(2)
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const exportWellPathLAS = (wellPath) => {
  // Simplified LAS format
  const header = `~VERSION INFORMATION
VERS.                          2.0 : CWLS LOG ASCII STANDARD -VERSION 2.0
WRAP.                          NO  : ONE LINE PER DEPTH STEP
~WELL INFORMATION
STRT.M              0.00 : START DEPTH
STOP.M              ${wellPath.totalDepth.toFixed(2)} : STOP DEPTH
STEP.M              1.00 : STEP
NULL.               -999.25 : NULL VALUE
COMP.               : COMPANY
WELL.               ${wellPath.name} : WELL
FLD .               : FIELD
LOC .               : LOCATION
PROV.               : PROVINCE
CNTY.               : COUNTY
STAT.               : STATE
CTRY.               : COUNTRY
SRVC.               : SERVICE COMPANY
DATE.               ${new Date().toISOString().split('T')[0]} : DATE
UWI .               : UNIQUE WELL ID
~CURVE INFORMATION
DEPT.M              : Depth
X   .M              : X Coordinate
Y   .M              : Y Coordinate
Z   .M              : Z Coordinate
~ASCII
`;

  const data = wellPath.points.map(point =>
    `${point.md.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)} ${point.z.toFixed(2)}`
  ).join('\n');

  return header + data;
};

const exportWellPathJSON = (wellPath) => {
  return JSON.stringify(wellPath, null, 2);
};
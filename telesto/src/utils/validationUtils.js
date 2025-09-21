// Data validation utilities for geological datasets

/**
 * Validate horizon data for common issues
 */
export const validateHorizonData = async (horizonData) => {
  const issues = [];
  
  if (!horizonData || horizonData.length === 0) {
    return { issues: [], severity: 'success' };
  }

  // Check for missing coordinates
  const missingCoords = horizonData.filter(point => 
    point.x === undefined || point.y === undefined || point.z === undefined ||
    isNaN(point.x) || isNaN(point.y) || isNaN(point.z)
  );
  
  if (missingCoords.length > 0) {
    issues.push({
      severity: 'error',
      message: `${missingCoords.length} horizon points have missing or invalid coordinates`,
      details: `${((missingCoords.length / horizonData.length) * 100).toFixed(1)}% of total points`,
      suggestion: 'Remove or interpolate missing coordinate values'
    });
  }

  // Check for duplicate points
  const pointMap = new Map();
  const duplicates = [];
  
  horizonData.forEach((point, index) => {
    const key = `${point.x?.toFixed(2)},${point.y?.toFixed(2)}`;
    if (pointMap.has(key)) {
      duplicates.push(index);
    } else {
      pointMap.set(key, index);
    }
  });
  
  if (duplicates.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${duplicates.length} duplicate horizon points detected`,
      details: 'Points with same X,Y coordinates but different Z values',
      suggestion: 'Review duplicate points and merge or remove as appropriate'
    });
  }

  // Check for unrealistic depth values
  const depths = horizonData.map(p => p.z).filter(z => !isNaN(z));
  if (depths.length > 0) {
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);
    
    if (minDepth < -1000 || maxDepth > 10000) {
      issues.push({
        severity: 'warning',
        message: 'Horizon depths outside typical geological range',
        details: `Depth range: ${minDepth.toFixed(0)}m to ${maxDepth.toFixed(0)}m`,
        suggestion: 'Verify depth units and coordinate system'
      });
    }
  }

  // Check for spatial clustering
  if (horizonData.length > 10) {
    const spatialDensity = calculateSpatialDensity(horizonData);
    if (spatialDensity.clustered > 0.3) {
      issues.push({
        severity: 'info',
        message: 'High spatial clustering detected in horizon data',
        details: `${(spatialDensity.clustered * 100).toFixed(1)}% of points are clustered`,
        suggestion: 'Consider spatial resampling for more even distribution'
      });
    }
  }

  const severity = issues.some(i => i.severity === 'error') ? 'error' :
                  issues.some(i => i.severity === 'warning') ? 'warning' :
                  issues.length > 0 ? 'info' : 'success';

  return { issues, severity };
};

/**
 * Validate fault data
 */
export const validateFaultData = async (faultData) => {
  const issues = [];
  
  if (!faultData || faultData.length === 0) {
    return { issues: [], severity: 'success' };
  }

  // Check for missing segment IDs
  const missingSegIds = faultData.filter(point => 
    point.segId === undefined || point.segId === null || point.segId === ''
  );
  
  if (missingSegIds.length > 0) {
    issues.push({
      severity: 'error',
      message: `${missingSegIds.length} fault points missing segment IDs`,
      details: 'Segment IDs are required to group fault points',
      suggestion: 'Assign unique segment IDs to fault points'
    });
  }

  // Check segment continuity
  const segments = {};
  faultData.forEach(point => {
    if (point.segId) {
      if (!segments[point.segId]) {
        segments[point.segId] = [];
      }
      segments[point.segId].push(point);
    }
  });

  let discontinuousSegments = 0;
  Object.entries(segments).forEach(([segId, points]) => {
    if (points.length < 3) {
      discontinuousSegments++;
    } else {
      // Check for gaps in the fault trace
      points.sort((a, b) => a.x - b.x); // Simple sorting by X
      let hasGaps = false;
      
      for (let i = 1; i < points.length; i++) {
        const distance = Math.sqrt(
          Math.pow(points[i].x - points[i-1].x, 2) +
          Math.pow(points[i].y - points[i-1].y, 2)
        );
        
        if (distance > 1000) { // 1km gap threshold
          hasGaps = true;
          break;
        }
      }
      
      if (hasGaps) {
        discontinuousSegments++;
      }
    }
  });

  if (discontinuousSegments > 0) {
    issues.push({
      severity: 'warning',
      message: `${discontinuousSegments} fault segments appear discontinuous`,
      details: 'Segments with few points or large gaps detected',
      suggestion: 'Review fault traces for completeness'
    });
  }

  // Check for intersecting faults
  const segmentIds = Object.keys(segments);
  if (segmentIds.length > 1) {
    // Simplified intersection check
    let possibleIntersections = 0;
    
    for (let i = 0; i < segmentIds.length - 1; i++) {
      for (let j = i + 1; j < segmentIds.length; j++) {
        const seg1Points = segments[segmentIds[i]];
        const seg2Points = segments[segmentIds[j]];
        
        // Check if bounding boxes overlap
        const seg1Bounds = getBounds(seg1Points);
        const seg2Bounds = getBounds(seg2Points);
        
        if (boundsOverlap(seg1Bounds, seg2Bounds)) {
          possibleIntersections++;
        }
      }
    }
    
    if (possibleIntersections > 0) {
      issues.push({
        severity: 'info',
        message: `${possibleIntersections} potential fault intersections detected`,
        details: 'Overlapping fault segment boundaries found',
        suggestion: 'Verify geological validity of fault intersections'
      });
    }
  }

  const severity = issues.some(i => i.severity === 'error') ? 'error' :
                  issues.some(i => i.severity === 'warning') ? 'warning' :
                  issues.length > 0 ? 'info' : 'success';

  return { issues, severity };
};

/**
 * Validate well path data
 */
export const validateWellPaths = async (wellPaths) => {
  const issues = [];
  
  if (!wellPaths || wellPaths.length === 0) {
    return { issues: [], severity: 'success' };
  }

  wellPaths.forEach((well, wellIndex) => {
    // Check for missing well name
    if (!well.name || well.name.trim() === '') {
      issues.push({
        severity: 'warning',
        message: `Well ${wellIndex + 1} has no name`,
        details: 'Well names help identify and organize well data',
        suggestion: 'Assign descriptive names to all wells'
      });
    }

    // Check for insufficient points
    if (!well.points || well.points.length < 2) {
      issues.push({
        severity: 'error',
        message: `Well "${well.name || wellIndex + 1}" has insufficient points`,
        details: 'Wells need at least 2 points to define a path',
        suggestion: 'Add more survey points to complete the well path'
      });
      return;
    }

    // Check for monotonic depth progression
    let depthReversals = 0;
    for (let i = 1; i < well.points.length; i++) {
      if (well.points[i].md && well.points[i-1].md && 
          well.points[i].md < well.points[i-1].md) {
        depthReversals++;
      }
    }

    if (depthReversals > 0) {
      issues.push({
        severity: 'warning',
        message: `Well "${well.name}" has ${depthReversals} depth reversals`,
        details: 'Measured depth should increase along the well path',
        suggestion: 'Check well survey data for measurement errors'
      });
    }

    // Check for extreme deviations
    if (well.points.length > 2) {
      let maxDeviation = 0;
      for (let i = 1; i < well.points.length - 1; i++) {
        const p1 = well.points[i-1];
        const p2 = well.points[i];
        const p3 = well.points[i+1];
        
        // Calculate angle between segments
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
        
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        
        if (mag1 > 0 && mag2 > 0) {
          const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
          const deviation = angle * (180 / Math.PI);
          maxDeviation = Math.max(maxDeviation, deviation);
        }
      }
      
      if (maxDeviation > 45) {
        issues.push({
          severity: 'warning',
          message: `Well "${well.name}" has extreme deviation (${maxDeviation.toFixed(1)}°)`,
          details: 'Sharp turns in well path may indicate survey errors',
          suggestion: 'Review well survey data for accuracy'
        });
      }
    }
  });

  const severity = issues.some(i => i.severity === 'error') ? 'error' :
                  issues.some(i => i.severity === 'warning') ? 'warning' :
                  issues.length > 0 ? 'info' : 'success';

  return { issues, severity };
};

/**
 * Validate grid cell data
 */
export const validateGridCells = async (gridCells) => {
  const issues = [];
  
  if (!gridCells || gridCells.length === 0) {
    return { issues: [], severity: 'success' };
  }

  // Check for invalid property values
  const invalidPorosity = gridCells.filter(cell => 
    cell.porosity !== undefined && (cell.porosity < 0 || cell.porosity > 1)
  );
  
  if (invalidPorosity.length > 0) {
    issues.push({
      severity: 'error',
      message: `${invalidPorosity.length} cells have invalid porosity values`,
      details: 'Porosity must be between 0 and 1 (0-100%)',
      suggestion: 'Correct porosity values or check units'
    });
  }

  const invalidPermeability = gridCells.filter(cell => 
    cell.permeability !== undefined && cell.permeability < 0
  );
  
  if (invalidPermeability.length > 0) {
    issues.push({
      severity: 'error',
      message: `${invalidPermeability.length} cells have negative permeability`,
      details: 'Permeability cannot be negative',
      suggestion: 'Correct permeability values'
    });
  }

  // Check for missing properties
  const cellsWithProperties = gridCells.filter(cell => 
    cell.porosity !== undefined || cell.permeability !== undefined
  );
  
  if (cellsWithProperties.length < gridCells.length * 0.5) {
    issues.push({
      severity: 'warning',
      message: 'Many grid cells missing property values',
      details: `${gridCells.length - cellsWithProperties.length} of ${gridCells.length} cells lack properties`,
      suggestion: 'Consider property modeling to fill gaps'
    });
  }

  // Check grid regularity
  const layers = [...new Set(gridCells.map(cell => cell.layer))];
  if (layers.length > 1) {
    const layerCounts = {};
    gridCells.forEach(cell => {
      layerCounts[cell.layer] = (layerCounts[cell.layer] || 0) + 1;
    });
    
    const counts = Object.values(layerCounts);
    const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const irregularLayers = counts.filter(count => Math.abs(count - avgCount) > avgCount * 0.5);
    
    if (irregularLayers.length > 0) {
      issues.push({
        severity: 'info',
        message: 'Irregular grid layer distribution detected',
        details: `${irregularLayers.length} layers have significantly different cell counts`,
        suggestion: 'Review grid generation parameters for consistency'
      });
    }
  }

  const severity = issues.some(i => i.severity === 'error') ? 'error' :
                  issues.some(i => i.severity === 'warning') ? 'warning' :
                  issues.length > 0 ? 'info' : 'success';

  return { issues, severity };
};

/**
 * Detect outliers in datasets
 */
export const detectOutliers = async (datasets) => {
  const outliers = [];
  
  // Outlier detection for horizon data
  if (datasets.horizonData && datasets.horizonData.length > 10) {
    const depths = datasets.horizonData.map(p => p.z).filter(z => !isNaN(z));
    const depthOutliers = findStatisticalOutliers(depths);
    
    if (depthOutliers.length > 0) {
      outliers.push({
        severity: 'warning',
        message: `${depthOutliers.length} horizon depth outliers detected`,
        details: `Values significantly different from the mean`,
        suggestion: 'Review outlier points for data entry errors'
      });
    }
  }

  // Outlier detection for grid properties
  if (datasets.gridCells && datasets.gridCells.length > 10) {
    const porosities = datasets.gridCells
      .map(cell => cell.porosity)
      .filter(p => p !== undefined && !isNaN(p));
    
    if (porosities.length > 10) {
      const porosityOutliers = findStatisticalOutliers(porosities);
      if (porosityOutliers.length > 0) {
        outliers.push({
          severity: 'warning',
          message: `${porosityOutliers.length} porosity outliers detected`,
          details: 'Extreme porosity values found',
          suggestion: 'Validate outlier porosity measurements'
        });
      }
    }
  }

  return outliers;
};

/**
 * Suggest data healing strategies
 */
export const suggestDataHealing = async (validationResults) => {
  const suggestions = [];
  
  Object.entries(validationResults).forEach(([category, result]) => {
    if (result.issues) {
      result.issues.forEach(issue => {
        if (issue.severity === 'error') {
          if (issue.message.includes('missing coordinates')) {
            suggestions.push({
              description: 'Remove points with missing coordinates',
              impact: 'Prevents calculation errors',
              category,
              action: 'remove_invalid'
            });
          }
          
          if (issue.message.includes('invalid porosity')) {
            suggestions.push({
              description: 'Clamp porosity values to valid range (0-1)',
              impact: 'Ensures realistic property values',
              category,
              action: 'clamp_properties'
            });
          }
        }
        
        if (issue.severity === 'warning' && issue.message.includes('duplicate')) {
          suggestions.push({
            description: 'Merge duplicate points by averaging',
            impact: 'Reduces data redundancy',
            category,
            action: 'merge_duplicates'
          });
        }
      });
    }
  });

  return suggestions;
};

/**
 * Generate comprehensive quality report
 */
export const generateQualityReport = async (validationResults, datasets) => {
  const timestamp = new Date().toISOString();
  let report = `Telesto Data Quality Report
Generated: ${timestamp}
=================================\n\n`;

  // Summary
  const totalIssues = Object.values(validationResults).reduce(
    (sum, result) => sum + (result.issues?.length || 0), 0
  );
  
  report += `SUMMARY\n`;
  report += `-------\n`;
  report += `Total Issues: ${totalIssues}\n`;
  report += `Datasets Validated: ${Object.keys(validationResults).length}\n\n`;

  // Data overview
  report += `DATA OVERVIEW\n`;
  report += `-------------\n`;
  if (datasets.horizonData) {
    report += `Horizon Points: ${datasets.horizonData.length}\n`;
  }
  if (datasets.faultData) {
    report += `Fault Points: ${datasets.faultData.length}\n`;
  }
  if (datasets.wellPaths) {
    report += `Well Paths: ${datasets.wellPaths.length}\n`;
  }
  if (datasets.gridCells) {
    report += `Grid Cells: ${datasets.gridCells.length}\n`;
  }
  report += '\n';

  // Detailed issues
  Object.entries(validationResults).forEach(([category, result]) => {
    report += `${category.toUpperCase()} VALIDATION\n`;
    report += `${'-'.repeat(category.length + 11)}\n`;
    report += `Status: ${result.severity}\n`;
    report += `Issues: ${result.issues?.length || 0}\n\n`;
    
    if (result.issues) {
      result.issues.forEach((issue, index) => {
        report += `  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
        if (issue.details) {
          report += `     Details: ${issue.details}\n`;
        }
        if (issue.suggestion) {
          report += `     Suggestion: ${issue.suggestion}\n`;
        }
        report += '\n';
      });
    }
  });

  report += `\nReport generated by Telesto Geological Grid Generator\n`;
  
  return report;
};

// Helper functions

const calculateSpatialDensity = (points) => {
  // Simple clustering analysis
  const distances = [];
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.sqrt(
        Math.pow(points[i].x - points[j].x, 2) +
        Math.pow(points[i].y - points[j].y, 2)
      );
      distances.push(dist);
    }
  }
  
  if (distances.length === 0) return { clustered: 0 };
  
  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const closePoints = distances.filter(d => d < avgDistance * 0.5).length;
  
  return { clustered: closePoints / distances.length };
};

const getBounds = (points) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
};

const boundsOverlap = (bounds1, bounds2) => {
  return !(bounds1.maxX < bounds2.minX || bounds2.maxX < bounds1.minX ||
           bounds1.maxY < bounds2.minY || bounds2.maxY < bounds1.minY);
};

const findStatisticalOutliers = (values) => {
  if (values.length < 4) return [];
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(v => v < lowerBound || v > upperBound);
};
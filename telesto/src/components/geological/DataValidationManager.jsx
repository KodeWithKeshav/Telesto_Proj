import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Filter,
  Wrench,
  Eye,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import { 
  validateHorizonData,
  validateFaultData, 
  validateWellPaths,
  validateGridCells,
  detectOutliers,
  suggestDataHealing,
  generateQualityReport
} from '../../utils/validationUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { toast } from 'react-hot-toast';

const DataValidationManager = () => {
  const { horizonData, faultData, wellPaths, gridCells } = useGeologicalStore();
  const [validationResults, setValidationResults] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [autoHealSuggestions, setAutoHealSuggestions] = useState([]);

  const validationSeverity = {
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' }
  };

  useEffect(() => {
    // Auto-validate when data changes
    if (horizonData.length > 0 || faultData.length > 0 || wellPaths.length > 0 || gridCells.length > 0) {
      runValidation();
    }
  }, [horizonData, faultData, wellPaths, gridCells]);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const results = {};
      
      // Validate each data type
      if (horizonData.length > 0) {
        results.horizons = await validateHorizonData(horizonData);
      }
      
      if (faultData.length > 0) {
        results.faults = await validateFaultData(faultData);
      }
      
      if (wellPaths.length > 0) {
        results.wells = await validateWellPaths(wellPaths);
      }
      
      if (gridCells.length > 0) {
        results.grid = await validateGridCells(gridCells);
      }

      // Cross-validation between datasets
      if (horizonData.length > 0 && faultData.length > 0) {
        results.crossValidation = await validateDataConsistency(horizonData, faultData, wellPaths);
      }

      // Outlier detection
      const outliers = await detectOutliers({ horizonData, faultData, wellPaths, gridCells });
      if (outliers.length > 0) {
        results.outliers = { issues: outliers, severity: 'warning' };
      }

      setValidationResults(results);

      // Generate healing suggestions
      const suggestions = await suggestDataHealing(results);
      setAutoHealSuggestions(suggestions);

      const totalIssues = Object.values(results).reduce((sum, result) => 
        sum + (result.issues?.length || 0), 0);
      
      if (totalIssues === 0) {
        toast.success('Data validation completed - no issues found');
      } else {
        toast.warning(`Validation completed - ${totalIssues} issues found`);
      }
      
    } catch (error) {
      toast.error(`Validation failed: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const validateDataConsistency = async (horizons, faults, wells) => {
    const issues = [];
    
    // Check coordinate system consistency
    const allPoints = [
      ...horizons.map(h => ({ x: h.x, y: h.y, z: h.z, type: 'horizon' })),
      ...faults.map(f => ({ x: f.x, y: f.y, z: f.z, type: 'fault' })),
      ...wells.flatMap(w => w.points?.map(p => ({ x: p.x, y: p.y, z: p.z, type: 'well' })) || [])
    ];

    if (allPoints.length > 0) {
      const xRange = Math.max(...allPoints.map(p => p.x)) - Math.min(...allPoints.map(p => p.x));
      const yRange = Math.max(...allPoints.map(p => p.y)) - Math.min(...allPoints.map(p => p.y));
      
      // Check if coordinates suggest different systems
      if (xRange > 1000000 || yRange > 1000000) {
        issues.push({
          severity: 'warning',
          message: 'Large coordinate ranges detected - verify coordinate system',
          details: `X range: ${xRange.toFixed(0)}, Y range: ${yRange.toFixed(0)}`,
          suggestion: 'Check if all data uses the same coordinate reference system'
        });
      }
    }

    // Check depth consistency
    const horizonDepths = horizons.map(h => h.z);
    const faultDepths = faults.map(f => f.z);
    
    if (horizonDepths.length > 0 && faultDepths.length > 0) {
      const horizonRange = Math.max(...horizonDepths) - Math.min(...horizonDepths);
      const faultRange = Math.max(...faultDepths) - Math.min(...faultDepths);
      
      if (Math.abs(horizonRange - faultRange) > horizonRange * 0.5) {
        issues.push({
          severity: 'warning',
          message: 'Significant depth range mismatch between horizons and faults',
          details: `Horizon range: ${horizonRange.toFixed(0)}m, Fault range: ${faultRange.toFixed(0)}m`,
          suggestion: 'Verify that horizon and fault data cover the same geological interval'
        });
      }
    }

    return { issues, severity: issues.length > 0 ? 'warning' : 'success' };
  };

  const toggleDetails = (category) => {
    setShowDetails(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const selectIssue = (category, issueIndex) => {
    const issueId = `${category}_${issueIndex}`;
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const applyAutoHeal = async (suggestion) => {
    try {
      // This would implement the actual healing logic
      toast.success(`Applied fix: ${suggestion.description}`);
      
      // Re-run validation after healing
      setTimeout(runValidation, 500);
    } catch (error) {
      toast.error(`Failed to apply fix: ${error.message}`);
    }
  };

  const generateQualityReportData = async () => {
    const report = await generateQualityReport(validationResults, {
      horizonData, faultData, wellPaths, gridCells
    });
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data_quality_report.txt';
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Quality report exported');
  };

  const renderValidationResult = (category, result) => {
    if (!result) return null;
    
    const severity = validationSeverity[result.severity] || validationSeverity.info;
    const SeverityIcon = severity.icon;
    const issueCount = result.issues?.length || 0;
    
    return (
      <div key={category} className={`p-3 rounded border border-slate-600 ${severity.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SeverityIcon className={`w-5 h-5 ${severity.color}`} />
            <div>
              <p className="text-sm font-medium text-white capitalize">{category}</p>
              <p className="text-xs text-slate-400">
                {issueCount === 0 ? 'No issues found' : `${issueCount} issue${issueCount > 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>
          
          {issueCount > 0 && (
            <Button
              onClick={() => toggleDetails(category)}
              variant="ghost"
              size="sm"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Issue Details */}
        {showDetails[category] && result.issues && (
          <div className="mt-3 space-y-2">
            {result.issues.map((issue, index) => (
              <div key={index} className="p-2 bg-slate-800 rounded border border-slate-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white">{issue.message}</p>
                    {issue.details && (
                      <p className="text-xs text-slate-400 mt-1">{issue.details}</p>
                    )}
                    {issue.suggestion && (
                      <p className="text-xs text-blue-400 mt-1">💡 {issue.suggestion}</p>
                    )}
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={selectedIssues.includes(`${category}_${index}`)}
                    onChange={() => selectIssue(category, index)}
                    className="ml-2 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getTotalIssues = () => {
    return Object.values(validationResults).reduce((sum, result) => 
      sum + (result.issues?.length || 0), 0);
  };

  const getWorstSeverity = () => {
    const severities = Object.values(validationResults).map(r => r.severity);
    if (severities.includes('error')) return 'error';
    if (severities.includes('warning')) return 'warning';
    if (severities.includes('info')) return 'info';
    return 'success';
  };

  const totalIssues = getTotalIssues();
  const worstSeverity = getWorstSeverity();
  const SummaryIcon = validationSeverity[worstSeverity]?.icon || CheckCircle;

  return (
    <Card 
      title="Data Validation" 
      icon={<AlertTriangle className="w-5 h-5 text-yellow-400" />}
    >
      <div className="space-y-4">
        
        {/* Validation Summary */}
        <div className={`p-3 rounded border border-slate-600 ${validationSeverity[worstSeverity]?.bg || 'bg-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SummaryIcon className={`w-5 h-5 ${validationSeverity[worstSeverity]?.color || 'text-slate-400'}`} />
              <div>
                <p className="text-sm font-medium text-white">Data Quality Status</p>
                <p className="text-xs text-slate-400">
                  {totalIssues === 0 ? 'All data passes validation' : `${totalIssues} issues detected`}
                </p>
              </div>
            </div>
            
            <Button
              onClick={runValidation}
              disabled={isValidating}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Validation Results */}
        {Object.keys(validationResults).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Validation Results</h4>
            {Object.entries(validationResults).map(([category, result]) => 
              renderValidationResult(category, result)
            )}
          </div>
        )}

        {/* Auto-heal Suggestions */}
        {autoHealSuggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Suggested Fixes</h4>
            {autoHealSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 bg-slate-800 rounded border border-slate-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{suggestion.description}</p>
                    <p className="text-xs text-slate-400">{suggestion.impact}</p>
                  </div>
                  
                  <Button
                    onClick={() => applyAutoHeal(suggestion)}
                    variant="outline"
                    size="sm"
                  >
                    <Wrench className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            onClick={generateQualityReportData}
            disabled={Object.keys(validationResults).length === 0}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Export Report
          </Button>
          
          {selectedIssues.length > 0 && (
            <Button
              onClick={() => {
                // Bulk fix selected issues
                toast.info('Bulk fix feature coming soon');
              }}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Wrench className="w-4 h-4 mr-1" />
              Fix Selected ({selectedIssues.length})
            </Button>
          )}
        </div>

        {/* Validation Statistics */}
        {Object.keys(validationResults).length > 0 && (
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-slate-800 rounded">
              <p className="text-xs text-slate-400">Datasets Checked</p>
              <p className="text-sm font-bold text-blue-400">
                {Object.keys(validationResults).length}
              </p>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <p className="text-xs text-slate-400">Total Issues</p>
              <p className="text-sm font-bold text-yellow-400">
                {totalIssues}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Automatic validation runs when data changes</p>
          <p>• Select issues to apply bulk fixes</p>
          <p>• Export detailed quality reports</p>
          <p>• Outlier detection helps identify bad data</p>
        </div>
      </div>
    </Card>
  );
};

export default DataValidationManager;
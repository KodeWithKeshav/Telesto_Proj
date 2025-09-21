import React, { useState, useEffect } from 'react';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Clock, 
  Download,
  Upload,
  Archive,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useGeologicalStore } from '../../stores/geologicalStore';
import { 
  saveProject, 
  loadProject, 
  deleteProject, 
  listProjects,
  exportProject,
  importProject,
  getProjectHistory
} from '../../utils/projectUtils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { toast } from 'react-hot-toast';

const ProjectManager = () => {
  const geologicalStore = useGeologicalStore();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [projectHistory, setProjectHistory] = useState([]);

  useEffect(() => {
    loadProjectList();
    loadCurrentProject();
  }, []);

  const loadProjectList = async () => {
    try {
      const projectList = await listProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load project list:', error);
    }
  };

  const loadCurrentProject = () => {
    const savedProject = localStorage.getItem('telesto_current_project');
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        setCurrentProject(project);
        setProjectName(project.name);
      } catch (error) {
        console.error('Failed to load current project:', error);
      }
    }
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsLoading(true);
    try {
      const projectData = {
        name: projectName,
        horizonData: geologicalStore.horizonData,
        faultData: geologicalStore.faultData,
        gridCells: geologicalStore.gridCells,
        wellPaths: geologicalStore.wellPaths,
        parameters: {
          numLayers: geologicalStore.numLayers,
          visualization: geologicalStore.visualization
        },
        metadata: {
          cellCount: geologicalStore.gridCells?.length || 0,
          wellCount: geologicalStore.wellPaths?.length || 0,
          horizonCount: geologicalStore.horizonData?.length || 0
        }
      };

      const savedProject = await saveProject(projectName, projectData);
      setCurrentProject(savedProject);
      
      // Update localStorage
      localStorage.setItem('telesto_current_project', JSON.stringify(savedProject));
      
      await loadProjectList();
      toast.success(`Project "${projectName}" saved successfully`);
    } catch (error) {
      toast.error(`Failed to save project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = async (project) => {
    setIsLoading(true);
    try {
      const projectData = await loadProject(project.id);
      
      // Load data into store
      geologicalStore.setHorizonData(projectData.horizonData || []);
      geologicalStore.setFaultData(projectData.faultData || []);
      geologicalStore.setGridCells(projectData.gridCells || []);
      
      if (projectData.wellPaths) {
        projectData.wellPaths.forEach(wellPath => {
          geologicalStore.addWellPath(wellPath);
        });
      }

      if (projectData.parameters) {
        geologicalStore.setNumLayers(projectData.parameters.numLayers || 5);
        if (projectData.parameters.visualization) {
          geologicalStore.setVisualization(projectData.parameters.visualization.enabled);
          if (projectData.parameters.visualization.viewMode) {
            geologicalStore.setViewMode(projectData.parameters.visualization.viewMode);
          }
          if (projectData.parameters.visualization.camera) {
            geologicalStore.setCamera(projectData.parameters.visualization.camera);
          }
        }
      }

      setCurrentProject(project);
      setProjectName(project.name);
      
      // Update localStorage
      localStorage.setItem('telesto_current_project', JSON.stringify(project));
      
      toast.success(`Project "${project.name}" loaded successfully`);
    } catch (error) {
      toast.error(`Failed to load project: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(projectId);
      await loadProjectList();
      
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setProjectName('');
        localStorage.removeItem('telesto_current_project');
      }
      
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete project: ${error.message}`);
    }
  };

  const handleExportProject = async (project) => {
    try {
      const exportData = await exportProject(project.id);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/\s+/g, '_')}_export.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Project exported successfully');
    } catch (error) {
      toast.error(`Failed to export project: ${error.message}`);
    }
  };

  const handleImportProject = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const importedProject = await importProject(file);
      await loadProjectList();
      toast.success(`Project "${importedProject.name}" imported successfully`);
    } catch (error) {
      toast.error(`Failed to import project: ${error.message}`);
    }
  };

  const handleNewProject = () => {
    if (confirm('Create new project? Unsaved changes will be lost.')) {
      geologicalStore.clearAllData();
      setCurrentProject(null);
      setProjectName('');
      localStorage.removeItem('telesto_current_project');
      toast.success('New project created');
    }
  };

  const loadProjectHistoryData = async () => {
    if (!currentProject) return;
    
    try {
      const history = await getProjectHistory(currentProject.id);
      setProjectHistory(history);
      setShowHistory(true);
    } catch (error) {
      toast.error('Failed to load project history');
    }
  };

  const hasUnsavedChanges = () => {
    if (!currentProject) return false;
    
    // Simple check - compare current data counts with saved project
    const currentCounts = {
      horizons: geologicalStore.horizonData?.length || 0,
      wells: geologicalStore.wellPaths?.length || 0,
      cells: geologicalStore.gridCells?.length || 0
    };
    
    const savedCounts = {
      horizons: currentProject.metadata?.horizonCount || 0,
      wells: currentProject.metadata?.wellCount || 0,
      cells: currentProject.metadata?.cellCount || 0
    };
    
    return JSON.stringify(currentCounts) !== JSON.stringify(savedCounts);
  };

  return (
    <Card 
      title="Project Manager" 
      icon={<Archive className="w-5 h-5 text-blue-400" />}
    >
      <div className="space-y-4">
        
        {/* Current Project Status */}
        <div className="p-3 bg-slate-800 rounded border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Current Project</span>
            {hasUnsavedChanges() && (
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400">Unsaved</span>
              </div>
            )}
          </div>
          
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name..."
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400"
          />
          
          {currentProject && (
            <div className="mt-2 text-xs text-slate-400">
              <p>Saved: {new Date(currentProject.lastModified).toLocaleString()}</p>
              <p>Version: {currentProject.version || 1}</p>
            </div>
          )}
        </div>

        {/* Project Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleSaveProject}
            disabled={isLoading || !projectName.trim()}
            variant="default"
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          
          <Button
            onClick={handleNewProject}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Import/Export */}
        <div className="flex space-x-2">
          <Button
            onClick={() => document.getElementById('project-import').click()}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          
          {currentProject && (
            <Button
              onClick={() => handleExportProject(currentProject)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>

        <input
          id="project-import"
          type="file"
          accept=".json"
          onChange={handleImportProject}
          className="hidden"
        />

        {/* Project History */}
        {currentProject && (
          <Button
            onClick={loadProjectHistoryData}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            <Clock className="w-4 h-4 mr-1" />
            View History
          </Button>
        )}

        {/* Saved Projects List */}
        {projects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Saved Projects</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`p-2 rounded border text-sm ${
                    currentProject?.id === project.id
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{project.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(project.lastModified).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-3 text-xs text-slate-500">
                        <span>{project.metadata?.cellCount || 0} cells</span>
                        <span>{project.metadata?.wellCount || 0} wells</span>
                        <span>{project.metadata?.horizonCount || 0} horizons</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        onClick={() => handleLoadProject(project)}
                        disabled={isLoading}
                        variant="ghost"
                        size="sm"
                      >
                        <FolderOpen className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        onClick={() => handleExportProject(project)}
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteProject(project.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Project History</h3>
                <Button
                  onClick={() => setShowHistory(false)}
                  variant="ghost"
                  size="sm"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                {projectHistory.map((entry, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-slate-700 rounded">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white">{entry.action}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>• Save projects to browser local storage</p>
          <p>• Export projects for backup or sharing</p>
          <p>• Import projects from other instances</p>
          <p>• View project modification history</p>
        </div>
      </div>
    </Card>
  );
};

export default ProjectManager;
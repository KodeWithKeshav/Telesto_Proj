// Project management utilities for saving, loading, and managing geological projects

/**
 * Save project to browser storage
 */
export const saveProject = async (name, projectData) => {
  const project = {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    data: projectData,
    metadata: {
      cellCount: projectData.gridCells?.length || 0,
      wellCount: projectData.wellPaths?.length || 0,
      horizonCount: projectData.horizonData?.length || 0,
      faultCount: projectData.faultData?.length || 0,
      ...projectData.metadata
    },
    version: 1,
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  // Check if project with same name exists
  const existingProjects = await listProjects();
  const existingProject = existingProjects.find(p => p.name === name);
  
  if (existingProject) {
    // Update existing project
    project.id = existingProject.id;
    project.created = existingProject.created;
    project.version = (existingProject.version || 1) + 1;
    
    // Add to history
    await addProjectHistory(project.id, 'Project updated', projectData);
  } else {
    // Add to history for new project
    await addProjectHistory(project.id, 'Project created', projectData);
  }

  // Save to localStorage
  const storageKey = `telesto_project_${project.id}`;
  localStorage.setItem(storageKey, JSON.stringify(project));

  // Update project index
  await updateProjectIndex(project);

  return project;
};

/**
 * Load project from storage
 */
export const loadProject = async (projectId) => {
  const storageKey = `telesto_project_${projectId}`;
  const projectJson = localStorage.getItem(storageKey);
  
  if (!projectJson) {
    throw new Error('Project not found');
  }

  try {
    const project = JSON.parse(projectJson);
    
    // Add to history
    await addProjectHistory(projectId, 'Project loaded');
    
    return project.data;
  } catch (error) {
    throw new Error('Failed to parse project data');
  }
};

/**
 * Delete project from storage
 */
export const deleteProject = async (projectId) => {
  const storageKey = `telesto_project_${projectId}`;
  localStorage.removeItem(storageKey);
  
  // Remove from project index
  const projects = await listProjects();
  const updatedProjects = projects.filter(p => p.id !== projectId);
  localStorage.setItem('telesto_project_index', JSON.stringify(updatedProjects));
  
  // Remove project history
  const historyKey = `telesto_history_${projectId}`;
  localStorage.removeItem(historyKey);
};

/**
 * List all saved projects
 */
export const listProjects = async () => {
  const indexJson = localStorage.getItem('telesto_project_index');
  
  if (!indexJson) {
    return [];
  }

  try {
    const projects = JSON.parse(indexJson);
    
    // Verify projects still exist and update metadata
    const validProjects = [];
    for (const project of projects) {
      const storageKey = `telesto_project_${project.id}`;
      const projectData = localStorage.getItem(storageKey);
      
      if (projectData) {
        try {
          const fullProject = JSON.parse(projectData);
          validProjects.push({
            id: project.id,
            name: project.name,
            created: project.created,
            lastModified: project.lastModified,
            version: project.version,
            metadata: fullProject.metadata || project.metadata
          });
        } catch (error) {
          console.warn(`Failed to parse project ${project.id}:`, error);
        }
      }
    }

    // Update index if projects were removed
    if (validProjects.length !== projects.length) {
      localStorage.setItem('telesto_project_index', JSON.stringify(validProjects));
    }

    return validProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  } catch (error) {
    console.error('Failed to load project index:', error);
    return [];
  }
};

/**
 * Export project to JSON file
 */
export const exportProject = async (projectId) => {
  const storageKey = `telesto_project_${projectId}`;
  const projectJson = localStorage.getItem(storageKey);
  
  if (!projectJson) {
    throw new Error('Project not found');
  }

  const project = JSON.parse(projectJson);
  
  // Create export package with metadata
  const exportPackage = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    application: 'Telesto Geological Grid Generator',
    project: {
      ...project,
      exportMetadata: {
        originalId: project.id,
        exportedBy: 'Telesto Export System'
      }
    }
  };

  return JSON.stringify(exportPackage, null, 2);
};

/**
 * Import project from JSON file
 */
export const importProject = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const importData = JSON.parse(event.target.result);
        
        // Validate import format
        if (!importData.project || !importData.project.data) {
          throw new Error('Invalid project file format');
        }

        const importedProject = importData.project;
        
        // Generate new ID to avoid conflicts
        const newId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newName = `${importedProject.name} (Imported)`;
        
        // Create new project with imported data
        const project = await saveProject(newName, importedProject.data);
        
        resolve(project);
      } catch (error) {
        reject(new Error(`Failed to import project: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Get project modification history
 */
export const getProjectHistory = async (projectId) => {
  const historyKey = `telesto_history_${projectId}`;
  const historyJson = localStorage.getItem(historyKey);
  
  if (!historyJson) {
    return [];
  }

  try {
    const history = JSON.parse(historyJson);
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Failed to load project history:', error);
    return [];
  }
};

/**
 * Add entry to project history
 */
const addProjectHistory = async (projectId, action, data = null) => {
  const historyKey = `telesto_history_${projectId}`;
  const existingHistoryJson = localStorage.getItem(historyKey);
  
  let history = [];
  if (existingHistoryJson) {
    try {
      history = JSON.parse(existingHistoryJson);
    } catch (error) {
      console.warn('Failed to parse existing history, starting fresh');
    }
  }

  const historyEntry = {
    timestamp: new Date().toISOString(),
    action,
    details: data ? {
      cellCount: data.gridCells?.length || 0,
      wellCount: data.wellPaths?.length || 0,
      horizonCount: data.horizonData?.length || 0
    } : null
  };

  history.push(historyEntry);
  
  // Keep only last 50 entries
  if (history.length > 50) {
    history = history.slice(-50);
  }

  localStorage.setItem(historyKey, JSON.stringify(history));
};

/**
 * Update project index
 */
const updateProjectIndex = async (project) => {
  const projects = await listProjects();
  
  // Remove existing entry if it exists
  const filteredProjects = projects.filter(p => p.id !== project.id);
  
  // Add updated project info
  filteredProjects.push({
    id: project.id,
    name: project.name,
    created: project.created,
    lastModified: project.lastModified,
    version: project.version,
    metadata: project.metadata
  });

  localStorage.setItem('telesto_project_index', JSON.stringify(filteredProjects));
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = () => {
  let totalSize = 0;
  let projectCount = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('telesto_project_')) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        projectCount++;
      }
    }
  }

  // Convert to KB
  const totalSizeKB = Math.round(totalSize / 1024);
  const maxSizeKB = 5120; // Assume 5MB typical localStorage limit
  const usagePercentage = (totalSizeKB / maxSizeKB) * 100;

  return {
    projectCount,
    totalSizeKB,
    maxSizeKB,
    usagePercentage: Math.min(usagePercentage, 100),
    availableKB: Math.max(maxSizeKB - totalSizeKB, 0)
  };
};

/**
 * Cleanup old projects to free space
 */
export const cleanupOldProjects = async (keepCount = 10) => {
  const projects = await listProjects();
  
  if (projects.length <= keepCount) {
    return { cleaned: 0, freed: 0 };
  }

  // Sort by last modified and keep only the most recent
  const projectsToDelete = projects.slice(keepCount);
  let freedSpace = 0;

  for (const project of projectsToDelete) {
    const storageKey = `telesto_project_${project.id}`;
    const projectData = localStorage.getItem(storageKey);
    
    if (projectData) {
      freedSpace += projectData.length;
      await deleteProject(project.id);
    }
  }

  return {
    cleaned: projectsToDelete.length,
    freed: Math.round(freedSpace / 1024) // KB
  };
};

/**
 * Backup all projects to a single file
 */
export const backupAllProjects = async () => {
  const projects = await listProjects();
  const backup = {
    backupVersion: '1.0',
    backupDate: new Date().toISOString(),
    application: 'Telesto Geological Grid Generator',
    projects: []
  };

  for (const projectInfo of projects) {
    try {
      const projectData = await loadProject(projectInfo.id);
      backup.projects.push({
        info: projectInfo,
        data: projectData
      });
    } catch (error) {
      console.warn(`Failed to backup project ${projectInfo.name}:`, error);
    }
  }

  return JSON.stringify(backup, null, 2);
};

/**
 * Restore projects from backup file
 */
export const restoreFromBackup = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        
        if (!backupData.projects || !Array.isArray(backupData.projects)) {
          throw new Error('Invalid backup file format');
        }

        let restored = 0;
        let failed = 0;

        for (const projectBackup of backupData.projects) {
          try {
            const restoredName = `${projectBackup.info.name} (Restored)`;
            await saveProject(restoredName, projectBackup.data);
            restored++;
          } catch (error) {
            console.warn(`Failed to restore project ${projectBackup.info.name}:`, error);
            failed++;
          }
        }

        resolve({ restored, failed, total: backupData.projects.length });
      } catch (error) {
        reject(new Error(`Failed to restore backup: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
};
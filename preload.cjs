// Preload script - bridge between main and renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Dialog operations
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },

  // Scene operations
  createScene: (scenePath, sceneName) => ipcRenderer.invoke('scene:create', scenePath, sceneName),
  loadScene: (scenePath) => ipcRenderer.invoke('scene:load', scenePath),
  saveScene: (scenePath, scenePackage) => ipcRenderer.invoke('scene:save', scenePath, scenePackage),

  // Asset operations
  importAsset: (scenePath, assetType) => ipcRenderer.invoke('asset:import', scenePath, assetType),
  importFiles: (scenePath, assetType, filePaths) => ipcRenderer.invoke('asset:importFiles', scenePath, assetType, filePaths),
  moveAsset: (scenePath, assetType, sourcePath, targetFolderPath) => ipcRenderer.invoke('asset:moveAsset', scenePath, assetType, sourcePath, targetFolderPath),
  deleteAsset: (scenePath, assetType, assetPath) => ipcRenderer.invoke('asset:delete', scenePath, assetType, assetPath),
  createSubdirectory: (scenePath, assetType, subdirName) => ipcRenderer.invoke('asset:createSubdirectory', scenePath, assetType, subdirName),
  listDirectory: (scenePath, assetType) => ipcRenderer.invoke('asset:listDirectory', scenePath, assetType),
  listDirectoryTree: (scenePath, assetType) => ipcRenderer.invoke('asset:listDirectoryTree', scenePath, assetType),

  // Shell operations
  openPath: (folderPath) => ipcRenderer.invoke('shell:openPath', folderPath),

  // Scene package operations
  exportPackage: (sceneData) => ipcRenderer.invoke('package:export', sceneData)
});

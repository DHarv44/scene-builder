// Electron main process (CommonJS for compatibility)
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// Log application start
log.info('Low Sun Scene Builder starting...');
log.info('Log file location:', log.transports.file.getFile().path);

let mainWindow;
let currentScenePath = null; // Track the currently loaded scene path

function createWindow() {
  log.info('Creating window...');

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: false,
    title: 'Low Sun Scene Builder'
  });

  // Load from Vite dev server in development, or built files in production
  const isDev = process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    log.info('Loading from Vite dev server:', devUrl);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    log.info('Loading from dist:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    log.info('Window closed');
    mainWindow = null;
  });
}

// IPC Handlers for file operations
function setupIpcHandlers() {
  log.info('Setting up IPC handlers');

  // Handle directory selection
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Scene Directory'
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  // Handle new scene creation
  ipcMain.handle('scene:create', async (event, scenePath, sceneName) => {
    try {
      log.info('Creating scene at:', scenePath);

      // Create directory structure
      await fs.mkdir(scenePath, { recursive: true });
      await fs.mkdir(path.join(scenePath, 'images'), { recursive: true });
      await fs.mkdir(path.join(scenePath, 'audio'), { recursive: true });

      // Create initial scene.json with default scene
      const scenePackage = {
        metadata: {
          id: sceneName.toLowerCase().replace(/\s+/g, '-'),
          type: 'timeline',
          name: sceneName,
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        },
        timeline: {
          layers: [
            {
              id: 'layer_1',
              name: 'Layer 1',
              items: [],
              collapsed: false
            }
          ]
        },
        assets: {
          images: {},
          audio: {}
        }
      };

      const sceneJsonPath = path.join(scenePath, 'scene.json');
      await fs.writeFile(sceneJsonPath, JSON.stringify(scenePackage, null, 2), 'utf8');

      log.info('Scene created successfully');
      return { success: true, path: scenePath };
    } catch (error) {
      log.error('Error creating scene:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle scene loading
  ipcMain.handle('scene:load', async (event, scenePath) => {
    try {
      log.info('Loading scene from:', scenePath);
      const sceneJsonPath = path.join(scenePath, 'scene.json');
      const data = await fs.readFile(sceneJsonPath, 'utf8');
      const scenePackage = JSON.parse(data);

      // Update current scene path for protocol handler
      currentScenePath = scenePath;
      log.info('Updated current scene path:', currentScenePath);

      return { success: true, scenePackage, path: scenePath };
    } catch (error) {
      log.error('Error loading scene:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle scene saving
  ipcMain.handle('scene:save', async (event, scenePath, scenePackage) => {
    try {
      log.info('Saving scene to:', scenePath);
      scenePackage.metadata.modified = new Date().toISOString();
      const sceneJsonPath = path.join(scenePath, 'scene.json');
      await fs.writeFile(sceneJsonPath, JSON.stringify(scenePackage, null, 2), 'utf8');

      log.info('Scene saved successfully');
      return { success: true };
    } catch (error) {
      log.error('Error saving scene:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle asset import
  ipcMain.handle('asset:import', async (event, scenePath, assetType) => {
    try {
      log.info('Importing asset:', assetType);

      const filters = assetType === 'images'
        ? [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }]
        : [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }];

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters,
        title: `Import ${assetType === 'images' ? 'Images' : 'Audio'}`
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const importedAssets = {};
      const targetDir = path.join(scenePath, assetType);

      for (const filePath of result.filePaths) {
        const fileName = path.basename(filePath);
        const targetPath = path.join(targetDir, fileName);

        // Copy file to scene directory
        await fs.copyFile(filePath, targetPath);

        // Create relative path for asset manifest
        const assetKey = path.basename(fileName, path.extname(fileName));
        const relativePath = `./${assetType}/${fileName}`;
        importedAssets[assetKey] = relativePath;

        log.info('Imported asset:', assetKey, '->', relativePath);
      }

      return { success: true, assets: importedAssets };
    } catch (error) {
      log.error('Error importing asset:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle file drop (for drag and drop)
  ipcMain.handle('asset:importFiles', async (event, scenePath, assetType, filePaths) => {
    try {
      log.info('Importing dropped files:', filePaths);

      const importedAssets = {};
      const targetDir = path.join(scenePath, assetType);

      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const targetPath = path.join(targetDir, fileName);

        // Copy file to scene directory
        await fs.copyFile(filePath, targetPath);

        // Create relative path for asset manifest
        const assetKey = path.basename(fileName, path.extname(fileName));
        const relativePath = `./${assetType}/${fileName}`;
        importedAssets[assetKey] = relativePath;

        log.info('Imported dropped asset:', assetKey, '->', relativePath);
      }

      return { success: true, assets: importedAssets };
    } catch (error) {
      log.error('Error importing dropped files:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle asset move (between folders)
  ipcMain.handle('asset:moveAsset', async (event, scenePath, assetType, sourcePath, targetFolderPath) => {
    try {
      log.info('Moving asset:', sourcePath, 'to', targetFolderPath);

      // Convert relative paths to absolute
      const sourceAbsolute = path.join(scenePath, sourcePath.replace(/^\.\//, ''));
      const fileName = path.basename(sourceAbsolute);

      // Get target folder relative path
      const targetFolderRelative = targetFolderPath.replace(/^\.\//, '');
      const targetAbsolute = path.join(scenePath, targetFolderRelative, fileName);

      // Don't move if source and target are the same
      if (sourceAbsolute === targetAbsolute) {
        return { success: true, newPath: sourcePath };
      }

      // Move the file
      await fs.rename(sourceAbsolute, targetAbsolute);

      // Return new relative path
      const newRelativePath = `./${targetFolderRelative}/${fileName}`;
      log.info('Asset moved to:', newRelativePath);

      return { success: true, newPath: newRelativePath };
    } catch (error) {
      log.error('Error moving asset:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle asset deletion
  ipcMain.handle('asset:delete', async (event, scenePath, assetType, assetPath) => {
    try {
      const absolutePath = path.join(scenePath, assetPath.replace(/^\.\//, ''));
      log.info('Deleting asset:', absolutePath);

      await fs.unlink(absolutePath);

      return { success: true };
    } catch (error) {
      log.error('Error deleting asset:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle subdirectory creation
  ipcMain.handle('asset:createSubdirectory', async (event, scenePath, assetType, subdirName) => {
    try {
      const subdirPath = path.join(scenePath, assetType, subdirName);
      log.info('Creating subdirectory:', subdirPath);

      await fs.mkdir(subdirPath, { recursive: true });

      return { success: true, path: subdirPath };
    } catch (error) {
      log.error('Error creating subdirectory:', error);
      return { success: false, error: error.message };
    }
  });

  // List directory contents (flat)
  ipcMain.handle('asset:listDirectory', async (event, scenePath, assetType) => {
    try {
      const dirPath = path.join(scenePath, assetType);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const items = entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
      }));

      return { success: true, items };
    } catch (error) {
      log.error('Error listing directory:', error);
      return { success: false, error: error.message };
    }
  });

  // List directory contents recursively (tree structure)
  ipcMain.handle('asset:listDirectoryTree', async (event, scenePath, assetType) => {
    try {
      const rootPath = path.join(scenePath, assetType);

      async function buildTree(dirPath, relativePath = '') {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const items = [];

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            const children = await buildTree(fullPath, relPath);
            items.push({
              name: entry.name,
              path: `./${assetType}/${relPath}`,
              isDirectory: true,
              children
            });
          } else {
            items.push({
              name: entry.name,
              path: `./${assetType}/${relPath}`,
              isDirectory: false
            });
          }
        }

        return items;
      }

      const tree = await buildTree(rootPath);
      return { success: true, tree };
    } catch (error) {
      log.error('Error listing directory tree:', error);
      return { success: false, error: error.message };
    }
  });

  // Open folder in system file explorer
  ipcMain.handle('shell:openPath', async (event, folderPath) => {
    try {
      const { shell } = require('electron');
      log.info('Opening path:', folderPath);
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      log.error('Error opening path:', error);
      return { success: false, error: error.message };
    }
  });
}

app.whenReady().then(() => {
  log.info('App ready');

  // Register custom protocol for serving scene assets
  protocol.registerFileProtocol('scene', (request, callback) => {
    try {
      const url = request.url.substr(8); // Remove 'scene://'

      if (!currentScenePath) {
        log.error('No scene loaded, cannot serve asset:', url);
        callback({ error: -6 }); // NET_ERROR(FILE_NOT_FOUND)
        return;
      }

      const filePath = path.normalize(path.join(currentScenePath, url));

      // Security: Ensure the resolved path is within the scene directory
      if (!filePath.startsWith(path.normalize(currentScenePath))) {
        log.error('Path traversal attempt blocked:', url);
        callback({ error: -6 });
        return;
      }

      log.info('Serving asset:', filePath);
      callback({ path: filePath });
    } catch (error) {
      log.error('Error serving asset:', error);
      callback({ error: -6 });
    }
  });

  createWindow();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  log.info('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Log errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

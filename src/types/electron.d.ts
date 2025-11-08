// TypeScript definitions for Electron IPC API

export interface ElectronAPI {
  // Dialog operations
  selectDirectory: () => Promise<string | null>;

  // Scene operations
  createScene: (scenePath: string, sceneName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadScene: (scenePath: string) => Promise<{ success: boolean; scenePackage?: any; path?: string; error?: string }>;
  saveScene: (scenePath: string, scenePackage: any) => Promise<{ success: boolean; error?: string }>;

  // Asset operations
  importAsset: (scenePath: string, assetType: string) => Promise<{ success: boolean; assets?: Record<string, string>; canceled?: boolean; error?: string }>;
  importFiles: (scenePath: string, assetType: string, filePaths: string[]) => Promise<{ success: boolean; assets?: Record<string, string>; error?: string }>;
  deleteAsset: (scenePath: string, assetType: string, assetPath: string) => Promise<{ success: boolean; error?: string }>;
  createSubdirectory: (scenePath: string, assetType: string, subdirName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  listDirectory: (scenePath: string, assetType: string) => Promise<{ success: boolean; items?: Array<{ name: string; isDirectory: boolean; path: string }>; error?: string }>;
  listDirectoryTree: (scenePath: string, assetType: string) => Promise<{ success: boolean; tree?: Array<any>; error?: string }>;
  moveAsset: (scenePath: string, assetType: string, currentPath: string, targetFolder: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;

  // Dialog operations (advanced)
  dialog: {
    showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  };

  // Shell operations
  openPath: (folderPath: string) => Promise<{ success: boolean; error?: string }>;

  // Scene package operations
  exportPackage: (sceneData: any) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  // Extend File interface to include Electron's path property
  interface File {
    path: string;
  }
}

export {};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ResizePanel = 'timeline' | 'rightPanel' | 'propertiesHeight' | null;

interface PanelSizes {
  timelineHeight: number;
  rightPanelWidth: number;
  propertiesHeight: number; // Percentage of right panel height
}

interface LayoutContextValue {
  sizes: PanelSizes;
  isResizing: ResizePanel;
  previewMode: 'edit' | 'preview';
  setPreviewMode: (mode: 'edit' | 'preview') => void;
  startResize: (panel: ResizePanel) => void;
  updateSize: (panel: ResizePanel, value: number) => void;
  // Canvas zoom controls
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
};

const DEFAULT_SIZES: PanelSizes = {
  timelineHeight: 300,
  rightPanelWidth: 350,
  propertiesHeight: 50 // 50% of right panel
};

const loadSizesFromStorage = (): PanelSizes => {
  return {
    timelineHeight: parseInt(localStorage.getItem('sceneBuilder.timelineHeight') || String(DEFAULT_SIZES.timelineHeight)),
    rightPanelWidth: parseInt(localStorage.getItem('sceneBuilder.rightPanelWidth') || String(DEFAULT_SIZES.rightPanelWidth)),
    propertiesHeight: parseInt(localStorage.getItem('sceneBuilder.propertiesHeight') || String(DEFAULT_SIZES.propertiesHeight))
  };
};

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [sizes, setSizes] = useState<PanelSizes>(loadSizesFromStorage);
  const [isResizing, setIsResizing] = useState<ResizePanel>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  // Canvas zoom state (default 70%)
  const DEFAULT_ZOOM = 0.7;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Save to localStorage when sizes change
  useEffect(() => {
    localStorage.setItem('sceneBuilder.timelineHeight', String(sizes.timelineHeight));
  }, [sizes.timelineHeight]);

  useEffect(() => {
    localStorage.setItem('sceneBuilder.rightPanelWidth', String(sizes.rightPanelWidth));
  }, [sizes.rightPanelWidth]);

  useEffect(() => {
    localStorage.setItem('sceneBuilder.propertiesHeight', String(sizes.propertiesHeight));
  }, [sizes.propertiesHeight]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing === 'timeline') {
        const newHeight = window.innerHeight - e.clientY - 40;
        setSizes(prev => ({
          ...prev,
          timelineHeight: Math.max(150, Math.min(800, newHeight))
        }));
      } else if (isResizing === 'rightPanel') {
        const newWidth = window.innerWidth - e.clientX;
        setSizes(prev => ({
          ...prev,
          rightPanelWidth: Math.max(250, Math.min(600, newWidth))
        }));
      } else if (isResizing === 'propertiesHeight') {
        const rightArea = document.querySelector('.right-panel') as HTMLElement;
        if (rightArea) {
          const rect = rightArea.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const percentage = (relativeY / rect.height) * 100;
          setSizes(prev => ({
            ...prev,
            propertiesHeight: Math.max(20, Math.min(80, percentage))
          }));
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (panel: ResizePanel) => {
    setIsResizing(panel);
  };

  const updateSize = (panel: ResizePanel, value: number) => {
    if (!panel) return;
    setSizes(prev => ({
      ...prev,
      [panel === 'timeline' ? 'timelineHeight' :
       panel === 'rightPanel' ? 'rightPanelWidth' :
       'propertiesHeight']: value
    }));
  };

  // Zoom controls
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5.0));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const resetZoom = () => setZoom(DEFAULT_ZOOM);

  const value: LayoutContextValue = {
    sizes,
    isResizing,
    previewMode,
    setPreviewMode,
    startResize,
    updateSize,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

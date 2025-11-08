import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * TimelineNavigationContext - Manages timeline focus and navigation state
 *
 * Handles:
 * - Scene focusing (double-click to focus on a specific scene)
 * - Breadcrumb navigation (Project > Scene "Opening")
 * - Back navigation to root timeline
 */

interface NavigationState {
  focusedSceneId: string | null;  // null = root timeline, string = focused scene ID
  breadcrumbs: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  sceneId: string | null; // null for root
}

interface TimelineNavigationContextValue {
  focusedSceneId: string | null;
  breadcrumbs: BreadcrumbItem[];
  focusScene: (sceneId: string, sceneName: string) => void;
  backToRoot: () => void;
  navigateToBreadcrumb: (sceneId: string | null) => void;
}

const TimelineNavigationContext = createContext<TimelineNavigationContextValue | undefined>(undefined);

export const useTimelineNavigation = () => {
  const context = useContext(TimelineNavigationContext);
  if (!context) {
    throw new Error('useTimelineNavigation must be used within TimelineNavigationProvider');
  }
  return context;
};

interface TimelineNavigationProviderProps {
  children: ReactNode;
}

export const TimelineNavigationProvider: React.FC<TimelineNavigationProviderProps> = ({ children }) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    focusedSceneId: null,
    breadcrumbs: [{ label: 'Project', sceneId: null }]
  });

  const focusScene = (sceneId: string, sceneName: string) => {
    setNavigationState({
      focusedSceneId: sceneId,
      breadcrumbs: [
        { label: 'Project', sceneId: null },
        { label: sceneName, sceneId }
      ]
    });
  };

  const backToRoot = () => {
    setNavigationState({
      focusedSceneId: null,
      breadcrumbs: [{ label: 'Project', sceneId: null }]
    });
  };

  const navigateToBreadcrumb = (sceneId: string | null) => {
    if (sceneId === null) {
      backToRoot();
    } else {
      // Find the breadcrumb and truncate to that point
      const index = navigationState.breadcrumbs.findIndex(b => b.sceneId === sceneId);
      if (index !== -1) {
        setNavigationState({
          focusedSceneId: sceneId,
          breadcrumbs: navigationState.breadcrumbs.slice(0, index + 1)
        });
      }
    }
  };

  const value: TimelineNavigationContextValue = {
    focusedSceneId: navigationState.focusedSceneId,
    breadcrumbs: navigationState.breadcrumbs,
    focusScene,
    backToRoot,
    navigateToBreadcrumb
  };

  return (
    <TimelineNavigationContext.Provider value={value}>
      {children}
    </TimelineNavigationContext.Provider>
  );
};

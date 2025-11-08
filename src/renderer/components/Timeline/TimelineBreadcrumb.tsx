import React from 'react';
import { useTimelineNavigation } from '../../context/TimelineNavigationContext';
import './TimelineBreadcrumb.css';

const TimelineBreadcrumb: React.FC = () => {
  const { breadcrumbs, navigateToBreadcrumb } = useTimelineNavigation();

  if (breadcrumbs.length <= 1) {
    // Don't show breadcrumb if we're at root
    return null;
  }

  return (
    <div className="timeline-breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          <button
            className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
            onClick={() => navigateToBreadcrumb(crumb.sceneId)}
            disabled={index === breadcrumbs.length - 1}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default TimelineBreadcrumb;

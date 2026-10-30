import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Route configuration with descriptive titles
interface RouteTitleConfig {
  path: string;
  title: string;
}

const routeTitles: RouteTitleConfig[] = [
  { path: '/', title: 'Homepage' },
  { path: '/isis-instruments', title: 'Instruments' },
  { path: '/reduction-history', title: 'Reduction History' },
  { path: '/reduction-history/:instrumentName', title: 'Reduction History' },
  { path: '/reduction-history/:instrumentName/latest-image', title: 'Reduction History' },
  { path: '/reduction-history/:instrumentName/stack-viewer', title: 'Reduction History' },
  { path: '/reduction-history/:instrumentName/value-editor-:jobId', title: 'Reduction History' },
  { path: '/experiment-viewer', title: 'Experiment Viewer' },
  { path: '/live-data', title: 'Live Data' },
  { path: '/live-data/:instrumentName', title: 'Live Data' },
  { path: '/live-data/:instrumentName/edit-script', title: 'Live Data' },
  { path: '/data-viewer/view', title: 'Data Viewer' },
];

// Get the most specific matching route title
const getRouteTitle = (pathname: string, search: string): string => {
  // Normalize pathname by removing the basename
  const normalizedPath = pathname.replace(/^\/fia/, '') || '/';
  const searchParams = new URLSearchParams(search);
  
  // Find the most specific matching route
  const matchingRoute = routeTitles.find((route) => {
    // Handle exact path matches
    if (route.path === normalizedPath || route.path === '/') {
      return true;
    }
    
    // Handle routes with parameters
    const routeParts = route.path.split('/').filter(Boolean);
    const pathParts = normalizedPath.split('/').filter(Boolean);
    
    if (routeParts.length !== pathParts.length) {
      return false;
    }
    
    // Check if all static parts match (parameters are marked with :)
    return routeParts.every((part, index) => {
      if (part.startsWith(':')) {
        return true; // Parameter, matches anything
      }
      return part === pathParts[index];
    });
  });
  
  if (!matchingRoute) {
    return 'FIA';
  }
  
  let title = matchingRoute.title;
  
  // Add specific context based on route and query parameters
  if (normalizedPath.startsWith('/reduction-history/')) {
    const instrumentName = normalizedPath.split('/')[3];
    if (instrumentName) {
      title = `${title} - ${instrumentName}`;
    }
  } else if (normalizedPath === '/experiment-viewer') {
    const instrument = searchParams.get('instrument');
    if (instrument) {
      title = `${title} - ${instrument}`;
    }
  } else if (normalizedPath.startsWith('/live-data/')) {
    const instrumentName = normalizedPath.split('/')[3];
    if (instrumentName) {
      title = `${title} - ${instrumentName}`;
    }
  } else if (normalizedPath.startsWith('/data-viewer/view')) {
    // Extract filename from path for data viewer
    const pathParts = normalizedPath.split('/').filter(Boolean);
    const filename = pathParts[pathParts.length - 1];
    if (filename) {
      title = `${title} - ${filename}`;
    }
  }
  
  return title;
};

interface PageTitleProps {
  children?: React.ReactNode;
}

const PageTitle: React.FC<PageTitleProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const title = getRouteTitle(location.pathname, location.search);
    document.title = `${title} - FIA`;
  }, [location.pathname, location.search]);

  return <>{children}</>;
};

export default PageTitle;

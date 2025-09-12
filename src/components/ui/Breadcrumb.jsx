import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const Breadcrumb = ({ customItems = null }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getDefaultBreadcrumbs = () => {
    const pathSegments = location?.pathname?.split('/')?.filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/dashboard', icon: 'Home' }];

    const routeMap = {
      'dashboard': { label: 'Dashboard', icon: 'LayoutDashboard' },
      'connect-spreadsheet': { label: 'Connect Spreadsheet', icon: 'Plus' },
      'spreadsheet-management': { label: 'Spreadsheet Management', icon: 'FileSpreadsheet' }
    };

    let currentPath = '';
    pathSegments?.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const routeInfo = routeMap?.[segment];
      
      if (routeInfo) {
        breadcrumbs?.push({
          label: routeInfo?.label,
          path: currentPath,
          icon: routeInfo?.icon,
          isLast: index === pathSegments?.length - 1
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = customItems || getDefaultBreadcrumbs();

  const handleNavigation = (path, isLast) => {
    if (!isLast && path) {
      navigate(path);
    }
  };

  if (breadcrumbs?.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs?.map((item, index) => {
          const isLast = index === breadcrumbs?.length - 1;
          const isClickable = !isLast && item?.path;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <Icon name="ChevronRight" size={14} className="mx-2 text-muted-foreground/60" />
              )}
              <div className="flex items-center space-x-1.5">
                {item?.icon && (
                  <Icon 
                    name={item?.icon} 
                    size={14} 
                    className={isLast ? 'text-foreground' : 'text-muted-foreground'} 
                  />
                )}
                
                {isClickable ? (
                  <button
                    onClick={() => handleNavigation(item?.path, isLast)}
                    className="hover:text-foreground transition-colors duration-200 font-medium"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item?.label}
                  </button>
                ) : (
                  <span 
                    className={`font-medium ${isLast ? 'text-foreground' : 'text-muted-foreground'}`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item?.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
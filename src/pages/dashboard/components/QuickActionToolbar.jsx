import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuickActionToolbar = ({ onBulkOperation, onExport, onSettings, onRefresh }) => {
  const quickActions = [
    {
      id: 'bulk',
      label: 'Bulk Operations',
      icon: 'Layers',
      onClick: onBulkOperation,
      variant: 'outline'
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: 'Download',
      onClick: onExport,
      variant: 'outline'
    },
    {
      id: 'refresh',
      label: 'Refresh All',
      icon: 'RefreshCw',
      onClick: onRefresh,
      variant: 'ghost'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      onClick: onSettings,
      variant: 'ghost'
    }
  ];

  return (
    <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Icon name="Zap" size={16} />
        <span className="font-medium">Quick Actions:</span>
      </div>
      <div className="flex items-center space-x-2 flex-1">
        {quickActions?.map((action) => (
          <Button
            key={action?.id}
            variant={action?.variant}
            size="sm"
            onClick={action?.onClick}
            iconName={action?.icon}
            iconPosition="left"
            iconSize={14}
            className="whitespace-nowrap"
          >
            {action?.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Icon name="Clock" size={12} />
        <span>Last sync: 2 min ago</span>
      </div>
    </div>
  );
};

export default QuickActionToolbar;
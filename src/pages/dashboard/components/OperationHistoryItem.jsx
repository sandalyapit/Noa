import React from 'react';
import Icon from '../../../components/AppIcon';

const OperationHistoryItem = ({ operation }) => {
  const getOperationIcon = (type) => {
    switch (type) {
      case 'connect':
        return 'Plus';
      case 'update':
        return 'Edit';
      case 'delete':
        return 'Trash2';
      case 'duplicate':
        return 'Copy';
      case 'export':
        return 'Download';
      case 'import':
        return 'Upload';
      default:
        return 'Activity';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-success bg-success/10';
      case 'error':
        return 'text-error bg-error/10';
      case 'pending':
        return 'text-warning bg-warning/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const operationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - operationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return operationTime?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-md transition-colors">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(operation?.status)}`}>
        <Icon name={getOperationIcon(operation?.type)} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground truncate">
            {operation?.description}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatTime(operation?.timestamp)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-xs text-muted-foreground truncate">
            {operation?.spreadsheetName}
          </p>
          {operation?.affectedRows && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {operation?.affectedRows} rows affected
              </span>
            </>
          )}
        </div>
        
        {operation?.status === 'error' && operation?.errorMessage && (
          <p className="text-xs text-error mt-1 truncate">
            {operation?.errorMessage}
          </p>
        )}
      </div>
      {operation?.status === 'pending' && (
        <Icon name="Loader2" size={14} className="text-warning animate-spin flex-shrink-0" />
      )}
    </div>
  );
};

export default OperationHistoryItem;
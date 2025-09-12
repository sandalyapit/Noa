import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AuditPanel = ({ auditLogs, snapshots, onRestoreSnapshot, onCreateSnapshot }) => {
  const [activeTab, setActiveTab] = useState('logs');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    await onCreateSnapshot();
    setTimeout(() => setIsCreatingSnapshot(false), 1000);
  };

  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'cell_update': return 'Edit2';
      case 'row_add': return 'Plus';
      case 'row_delete': return 'Trash2';
      case 'bulk_update': return 'Edit';
      case 'import': return 'Upload';
      case 'export': return 'Download';
      default: return 'Activity';
    }
  };

  const getOperationColor = (operation) => {
    switch (operation) {
      case 'cell_update': return 'text-blue-600';
      case 'row_add': return 'text-green-600';
      case 'row_delete': return 'text-red-600';
      case 'bulk_update': return 'text-purple-600';
      case 'import': return 'text-indigo-600';
      case 'export': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-md font-semibold text-foreground flex items-center">
            <Icon name="History" size={18} className="mr-2 text-primary" />
            Activity & History
          </h3>
          <Button
            variant="outline"
            size="sm"
            iconName="Camera"
            iconPosition="left"
            onClick={handleCreateSnapshot}
            loading={isCreatingSnapshot}
          >
            Create Snapshot
          </Button>
        </div>
        
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('logs')}
            className={`
              flex-1 px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === 'logs' ?'text-primary border-b-2 border-primary bg-primary/5' :'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Icon name="Activity" size={16} className="inline mr-2" />
            Audit Logs ({auditLogs?.length})
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`
              flex-1 px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === 'snapshots' ?'text-primary border-b-2 border-primary bg-primary/5' :'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <Icon name="Archive" size={16} className="inline mr-2" />
            Snapshots ({snapshots?.length})
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'logs' && (
          <div className="divide-y divide-border">
            {auditLogs?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Icon name="Activity" size={32} className="mx-auto mb-2 opacity-50" />
                <p>No activity logs yet</p>
              </div>
            ) : (
              auditLogs?.map((log, index) => (
                <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-muted ${getOperationColor(log?.operation)}`}>
                      <Icon name={getOperationIcon(log?.operation)} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {log?.description}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(log?.timestamp)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span>By {log?.user}</span>
                        {log?.details && (
                          <span className="ml-2">• {log?.details}</span>
                        )}
                      </div>
                      {log?.changes && (
                        <div className="mt-2 text-xs bg-muted rounded p-2">
                          <div className="font-medium mb-1">Changes:</div>
                          <div className="space-y-1">
                            {log?.changes?.map((change, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="text-red-600">- {change?.old}</span>
                                <Icon name="ArrowRight" size={10} />
                                <span className="text-green-600">+ {change?.new}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div className="divide-y divide-border">
            {snapshots?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Icon name="Archive" size={32} className="mx-auto mb-2 opacity-50" />
                <p>No snapshots created yet</p>
                <p className="text-xs mt-1">Create snapshots to save current state</p>
              </div>
            ) : (
              snapshots?.map((snapshot, index) => (
                <div key={index} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                        <Icon name="Archive" size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {snapshot?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {snapshot?.description} • {formatTimeAgo(snapshot?.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {snapshot?.rowCount} rows • {snapshot?.size}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Download"
                        onClick={() => console.log('Download snapshot:', snapshot?.id)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="RotateCcw"
                        onClick={() => onRestoreSnapshot(snapshot?.id)}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPanel;
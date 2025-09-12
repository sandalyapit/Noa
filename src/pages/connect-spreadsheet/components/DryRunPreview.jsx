import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DryRunPreview = ({ operations, onConfirm, onCancel, isVisible }) => {
  const [selectedOperation, setSelectedOperation] = useState(null);

  if (!isVisible || !operations?.length) return null;

  const getOperationIcon = (type) => {
    const icons = {
      'read': 'Eye',
      'write': 'Edit',
      'append': 'Plus',
      'update': 'RefreshCw',
      'delete': 'Trash2'
    };
    return icons?.[type] || 'FileText';
  };

  const getOperationColor = (type) => {
    const colors = {
      'read': 'text-primary bg-primary/10',
      'write': 'text-warning bg-warning/10',
      'append': 'text-success bg-success/10',
      'update': 'text-accent bg-accent/10',
      'delete': 'text-error bg-error/10'
    };
    return colors?.[type] || 'text-muted-foreground bg-muted';
  };

  const totalOperations = operations?.length;
  const riskLevel = operations?.some(op => ['write', 'update', 'delete']?.includes(op?.type)) ? 'high' : 'low';

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-warning/10 rounded-lg">
            <Icon name="Play" size={20} className="text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Dry Run Preview</h3>
            <p className="text-sm text-muted-foreground">Review operations before execution</p>
          </div>
        </div>
        
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${riskLevel === 'high' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}
        `}>
          {riskLevel === 'high' ? 'High Risk' : 'Safe Operations'}
        </div>
      </div>
      {/* Operations Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{totalOperations}</div>
          <div className="text-xs text-muted-foreground">Total Operations</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {operations?.filter(op => op?.type === 'read')?.length}
          </div>
          <div className="text-xs text-muted-foreground">Read Operations</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-warning">
            {operations?.filter(op => ['write', 'update']?.includes(op?.type))?.length}
          </div>
          <div className="text-xs text-muted-foreground">Write Operations</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-success">
            {operations?.filter(op => op?.type === 'append')?.length}
          </div>
          <div className="text-xs text-muted-foreground">Append Operations</div>
        </div>
      </div>
      {/* Operations List */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-foreground">Planned Operations</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {operations?.map((operation, index) => (
            <div 
              key={index}
              className={`
                border border-border rounded-lg p-4 cursor-pointer transition-all duration-200
                ${selectedOperation === index ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
              `}
              onClick={() => setSelectedOperation(selectedOperation === index ? null : index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getOperationColor(operation?.type)}`}>
                    <Icon name={getOperationIcon(operation?.type)} size={16} />
                  </div>
                  <div>
                    <h5 className="font-medium text-foreground">{operation?.title}</h5>
                    <p className="text-sm text-muted-foreground">{operation?.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {operation?.affectedRows} rows
                  </span>
                  <Icon 
                    name={selectedOperation === index ? "ChevronUp" : "ChevronDown"} 
                    size={16} 
                    className="text-muted-foreground" 
                  />
                </div>
              </div>

              {selectedOperation === index && (
                <div className="mt-4 pt-4 border-t border-border animate-slide-in-from-top">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h6 className="text-xs font-medium text-muted-foreground mb-2">Target Range</h6>
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {operation?.range}
                      </code>
                    </div>
                    <div>
                      <h6 className="text-xs font-medium text-muted-foreground mb-2">Estimated Time</h6>
                      <span className="text-xs text-foreground">{operation?.estimatedTime}</span>
                    </div>
                  </div>
                  
                  {operation?.preview && (
                    <div className="mt-3">
                      <h6 className="text-xs font-medium text-muted-foreground mb-2">Preview</h6>
                      <div className="bg-muted/50 rounded p-3 text-xs font-mono text-foreground">
                        {operation?.preview}
                      </div>
                    </div>
                  )}

                  {operation?.warnings?.length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-xs font-medium text-warning mb-2">Warnings</h6>
                      <ul className="space-y-1">
                        {operation?.warnings?.map((warning, wIndex) => (
                          <li key={wIndex} className="flex items-start space-x-2 text-xs">
                            <Icon name="AlertTriangle" size={12} className="text-warning mt-0.5" />
                            <span className="text-muted-foreground">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Risk Assessment */}
      {riskLevel === 'high' && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Icon name="AlertTriangle" size={20} className="text-error mt-0.5" />
            <div>
              <h4 className="font-medium text-error mb-1">High Risk Operations Detected</h4>
              <p className="text-sm text-error/80 mb-3">
                These operations will modify your spreadsheet data. Please review carefully before proceeding.
              </p>
              <ul className="text-sm text-error/80 space-y-1">
                <li>• Data modifications cannot be automatically undone</li>
                <li>• Consider creating a backup before proceeding</li>
                <li>• Verify all operation details are correct</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="default"
          onClick={onConfirm}
          iconName="Play"
          iconPosition="left"
          className="flex-1"
        >
          Execute Operations
        </Button>
        
        <Button
          variant="outline"
          onClick={onCancel}
          iconName="X"
          iconPosition="left"
        >
          Cancel
        </Button>
      </div>
      {/* Execution Info */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Info" size={14} className="text-primary" />
          <span className="text-xs font-medium text-foreground">Execution Information</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Operations will be executed sequentially. You can monitor progress and cancel at any time.
          A snapshot will be created before any write operations for rollback purposes.
        </p>
      </div>
    </div>
  );
};

export default DryRunPreview;
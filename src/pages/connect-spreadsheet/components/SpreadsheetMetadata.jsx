import React from 'react';
import Icon from '../../../components/AppIcon';

const SpreadsheetMetadata = ({ metadata, isVisible }) => {
  if (!isVisible || !metadata) return null;

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-success bg-success/10';
    if (confidence >= 70) return 'text-warning bg-warning/10';
    return 'text-error bg-error/10';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-lg">
            <Icon name="CheckCircle" size={20} className="text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Spreadsheet Connected</h3>
            <p className="text-sm text-muted-foreground">Successfully accessed your Google Sheets</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(metadata?.confidence)}`}>
          {metadata?.confidence}% Confidence
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Document Title</label>
            <p className="text-foreground font-medium mt-1">{metadata?.title}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Owner</label>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-primary-foreground font-medium">
                  {metadata?.owner?.name?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{metadata?.owner?.name}</p>
                <p className="text-xs text-muted-foreground">{metadata?.owner?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
            <p className="text-foreground mt-1">{formatDate(metadata?.lastModified)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Document ID</label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                {metadata?.spreadsheetId}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(metadata?.spreadsheetId)}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy ID"
              >
                <Icon name="Copy" size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="Shield" size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Access Permissions</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metadata?.permissions?.map((permission, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Icon 
                name={permission?.granted ? "Check" : "X"} 
                size={14} 
                className={permission?.granted ? "text-success" : "text-error"} 
              />
              <span className="text-xs text-muted-foreground">{permission?.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetMetadata;
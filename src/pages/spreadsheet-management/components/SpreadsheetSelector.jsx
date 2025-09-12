import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';

const SpreadsheetSelector = ({ spreadsheets, selectedSpreadsheet, onSpreadsheetChange, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const spreadsheetOptions = spreadsheets?.map(sheet => ({
    value: sheet?.id,
    label: sheet?.name,
    description: `${sheet?.tabCount} tabs • Last modified: ${sheet?.lastModified}`
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <Icon name="FileSpreadsheet" size={20} className="mr-2 text-primary" />
          Connected Spreadsheets
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon 
            name="RefreshCw" 
            size={16} 
            className={isRefreshing ? 'animate-spin' : ''} 
          />
          <span>Refresh</span>
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Select
            label="Select Spreadsheet"
            placeholder="Choose a spreadsheet to manage"
            options={spreadsheetOptions}
            value={selectedSpreadsheet?.id || ''}
            onChange={(value) => {
              const sheet = spreadsheets?.find(s => s?.id === value);
              onSpreadsheetChange(sheet);
            }}
            searchable
            className="mb-0"
          />
        </div>
        
        {selectedSpreadsheet && (
          <div className="bg-muted rounded-md p-3">
            <div className="text-sm font-medium text-foreground mb-1">
              {selectedSpreadsheet?.name}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center">
                <Icon name="Calendar" size={12} className="mr-1" />
                Modified: {selectedSpreadsheet?.lastModified}
              </div>
              <div className="flex items-center">
                <Icon name="Users" size={12} className="mr-1" />
                {selectedSpreadsheet?.collaborators} collaborators
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpreadsheetSelector;
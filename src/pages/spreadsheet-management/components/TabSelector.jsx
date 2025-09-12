import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TabSelector = ({ tabs, selectedTab, onTabChange, onAddTab }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleAddTab = () => {
    if (newTabName?.trim()) {
      onAddTab(newTabName?.trim());
      setNewTabName('');
      setShowAddForm(false);
    }
  };

  if (!tabs || tabs?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="text-center text-muted-foreground">
          <Icon name="FileSpreadsheet" size={48} className="mx-auto mb-3 opacity-50" />
          <p>No tabs available. Select a spreadsheet to view its tabs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-semibold text-foreground flex items-center">
          <Icon name="Layers" size={18} className="mr-2 text-primary" />
          Spreadsheet Tabs
        </h3>
        <Button
          variant="outline"
          size="sm"
          iconName="Plus"
          iconPosition="left"
          onClick={() => setShowAddForm(true)}
        >
          Add Tab
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs?.map((tab) => (
          <button
            key={tab?.id}
            onClick={() => onTabChange(tab)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
              transition-all duration-200 border
              ${selectedTab?.id === tab?.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-foreground border-border hover:bg-muted hover:border-muted-foreground/20'
              }
            `}
          >
            <Icon name="Table" size={14} />
            <span>{tab?.name}</span>
            <div className="flex items-center space-x-1 text-xs opacity-75">
              <Icon name="Grid3x3" size={10} />
              <span>{tab?.rowCount}×{tab?.columnCount}</span>
            </div>
          </button>
        ))}
      </div>
      {showAddForm && (
        <div className="bg-muted rounded-md p-4 border border-border">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e?.target?.value)}
              placeholder="Enter tab name"
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyPress={(e) => e?.key === 'Enter' && handleAddTab()}
              autoFocus
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleAddTab}
              disabled={!newTabName?.trim()}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewTabName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {selectedTab && (
        <div className="bg-muted/50 rounded-md p-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">
                Active Tab: {selectedTab?.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedTab?.rowCount} rows • {selectedTab?.columnCount} columns • Last updated: {selectedTab?.lastModified}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${selectedTab?.hasChanges ? 'bg-warning' : 'bg-success'}`}></div>
              <span className="text-xs text-muted-foreground">
                {selectedTab?.hasChanges ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabSelector;
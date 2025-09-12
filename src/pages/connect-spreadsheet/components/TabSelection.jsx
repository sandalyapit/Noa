import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TabSelection = ({ tabs, selectedTab, onTabSelect, isVisible }) => {
  const [previewTab, setPreviewTab] = useState(null);

  if (!isVisible || !tabs?.length) return null;

  const handleTabClick = (tab) => {
    onTabSelect(tab);
  };

  const handlePreviewToggle = (tab) => {
    setPreviewTab(previewTab?.id === tab?.id ? null : tab);
  };

  const formatRowCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000)?.toFixed(1)}k`;
    }
    return count?.toString();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1 animate-fade-in">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
          <Icon name="Layers" size={20} className="text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Select Worksheet</h3>
          <p className="text-sm text-muted-foreground">Choose which sheet to connect and analyze</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tabs?.map((tab) => {
          const isSelected = selectedTab?.id === tab?.id;
          const isPreviewOpen = previewTab?.id === tab?.id;
          
          return (
            <div key={tab?.id} className="space-y-3">
              <div
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
                onClick={() => handleTabClick(tab)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{tab?.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRowCount(tab?.rowCount)} rows • {tab?.columnCount} columns
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full ml-2">
                      <Icon name="Check" size={14} className="text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${tab?.hasHeaders ? 'bg-success' : 'bg-warning'}`} />
                    <span className="text-xs text-muted-foreground">
                      {tab?.hasHeaders ? 'Headers detected' : 'No headers'}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="xs"
                    iconName={isPreviewOpen ? "ChevronUp" : "Eye"}
                    onClick={(e) => {
                      e?.stopPropagation();
                      handlePreviewToggle(tab);
                    }}
                  >
                    {isPreviewOpen ? 'Hide' : 'Preview'}
                  </Button>
                </div>

                {tab?.confidence && (
                  <div className="absolute top-2 right-2">
                    <div className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${tab?.confidence >= 90 ? 'bg-success/10 text-success' :
                        tab?.confidence >= 70 ? 'bg-warning/10 text-warning': 'bg-error/10 text-error'}
                    `}>
                      {tab?.confidence}%
                    </div>
                  </div>
                )}
              </div>
              {isPreviewOpen && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 animate-slide-in-from-top">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-foreground">Data Preview</h5>
                    <span className="text-xs text-muted-foreground">
                      Showing first {Math.min(3, tab?.sampleData?.length)} rows
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {tab?.headers?.map((header, index) => (
                            <th key={index} className="text-left p-2 font-medium text-muted-foreground">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tab?.sampleData?.slice(0, 3)?.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-border/50">
                            {row?.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 text-foreground">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedTab && (
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Info" size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Selected: {selectedTab?.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This worksheet contains {formatRowCount(selectedTab?.rowCount)} rows and {selectedTab?.columnCount} columns.
            {selectedTab?.hasHeaders ? ' Headers have been automatically detected.' : ' No headers detected - you may need to configure manually.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TabSelection;
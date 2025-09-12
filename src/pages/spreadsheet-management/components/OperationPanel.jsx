import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const OperationPanel = ({ 
  selectedRows, 
  onAddRow, 
  onDeleteRows, 
  onBulkUpdate, 
  onExport,
  isProcessing 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [bulkOperation, setBulkOperation] = useState({
    column: '',
    operation: 'replace',
    value: ''
  });

  const operationTypes = [
    { value: 'replace', label: 'Replace Value' },
    { value: 'append', label: 'Append Text' },
    { value: 'prepend', label: 'Prepend Text' },
    { value: 'clear', label: 'Clear Cells' }
  ];

  const exportFormats = [
    { value: 'csv', label: 'CSV File' },
    { value: 'xlsx', label: 'Excel File' },
    { value: 'json', label: 'JSON File' },
    { value: 'pdf', label: 'PDF Report' }
  ];

  const handleAddRow = () => {
    onAddRow(newRowData);
    setNewRowData({});
    setShowAddForm(false);
  };

  const handleBulkUpdate = () => {
    onBulkUpdate(selectedRows, bulkOperation);
    setBulkOperation({ column: '', operation: 'replace', value: '' });
    setShowBulkForm(false);
  };

  const handleExport = (format) => {
    onExport(format, selectedRows?.length > 0 ? selectedRows : null);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-semibold text-foreground flex items-center">
          <Icon name="Settings" size={18} className="mr-2 text-primary" />
          Data Operations
        </h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          {selectedRows?.length > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
              {selectedRows?.length} rows selected
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Button
          variant="default"
          iconName="Plus"
          iconPosition="left"
          onClick={() => setShowAddForm(true)}
          disabled={isProcessing}
          fullWidth
        >
          Add Row
        </Button>

        <Button
          variant="outline"
          iconName="Edit"
          iconPosition="left"
          onClick={() => setShowBulkForm(true)}
          disabled={selectedRows?.length === 0 || isProcessing}
          fullWidth
        >
          Bulk Edit
        </Button>

        <Button
          variant="destructive"
          iconName="Trash2"
          iconPosition="left"
          onClick={() => onDeleteRows(selectedRows)}
          disabled={selectedRows?.length === 0 || isProcessing}
          fullWidth
        >
          Delete Rows
        </Button>

        <div className="relative">
          <select
            onChange={(e) => e?.target?.value && handleExport(e?.target?.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
            disabled={isProcessing}
          >
            <option value="">Export Data</option>
            {exportFormats?.map(format => (
              <option key={format?.value} value={format?.value}>
                {format?.label}
              </option>
            ))}
          </select>
          <Icon name="Download" size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      {/* Add Row Form */}
      {showAddForm && (
        <div className="bg-muted rounded-lg p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">Add New Row</h4>
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={() => setShowAddForm(false)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Input
              label="Column A"
              placeholder="Enter value"
              value={newRowData?.columnA || ''}
              onChange={(e) => setNewRowData({...newRowData, columnA: e?.target?.value})}
            />
            <Input
              label="Column B"
              placeholder="Enter value"
              value={newRowData?.columnB || ''}
              onChange={(e) => setNewRowData({...newRowData, columnB: e?.target?.value})}
            />
            <Input
              label="Column C"
              placeholder="Enter value"
              value={newRowData?.columnC || ''}
              onChange={(e) => setNewRowData({...newRowData, columnC: e?.target?.value})}
            />
            <Input
              label="Column D"
              placeholder="Enter value"
              value={newRowData?.columnD || ''}
              onChange={(e) => setNewRowData({...newRowData, columnD: e?.target?.value})}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleAddRow}
              loading={isProcessing}
            >
              Add Row
            </Button>
          </div>
        </div>
      )}
      {/* Bulk Update Form */}
      {showBulkForm && (
        <div className="bg-muted rounded-lg p-4 mb-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">
              Bulk Update ({selectedRows?.length} rows)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              onClick={() => setShowBulkForm(false)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Input
              label="Column"
              placeholder="Column name or index"
              value={bulkOperation?.column}
              onChange={(e) => setBulkOperation({...bulkOperation, column: e?.target?.value})}
            />
            <Select
              label="Operation"
              options={operationTypes}
              value={bulkOperation?.operation}
              onChange={(value) => setBulkOperation({...bulkOperation, operation: value})}
            />
            <Input
              label="Value"
              placeholder="New value"
              value={bulkOperation?.value}
              onChange={(e) => setBulkOperation({...bulkOperation, value: e?.target?.value})}
              disabled={bulkOperation?.operation === 'clear'}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setShowBulkForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleBulkUpdate}
              loading={isProcessing}
              disabled={!bulkOperation?.column || (bulkOperation?.operation !== 'clear' && !bulkOperation?.value)}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      )}
      {/* Processing Indicator */}
      {isProcessing && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-warning">
            <Icon name="Loader2" size={16} className="animate-spin" />
            <span className="text-sm font-medium">Processing operation...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationPanel;
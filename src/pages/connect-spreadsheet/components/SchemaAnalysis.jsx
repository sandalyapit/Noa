import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const SchemaAnalysis = ({ schema, onSchemaUpdate, isVisible }) => {
  const [editingColumn, setEditingColumn] = useState(null);
  const [previewRows, setPreviewRows] = useState(5);

  if (!isVisible || !schema) return null;

  const dataTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'url', label: 'URL' },
    { value: 'boolean', label: 'Boolean' }
  ];

  const getDataTypeIcon = (type) => {
    const icons = {
      text: 'Type',
      number: 'Hash',
      date: 'Calendar',
      email: 'Mail',
      phone: 'Phone',
      url: 'Link',
      boolean: 'ToggleLeft'
    };
    return icons?.[type] || 'Type';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-success bg-success/10';
    if (confidence >= 70) return 'text-warning bg-warning/10';
    return 'text-error bg-error/10';
  };

  const handleColumnUpdate = (columnIndex, updates) => {
    const updatedColumns = schema?.columns?.map((col, index) => 
      index === columnIndex ? { ...col, ...updates } : col
    );
    onSchemaUpdate({ ...schema, columns: updatedColumns });
    setEditingColumn(null);
  };

  const previewRowOptions = [
    { value: 3, label: '3 rows' },
    { value: 5, label: '5 rows' },
    { value: 10, label: '10 rows' },
    { value: 20, label: '20 rows' }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 elevation-1 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-secondary/10 rounded-lg">
            <Icon name="Database" size={20} className="text-secondary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Schema Analysis</h3>
            <p className="text-sm text-muted-foreground">AI-detected column types and data structure</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select
            options={previewRowOptions}
            value={previewRows}
            onChange={setPreviewRows}
            placeholder="Preview rows"
            className="w-32"
          />
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(schema?.overallConfidence)}`}>
            {schema?.overallConfidence}% Overall
          </div>
        </div>
      </div>
      {/* Column Schema */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-foreground">Detected Columns</h4>
        <div className="grid gap-3">
          {schema?.columns?.map((column, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Icon name={getDataTypeIcon(column?.dataType)} size={16} className="text-muted-foreground" />
                  <div>
                    <h5 className="font-medium text-foreground">{column?.name}</h5>
                    <p className="text-xs text-muted-foreground">Column {index + 1}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(column?.confidence)}`}>
                    {column?.confidence}%
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    iconName="Edit"
                    onClick={() => setEditingColumn(editingColumn === index ? null : index)}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {editingColumn === index && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                  <Select
                    label="Data Type"
                    options={dataTypeOptions}
                    value={column?.dataType}
                    onChange={(value) => handleColumnUpdate(index, { dataType: value })}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Validation Rules</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={column?.required || false}
                          onChange={(e) => handleColumnUpdate(index, { required: e?.target?.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">Required field</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={column?.unique || false}
                          onChange={(e) => handleColumnUpdate(index, { unique: e?.target?.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">Unique values only</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Sample Values</span>
                  <span>{column?.sampleValues?.length} samples</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {column?.sampleValues?.slice(0, 5)?.map((value, valueIndex) => (
                    <span key={valueIndex} className="px-2 py-1 bg-muted rounded text-xs text-foreground">
                      {value || 'Empty'}
                    </span>
                  ))}
                  {column?.sampleValues?.length > 5 && (
                    <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                      +{column?.sampleValues?.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Data Preview */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Data Preview</h4>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground w-12">#</th>
                  {schema?.columns?.map((column, index) => (
                    <th key={index} className="text-left p-3 font-medium text-foreground min-w-32">
                      <div className="flex items-center space-x-2">
                        <Icon name={getDataTypeIcon(column?.dataType)} size={14} />
                        <span>{column?.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schema?.sampleData?.slice(0, previewRows)?.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground">{rowIndex + 1}</td>
                    {row?.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-3 text-foreground">
                        {cell || <span className="text-muted-foreground italic">Empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {schema?.sampleData?.length > previewRows && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {previewRows} of {schema?.sampleData?.length} total rows
          </p>
        )}
      </div>
      {/* Analysis Summary */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Icon name="BarChart3" size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">Analysis Summary</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Total Columns:</span>
            <span className="ml-2 font-medium text-foreground">{schema?.columns?.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Data Rows:</span>
            <span className="ml-2 font-medium text-foreground">{schema?.totalRows}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Headers Found:</span>
            <span className="ml-2 font-medium text-foreground">{schema?.hasHeaders ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Data Quality:</span>
            <span className={`ml-2 font-medium ${schema?.overallConfidence >= 80 ? 'text-success' : 'text-warning'}`}>
              {schema?.overallConfidence >= 80 ? 'Good' : 'Fair'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaAnalysis;
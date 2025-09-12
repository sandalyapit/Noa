import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const DataTable = ({ 
  data, 
  headers, 
  selectedRows, 
  onRowSelect, 
  onCellEdit, 
  onSort,
  sortConfig,
  isLoading 
}) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (rowIndex, columnIndex, currentValue) => {
    setEditingCell({ row: rowIndex, col: columnIndex });
    setEditValue(currentValue || '');
  };

  const handleCellSave = () => {
    if (editingCell) {
      onCellEdit(editingCell?.row, editingCell?.col, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSort = (columnIndex) => {
    const direction = sortConfig?.column === columnIndex && sortConfig?.direction === 'asc' ? 'desc' : 'asc';
    onSort(columnIndex, direction);
  };

  const getSortIcon = (columnIndex) => {
    if (sortConfig?.column !== columnIndex) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const isAllSelected = data?.length > 0 && selectedRows?.length === data?.length;
  const isIndeterminate = selectedRows?.length > 0 && selectedRows?.length < data?.length;

  const handleSelectAll = (checked) => {
    if (checked) {
      onRowSelect(data?.map((_, index) => index));
    } else {
      onRowSelect([]);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <Icon name="Loader2" size={24} className="animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">Loading spreadsheet data...</span>
        </div>
      </div>
    );
  }

  if (!data || data?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center text-muted-foreground">
          <Icon name="Table" size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">No Data Available</p>
          <p className="text-sm">Select a spreadsheet tab to view and manage data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="w-16 px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Row
              </th>
              {headers?.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-32"
                >
                  <button
                    onClick={() => handleSort(index)}
                    className="flex items-center space-x-1 hover:text-foreground transition-colors group"
                  >
                    <span>{header?.name}</span>
                    <Icon 
                      name={getSortIcon(index)} 
                      size={14} 
                      className="opacity-50 group-hover:opacity-100 transition-opacity" 
                    />
                  </button>
                  <div className="text-xs text-muted-foreground/70 mt-1 font-normal">
                    {header?.type} • {header?.confidence}% confidence
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`
                  hover:bg-muted/30 transition-colors
                  ${selectedRows?.includes(rowIndex) ? 'bg-primary/5 border-primary/20' : ''}
                `}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedRows?.includes(rowIndex)}
                    onChange={(e) => {
                      if (e?.target?.checked) {
                        onRowSelect([...selectedRows, rowIndex]);
                      } else {
                        onRowSelect(selectedRows?.filter(i => i !== rowIndex));
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                  {rowIndex + 1}
                </td>
                {row?.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-3 text-sm text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                  >
                    {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e?.target?.value)}
                          className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e?.key === 'Enter') handleCellSave();
                            if (e?.key === 'Escape') handleCellCancel();
                          }}
                          onBlur={handleCellSave}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          iconName="Check"
                          onClick={handleCellSave}
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          iconName="X"
                          onClick={handleCellCancel}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <span className={cell ? '' : 'text-muted-foreground italic'}>
                          {cell || 'Empty'}
                        </span>
                        <Icon 
                          name="Edit2" 
                          size={12} 
                          className="opacity-0 group-hover:opacity-50 transition-opacity ml-2" 
                        />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-muted/30 px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {data?.length} rows • {selectedRows?.length} selected
          </div>
          <div className="flex items-center space-x-4">
            <span>Double-click cells to edit</span>
            <div className="flex items-center space-x-1">
              <Icon name="Info" size={14} />
              <span>Changes auto-save</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
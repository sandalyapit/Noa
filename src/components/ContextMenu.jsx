import React from 'react';
import { 
  BarChart3, 
  Copy, 
  Download, 
  Edit, 
  Eye, 
  RefreshCw, 
  Settings, 
  Share, 
  Trash2, 
  Zap,
  FileText,
  Database,
  Plus,
  Minus,
  Calculator,
  Filter
} from 'lucide-react';

/**
 * Context Menu Component
 * Provides contextual actions based on the selected item type
 */
const ContextMenu = ({ data, onAction }) => {
  const getMenuItems = () => {
    if (!data) return [];

    const { type, ...itemData } = data;

    switch (type) {
      case 'spreadsheet':
        return [
          {
            icon: Eye,
            label: 'View Details',
            action: 'view',
            description: 'Open spreadsheet details'
          },
          {
            icon: Edit,
            label: 'Edit',
            action: 'edit',
            description: 'Edit spreadsheet data'
          },
          {
            icon: BarChart3,
            label: 'Analyze with AI',
            action: 'analyze',
            description: 'Get AI insights about this spreadsheet',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Copy,
            label: 'Duplicate',
            action: 'duplicate',
            description: 'Create a copy of this spreadsheet'
          },
          {
            icon: Share,
            label: 'Share',
            action: 'share',
            description: 'Share with others'
          },
          {
            icon: Download,
            label: 'Export',
            action: 'export',
            description: 'Export to CSV, Excel, or PDF'
          },
          { type: 'separator' },
          {
            icon: RefreshCw,
            label: 'Refresh Data',
            action: 'refresh',
            description: 'Sync latest data from Google Sheets'
          },
          {
            icon: Settings,
            label: 'Settings',
            action: 'settings',
            description: 'Configure spreadsheet settings'
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Disconnect',
            action: 'disconnect',
            description: 'Remove from Smart Spreadsheet Assistant',
            danger: true
          }
        ];

      case 'cell':
        return [
          {
            icon: Edit,
            label: 'Edit Cell',
            action: 'edit-cell',
            description: 'Modify cell value'
          },
          {
            icon: Copy,
            label: 'Copy Value',
            action: 'copy-cell',
            description: 'Copy cell content to clipboard'
          },
          {
            icon: Calculator,
            label: 'Insert Formula',
            action: 'insert-formula',
            description: 'Add a formula to this cell'
          },
          { type: 'separator' },
          {
            icon: BarChart3,
            label: 'Analyze Cell',
            action: 'analyze-cell',
            description: 'Get AI insights about this cell',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Clear Cell',
            action: 'clear-cell',
            description: 'Remove cell content',
            danger: true
          }
        ];

      case 'row':
        return [
          {
            icon: Eye,
            label: 'View Row',
            action: 'view-row',
            description: 'Highlight and view row data'
          },
          {
            icon: Edit,
            label: 'Edit Row',
            action: 'edit-row',
            description: 'Modify row data'
          },
          {
            icon: Copy,
            label: 'Duplicate Row',
            action: 'duplicate-row',
            description: 'Create a copy of this row'
          },
          { type: 'separator' },
          {
            icon: Plus,
            label: 'Insert Row Above',
            action: 'insert-row-above',
            description: 'Add new row above this one'
          },
          {
            icon: Plus,
            label: 'Insert Row Below',
            action: 'insert-row-below',
            description: 'Add new row below this one'
          },
          { type: 'separator' },
          {
            icon: BarChart3,
            label: 'Analyze Row',
            action: 'analyze-row',
            description: 'Get AI insights about this row',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Delete Row',
            action: 'delete-row',
            description: 'Remove this row permanently',
            danger: true
          }
        ];

      case 'column':
        return [
          {
            icon: Eye,
            label: 'View Column',
            action: 'view-column',
            description: 'Highlight and view column data'
          },
          {
            icon: Edit,
            label: 'Rename Column',
            action: 'rename-column',
            description: 'Change column header'
          },
          {
            icon: Calculator,
            label: 'Add Formula',
            action: 'add-column-formula',
            description: 'Apply formula to entire column'
          },
          { type: 'separator' },
          {
            icon: Filter,
            label: 'Filter Column',
            action: 'filter-column',
            description: 'Filter data by this column'
          },
          {
            icon: BarChart3,
            label: 'Create Chart',
            action: 'create-chart',
            description: 'Generate chart from column data'
          },
          { type: 'separator' },
          {
            icon: Plus,
            label: 'Insert Column Left',
            action: 'insert-column-left',
            description: 'Add new column to the left'
          },
          {
            icon: Plus,
            label: 'Insert Column Right',
            action: 'insert-column-right',
            description: 'Add new column to the right'
          },
          { type: 'separator' },
          {
            icon: Zap,
            label: 'Analyze Column',
            action: 'analyze-column',
            description: 'Get AI insights about this column',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Delete Column',
            action: 'delete-column',
            description: 'Remove this column permanently',
            danger: true
          }
        ];

      case 'range':
        return [
          {
            icon: Eye,
            label: 'View Range',
            action: 'view-range',
            description: 'Highlight selected range'
          },
          {
            icon: Copy,
            label: 'Copy Range',
            action: 'copy-range',
            description: 'Copy range to clipboard'
          },
          {
            icon: Calculator,
            label: 'Calculate Sum',
            action: 'calculate-sum',
            description: 'Calculate sum of numeric values'
          },
          { type: 'separator' },
          {
            icon: BarChart3,
            label: 'Create Chart',
            action: 'create-range-chart',
            description: 'Generate chart from selected data'
          },
          {
            icon: Download,
            label: 'Export Range',
            action: 'export-range',
            description: 'Export selected data'
          },
          { type: 'separator' },
          {
            icon: Zap,
            label: 'Analyze Range',
            action: 'analyze-range',
            description: 'Get AI insights about selected data',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Clear Range',
            action: 'clear-range',
            description: 'Clear all values in range',
            danger: true
          }
        ];

      case 'tab':
        return [
          {
            icon: Eye,
            label: 'Switch to Tab',
            action: 'switch-tab',
            description: 'Navigate to this tab'
          },
          {
            icon: Edit,
            label: 'Rename Tab',
            action: 'rename-tab',
            description: 'Change tab name'
          },
          {
            icon: Copy,
            label: 'Duplicate Tab',
            action: 'duplicate-tab',
            description: 'Create a copy of this tab'
          },
          { type: 'separator' },
          {
            icon: Download,
            label: 'Export Tab',
            action: 'export-tab',
            description: 'Export tab data'
          },
          {
            icon: BarChart3,
            label: 'Analyze Tab',
            action: 'analyze-tab',
            description: 'Get AI insights about this tab',
            highlight: true
          },
          { type: 'separator' },
          {
            icon: Settings,
            label: 'Tab Settings',
            action: 'tab-settings',
            description: 'Configure tab properties'
          },
          { type: 'separator' },
          {
            icon: Trash2,
            label: 'Delete Tab',
            action: 'delete-tab',
            description: 'Remove this tab permanently',
            danger: true
          }
        ];

      default:
        return [
          {
            icon: RefreshCw,
            label: 'Refresh',
            action: 'refresh',
            description: 'Refresh current view'
          },
          {
            icon: Settings,
            label: 'Settings',
            action: 'settings',
            description: 'Open settings'
          }
        ];
    }
  };

  const handleItemClick = (item) => {
    if (item.type === 'separator') return;
    onAction(item.action, data);
  };

  const menuItems = getMenuItems();

  return (
    <div className="py-1">
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div key={index} className="border-t border-gray-200 my-1" />
          );
        }

        const Icon = item.icon;
        
        return (
          <button
            key={index}
            onClick={() => handleItemClick(item)}
            className={`
              w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors
              ${item.highlight ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
              ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
            `}
            title={item.description}
          >
            <Icon className={`h-4 w-4 mr-3 ${
              item.highlight ? 'text-blue-500' : 
              item.danger ? 'text-red-500' : 'text-gray-500'
            }`} />
            <div className="flex-1">
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
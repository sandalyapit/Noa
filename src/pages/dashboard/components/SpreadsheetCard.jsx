import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const SpreadsheetCard = ({ spreadsheet, onEdit, onDuplicate, onDisconnect }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-success text-success-foreground';
      case 'syncing':
        return 'bg-warning text-warning-foreground';
      case 'error':
        return 'bg-error text-error-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMenuToggle = (e) => {
    e?.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (action, e) => {
    e?.stopPropagation();
    setIsMenuOpen(false);
    
    switch (action) {
      case 'edit':
        onEdit(spreadsheet);
        break;
      case 'duplicate':
        onDuplicate(spreadsheet);
        break;
      case 'disconnect':
        onDisconnect(spreadsheet);
        break;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:elevation-2 transition-all duration-200 cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <Image
              src={spreadsheet?.thumbnail || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop&crop=center'}
              alt={`${spreadsheet?.name} thumbnail`}
              className="w-12 h-12 rounded-md object-cover border border-border"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {spreadsheet?.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {spreadsheet?.sheets} sheets • {spreadsheet?.rows} rows
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(spreadsheet?.status)}`}>
            <Icon 
              name={spreadsheet?.status === 'connected' ? 'CheckCircle' : 
                    spreadsheet?.status === 'syncing' ? 'Loader2' : 'AlertCircle'} 
              size={12} 
              className={spreadsheet?.status === 'syncing' ? 'animate-spin mr-1' : 'mr-1'}
            />
            {spreadsheet?.status}
          </span>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenuToggle}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Icon name="MoreVertical" size={16} />
            </Button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-md elevation-2 z-10">
                <div className="py-1">
                  <button
                    onClick={(e) => handleAction('edit', e)}
                    className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="Edit" size={14} className="mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleAction('duplicate', e)}
                    className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name="Copy" size={14} className="mr-2" />
                    Duplicate
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button
                    onClick={(e) => handleAction('disconnect', e)}
                    className="flex items-center w-full px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                  >
                    <Icon name="Unlink" size={14} className="mr-2" />
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-muted-foreground">
          <Icon name="Calendar" size={12} className="mr-1" />
          Last modified: {formatDate(spreadsheet?.lastModified)}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Icon name="User" size={12} className="mr-1" />
          Owner: {spreadsheet?.owner}
        </div>
        {spreadsheet?.lastOperation && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Icon name="Activity" size={12} className="mr-1" />
            Last operation: {spreadsheet?.lastOperation}
          </div>
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span className="flex items-center">
            <Icon name="FileSpreadsheet" size={12} className="mr-1" />
            {spreadsheet?.size}
          </span>
          <span className="flex items-center">
            <Icon name="Users" size={12} className="mr-1" />
            {spreadsheet?.collaborators} collaborators
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => handleAction('edit', e)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Icon name="ExternalLink" size={14} className="mr-1" />
          Open
        </Button>
      </div>
    </div>
  );
};

export default SpreadsheetCard;
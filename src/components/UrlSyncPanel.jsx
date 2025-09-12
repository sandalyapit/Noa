import React, { useState, useCallback } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Link, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import AppsScriptService from '../services/appsScriptService';

/**
 * URL Sync Panel for connecting to Google Sheets
 * Handles URL validation, ID extraction, and tab discovery
 */
const UrlSyncPanel = ({ 
  appsScriptUrl, 
  onSelectTab,
  disabled = false,
  className = '' 
}) => {
  const [url, setUrl] = useState('');
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationState, setValidationState] = useState('idle'); // idle, valid, invalid
  
  const service = new AppsScriptService(appsScriptUrl);

  // Validate URL format in real-time
  const validateUrl = useCallback((inputUrl) => {
    if (!inputUrl?.trim()) {
      setValidationState('idle');
      return;
    }

    const extractedId = AppsScriptService?.extractSpreadsheetId(inputUrl);
    if (extractedId) {
      setValidationState('valid');
    } else {
      setValidationState('invalid');
    }
  }, []);

  const handleUrlChange = (e) => {
    const newUrl = e?.target?.value;
    setUrl(newUrl);
    setError('');
    setTabs([]);
    validateUrl(newUrl);
  };

  const discoverTabs = async () => {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) {
      setError('Please enter a Google Sheets URL or ID');
      return;
    }

    const spreadsheetId = AppsScriptService?.extractSpreadsheetId(trimmedUrl);
    if (!spreadsheetId) {
      setError('Invalid Google Sheets URL or ID format');
      return;
    }

    setLoading(true);
    setError('');
    setTabs([]);

    try {
      const response = await service?.listTabs(spreadsheetId);
      
      if (!response?.success) {
        const errorMsg = response?.error || 'Failed to discover tabs';
        setError(errorMsg);
        
        // Provide helpful error messages
        if (errorMsg?.includes('permission') || errorMsg?.includes('access')) {
          setError('Access denied. Please check sharing permissions for this spreadsheet.');
        } else if (errorMsg?.includes('not found') || errorMsg?.includes('invalid')) {
          setError('Spreadsheet not found. Please verify the URL or ID is correct.');
        } else {
          setError(`Discovery failed: ${errorMsg}`);
        }
        return;
      }

      const sheets = response?.sheets || [];
      if (sheets?.length === 0) {
        setError('No tabs found in this spreadsheet');
        return;
      }

      setTabs(sheets);
    } catch (error) {
      console.error('Tab discovery error:', error);
      
      if (error?.message?.includes('timeout')) {
        setError('Request timeout. The Apps Script service may be slow to respond.');
      } else if (error?.message?.includes('network')) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Failed to connect to spreadsheet. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabSelect = (tab) => {
    const spreadsheetId = AppsScriptService?.extractSpreadsheetId(url);
    onSelectTab?.({
      spreadsheetId,
      tabName: tab?.name,
      tabMetadata: tab
    });
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Link className="h-4 w-4 text-gray-400" />;
    }
  };

  const getValidationMessage = () => {
    switch (validationState) {
      case 'valid':
        return 'Valid Google Sheets URL or ID';
      case 'invalid':
        return 'Invalid format. Expected Google Sheets URL or spreadsheet ID';
      default:
        return '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label htmlFor="sheets-url" className="block text-sm font-medium text-gray-700">
          Google Sheets URL or ID
        </label>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {getValidationIcon()}
          </div>
          
          <Input
            id="sheets-url"
            type="text"
            value={url}
            onChange={handleUrlChange}
            disabled={disabled || loading}
            placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID"
            className="pl-10"
          />
        </div>
        
        {getValidationMessage() && (
          <p className={`text-xs ${
            validationState === 'valid' ? 'text-green-600' : 'text-red-600'
          }`}>
            {getValidationMessage()}
          </p>
        )}
      </div>
      <Button
        onClick={discoverTabs}
        disabled={disabled || loading || validationState !== 'valid'}
        className="w-full"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Discovering Tabs...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Discover Tabs
          </>
        )}
      </Button>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-600">
              <p className="font-medium">Connection Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}
      {tabs?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Available Tabs ({tabs?.length})
            </h4>
            <span className="text-xs text-gray-500">
              {AppsScriptService?.extractSpreadsheetId(url)}
            </span>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tabs?.map((tab) => (
              <div
                key={tab?.gid}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 truncate">
                    {tab?.name}
                  </h5>
                  <p className="text-xs text-gray-500">
                    {tab?.rows?.toLocaleString()} rows × {tab?.cols?.toLocaleString()} columns
                  </p>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleTabSelect(tab)}
                  disabled={disabled}
                  className="ml-3 flex-shrink-0"
                >
                  Select
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Paste a Google Sheets URL or enter the spreadsheet ID directly</p>
        <p>🔗 Make sure the spreadsheet is shared with proper permissions</p>
        <p>📊 You can select any tab from the discovered list</p>
      </div>
    </div>
  );
};

export default UrlSyncPanel;
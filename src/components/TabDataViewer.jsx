import React, { useState, useEffect, useCallback } from 'react';
import Button from './ui/Button';
import { Eye, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import AppsScriptService from '../services/appsScriptService';
import DynamicFormGenerator from './DynamicFormGenerator';
import geminiService from '../services/geminiService';

/**
 * Tab Data Viewer with schema analysis and form generation
 * Displays spreadsheet data with AI-powered insights
 */
const TabDataViewer = ({ 
  appsScriptUrl, 
  selected, 
  disabled = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  const service = new AppsScriptService(appsScriptUrl);

  const fetchTabData = useCallback(async () => {
    if (!selected?.spreadsheetId || !selected?.tabName) return;
    
    setLoading(true);
    setError('');
    setData(null);
    setAiAnalysis('');

    try {
      const response = await service?.fetchTabData(
        selected?.spreadsheetId, 
        selected?.tabName, 
        { sampleMaxRows: 500 }
      );

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch tab data');
      }

      setData(response?.data);
    } catch (error) {
      console.error('Tab data fetch error:', error);
      setError(error?.message);
    } finally {
      setLoading(false);
    }
  }, [selected, appsScriptUrl]);

  const analyzeWithAI = async () => {
    if (!data) return;
    
    setAnalyzingWithAI(true);
    try {
      const analysis = await geminiService?.analyzeSpreadsheetSchema(data);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis('Failed to analyze data with AI. Please try again.');
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  // Auto-fetch data when selection changes
  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const handleFormSubmit = async (formData) => {
    if (!selected?.spreadsheetId || !selected?.tabName) {
      throw new Error('No spreadsheet selected');
    }

    // First, show dry run preview
    const dryRunResponse = await service?.addRow(
      selected?.spreadsheetId,
      selected?.tabName,
      formData,
      { dryRun: true }
    );

    if (dryRunResponse?.dryRun && dryRunResponse?.preview) {
      const confirmed = window.confirm(
        `Preview of new row:\n${JSON.stringify(dryRunResponse?.preview, null, 2)}\n\nAdd this row?`
      );
      
      if (!confirmed) {
        throw new Error('Operation cancelled by user');
      }
    }

    // Execute the actual operation
    const response = await service?.addRow(
      selected?.spreadsheetId,
      selected?.tabName,
      formData,
      { 
        dryRun: false, 
        author: 'smart-spreadsheet-assistant'
      }
    );

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to add row');
    }

    // Refresh data to show the new row
    fetchTabData();
    
    return response;
  };

  const renderDataTable = () => {
    if (!data?.sampleValues?.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No data available to preview</p>
        </div>
      );
    }

    const maxRows = 10; // Limit preview rows
    const rows = data?.sampleValues?.slice(0, maxRows);
    const hasMoreRows = data?.sampleValues?.length > maxRows;

    return (
      <div className="space-y-2">
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  #
                </th>
                {data?.headers?.map((header, index) => (
                  <th
                    key={index}
                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b truncate max-w-32"
                    title={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows?.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1 text-xs text-gray-500 border-r">
                    {rowIndex + 1}
                  </td>
                  {row?.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-2 py-1 text-xs text-gray-900 truncate max-w-32"
                      title={String(cell)}
                    >
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMoreRows && (
          <p className="text-xs text-gray-500 text-center">
            Showing first {maxRows} rows of {data?.sampleValues?.length} sampled rows
          </p>
        )}
      </div>
    );
  };

  const renderSchema = () => {
    if (!data?.schema?.length) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Column Schema</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.schema?.map((column) => (
            <div
              key={column?.name}
              className="p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-900 truncate">
                  {column?.name}
                </h5>
                {column?.dataType?.confidence < 0.7 && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" title="Uncertain data type detection" />
                )}
              </div>
              
              <div className="space-y-1 text-xs text-gray-600">
                <p>Type: <span className="font-medium">{column?.dataType?.type}</span></p>
                <p>Non-empty: <span className="font-medium">{column?.stats?.nonEmpty}</span></p>
                {column?.stats?.sampleValues?.length > 0 && (
                  <p>Samples: {column?.stats?.sampleValues?.slice(0, 2)?.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!selected) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">Select a tab to preview</p>
        <p className="text-sm">Use the URL sync panel to discover and select spreadsheet tabs</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading tab data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to load data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={fetchTabData}
                className="mt-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No data loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metadata */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{data?.sheetName}</h3>
          <p className="text-sm text-gray-600">
            {data?.dimensions?.rows?.toLocaleString()} rows × {data?.dimensions?.cols?.toLocaleString()} columns
            {data?.dimensions?.sampledRows && (
              <span className="ml-2">
                (sampled {data?.dimensions?.sampledRows} rows)
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={analyzeWithAI}
            disabled={disabled || analyzingWithAI}
          >
            {analyzingWithAI ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                AI Analysis
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTabData}
            disabled={disabled || loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      {/* AI Analysis Results */}
      {aiAnalysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">AI Analysis Results</h4>
          <div className="text-sm text-blue-800 whitespace-pre-wrap">
            {aiAnalysis}
          </div>
        </div>
      )}
      {/* Schema Information */}
      {renderSchema()}
      {/* Data Preview Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Data Preview</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>
      {/* Data Table */}
      {showPreview && renderDataTable()}
      {/* Dynamic Form for Adding Rows */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Row</h4>
        <DynamicFormGenerator
          sheetSchema={data?.schema}
          onSubmit={handleFormSubmit}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default TabDataViewer;
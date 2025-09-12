import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Sparkles, Download, AlertCircle, CheckCircle } from 'lucide-react';
import geminiService from '../../../services/geminiService';

/**
 * AI Transformation Panel
 * Provides AI-powered data transformation suggestions and guidance
 */
const AITransformationPanel = ({ 
  sourceData = null, 
  disabled = false,
  onTransformationSuggestion = null,
  className = ''
}) => {
  const [transformationGoal, setTransformationGoal] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSuggestions = async () => {
    if (!transformationGoal?.trim()) {
      setError('Please describe what you want to achieve');
      return;
    }

    if (!sourceData) {
      setError('No source data available. Please select a spreadsheet first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuggestions('');

    try {
      const suggestions = await geminiService?.suggestDataTransformation(
        sourceData,
        transformationGoal
      );
      
      setSuggestions(suggestions);
      onTransformationSuggestion?.(suggestions);
      
    } catch (error) {
      console.error('Transformation suggestion error:', error);
      setError('Failed to generate transformation suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      generateSuggestions();
    }
  };

  const clearSuggestions = () => {
    setSuggestions('');
    setError('');
    setTransformationGoal('');
  };

  const downloadSuggestions = () => {
    if (!suggestions) return;
    
    const blob = new Blob([suggestions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformation-suggestions.txt';
    document.body?.appendChild(a);
    a?.click();
    document.body?.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-medium text-gray-900">AI Data Transformation</h3>
      </div>
      {/* Source Data Summary */}
      {sourceData && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-900 mb-1">Source Data:</div>
          <div className="text-gray-600">
            Sheet: {sourceData?.sheetName} • 
            Headers: {sourceData?.headers?.slice(0, 3)?.join(', ')}
            {sourceData?.headers?.length > 3 && ` (+${sourceData?.headers?.length - 3} more)`}
          </div>
        </div>
      )}
      {/* Input Section */}
      <div className="space-y-3">
        <div>
          <label htmlFor="transformation-goal" className="block text-sm font-medium text-gray-700 mb-1">
            What do you want to achieve?
          </label>
          <Input
            id="transformation-goal"
            value={transformationGoal}
            onChange={(e) => setTransformationGoal(e?.target?.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Clean up the data, merge duplicates, create pivot table, normalize format..."
            disabled={disabled || isLoading}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe your data transformation goal in plain English
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={generateSuggestions}
            disabled={disabled || isLoading || !transformationGoal?.trim() || !sourceData}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Suggestions...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Suggestions
              </>
            )}
          </Button>

          {suggestions && (
            <Button
              variant="outline"
              onClick={downloadSuggestions}
              disabled={disabled}
              title="Download suggestions as text file"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      {/* Suggestions Display */}
      {suggestions && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start mb-3">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-800">AI Transformation Suggestions</h4>
              <p className="text-xs text-green-600 mt-1">Generated based on your data and goals</p>
            </div>
          </div>
          
          <div className="bg-white rounded-md p-3 text-sm text-gray-900 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {suggestions}
          </div>

          <div className="mt-3 flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={clearSuggestions}
              disabled={disabled}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(suggestions);
              }}
              disabled={disabled}
            >
              Copy to Clipboard
            </Button>
          </div>
        </div>
      )}
      {/* Usage Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="text-blue-900 font-medium mb-2">💡 Tips for better suggestions:</div>
        <ul className="text-blue-800 space-y-1 text-xs">
          <li>• Be specific about your end goal (e.g., "prepare data for analysis")</li>
          <li>• Mention any data quality issues you've noticed</li>
          <li>• Describe the format or structure you need</li>
          <li>• Include context about how the data will be used</li>
        </ul>
      </div>
    </div>
  );
};

export default AITransformationPanel;
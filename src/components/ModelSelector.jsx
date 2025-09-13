/**
 * Model Selector Component
 * Allows users to select AI models from OpenRouter with real-time fetching
 */

import React, { useState, useEffect } from 'react';
import openRouterModelService from '../services/openRouterModelService.js';

const ModelSelector = ({ 
  selectedModel, 
  onModelChange, 
  category = 'normalization',
  showTesting = false,
  className = ''
}) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  useEffect(() => {
    loadModels();
  }, [category]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const recommendedModels = await openRouterModelService.getRecommendedModels();
      const categoryModels = recommendedModels[category] || [];
      
      // Format models for display
      const formattedModels = categoryModels.map(model => 
        openRouterModelService.formatModelForDisplay(model)
      );
      
      setModels(formattedModels);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllModels = async () => {
    setLoading(true);
    
    try {
      const allModels = await openRouterModelService.fetchModels();
      const formattedModels = allModels
        .map(model => openRouterModelService.formatModelForDisplay(model))
        .slice(0, 50); // Limit to first 50 for performance
      
      setModels(formattedModels);
      setShowAllModels(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testModel = async (modelId) => {
    setTesting(true);
    setTestResults(prev => ({
      ...prev,
      [modelId]: { testing: true }
    }));

    try {
      const result = await openRouterModelService.testModel(modelId);
      setTestResults(prev => ({
        ...prev,
        [modelId]: result
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [modelId]: { success: false, error: err.message }
      }));
    } finally {
      setTesting(false);
    }
  };

  const refreshModels = async () => {
    openRouterModelService.clearCache();
    await loadModels();
  };

  const getCategoryDisplayName = (cat) => {
    const names = {
      normalization: 'Fast & Cheap (Normalization)',
      general: 'Balanced (General Use)',
      premium: 'High Quality (Premium)',
      all: 'All Available Models'
    };
    return names[cat] || cat;
  };

  const getStatusIcon = (model) => {
    const result = testResults[model.id];
    if (result?.testing) return '🔄';
    if (result?.success && result?.working) return '✅';
    if (result?.success && !result?.working) return '⚠️';
    if (result?.success === false) return '❌';
    return '';
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading models...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border rounded-lg bg-red-50 border-red-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-600">Failed to load models</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
          <button
            onClick={loadModels}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            {getCategoryDisplayName(category)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {models.length} models available
          </p>
        </div>
        <div className="flex space-x-2">
          {!showAllModels && (
            <button
              onClick={loadAllModels}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Show All
            </button>
          )}
          <button
            onClick={refreshModels}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Model List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onModelChange(model.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {model.displayName}
                  </h4>
                  {model.recommended && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Recommended
                    </span>
                  )}
                  {getStatusIcon(model) && (
                    <span className="text-sm">{getStatusIcon(model)}</span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{model.provider}</span>
                  <span>{model.pricing.formatted}</span>
                  <span>{model.contextFormatted}</span>
                </div>
                
                {model.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {model.description}
                  </p>
                )}
              </div>
              
              {showTesting && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    testModel(model.id);
                  }}
                  disabled={testing}
                  className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Test
                </button>
              )}
            </div>
            
            {/* Test Results */}
            {testResults[model.id] && !testResults[model.id].testing && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                {testResults[model.id].success ? (
                  <div className="text-green-600">
                    ✅ Test passed: {testResults[model.id].response}
                    {testResults[model.id].usage && (
                      <div className="text-gray-500 mt-1">
                        Tokens: {testResults[model.id].usage.total_tokens || 'N/A'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    ❌ Test failed: {testResults[model.id].error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No models available for this category</p>
          <button
            onClick={loadAllModels}
            className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Load All Models
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
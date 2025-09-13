import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Settings, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import serviceManager from '../services/serviceManager';

/**
 * Apps Script Configuration Component
 * Allows users to configure Apps Script URL, token, and test the connection
 */
const AppsScriptConfig = ({ onConfigChange }) => {
  const [config, setConfig] = useState({
    appsScriptUrl: '',
    appsScriptToken: '',
    hiddenParserUrl: '',
    hiddenParserApiKey: ''
  });
  
  const [status, setStatus] = useState({
    appsScript: { connected: false, testing: false, error: null },
    hiddenParser: { connected: false, testing: false, error: null }
  });
  
  const [showTokens, setShowTokens] = useState({
    appsScript: false,
    hiddenParser: false
  });
  
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = () => {
    const configService = serviceManager.getConfigService();
    if (configService) {
      const currentConfig = configService.getServiceInitConfig();
      setConfig({
        appsScriptUrl: currentConfig.appsScript.url || '',
        appsScriptToken: currentConfig.appsScript.token || '',
        hiddenParserUrl: currentConfig.hiddenParser.url || '',
        hiddenParserApiKey: currentConfig.hiddenParser.apiKey || ''
      });
    }
  };

  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
    // Update the config service
    const configService = serviceManager.getConfigService();
    if (configService) {
      switch (field) {
        case 'appsScriptUrl':
          configService.setAppsScriptUrl(value);
          break;
        case 'appsScriptToken':
          configService.setAppsScriptToken(value);
          break;
        case 'hiddenParserUrl':
          configService.setHiddenParserUrl(value);
          break;
        case 'hiddenParserApiKey':
          configService.setHiddenParserApiKey(value);
          break;
      }
    }
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const testAppsScriptConnection = async () => {
    setStatus(prev => ({
      ...prev,
      appsScript: { ...prev.appsScript, testing: true, error: null }
    }));

    try {
      await serviceManager.reconfigure({
        appsScript: {
          url: config.appsScriptUrl,
          token: config.appsScriptToken
        }
      });

      const appsScript = serviceManager.getAppsScriptService();
      if (appsScript) {
        const result = await appsScript.getHealthStatus();
        setStatus(prev => ({
          ...prev,
          appsScript: {
            connected: result.success,
            testing: false,
            error: result.success ? null : 'Health check failed'
          }
        }));
      } else {
        throw new Error('Apps Script service not available');
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        appsScript: {
          connected: false,
          testing: false,
          error: error.message
        }
      }));
    }
  };

  const testHiddenParserConnection = async () => {
    if (!config.hiddenParserUrl) {
      setStatus(prev => ({
        ...prev,
        hiddenParser: {
          connected: false,
          testing: false,
          error: 'URL not provided'
        }
      }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      hiddenParser: { ...prev.hiddenParser, testing: true, error: null }
    }));

    try {
      await serviceManager.reconfigure({
        hiddenParser: {
          url: config.hiddenParserUrl,
          apiKey: config.hiddenParserApiKey
        }
      });

      const hiddenParser = serviceManager.getHiddenParserService();
      if (hiddenParser) {
        const result = await hiddenParser.getHealthStatus();
        setStatus(prev => ({
          ...prev,
          hiddenParser: {
            connected: result.healthy,
            testing: false,
            error: result.healthy ? null : (result.error || 'Health check failed')
          }
        }));
      } else {
        throw new Error('Hidden Parser service not available');
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        hiddenParser: {
          connected: false,
          testing: false,
          error: error.message
        }
      }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const toggleTokenVisibility = (service) => {
    setShowTokens(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Settings className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Apps Script Configuration</h3>
        </div>
        <div className="flex items-center space-x-2">
          {status.appsScript.connected && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {status.appsScript.error && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm text-gray-500">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Apps Script Configuration */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              Google Apps Script
              <span className="ml-2 text-sm text-gray-500">(Required)</span>
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apps Script Web App URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={config.appsScriptUrl}
                  onChange={(e) => handleConfigChange('appsScriptUrl', e.target.value)}
                  placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => copyToClipboard(config.appsScriptUrl)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  disabled={!config.appsScriptUrl}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Token
              </label>
              <div className="flex space-x-2">
                <input
                  type={showTokens.appsScript ? "text" : "password"}
                  value={config.appsScriptToken}
                  onChange={(e) => handleConfigChange('appsScriptToken', e.target.value)}
                  placeholder="Enter your secure API token"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => toggleTokenVisibility('appsScript')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  {showTokens.appsScript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(config.appsScriptToken)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  disabled={!config.appsScriptToken}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={testAppsScriptConnection}
                disabled={!config.appsScriptUrl || !config.appsScriptToken || status.appsScript.testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {status.appsScript.testing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>{status.appsScript.testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {status.appsScript.connected && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connected</span>
                </div>
              )}

              {status.appsScript.error && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{status.appsScript.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Parser Configuration */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              Hidden Parser Service
              <span className="ml-2 text-sm text-gray-500">(Optional)</span>
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parser Service URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={config.hiddenParserUrl}
                  onChange={(e) => handleConfigChange('hiddenParserUrl', e.target.value)}
                  placeholder="https://your-parser-service.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => copyToClipboard(config.hiddenParserUrl)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  disabled={!config.hiddenParserUrl}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="flex space-x-2">
                <input
                  type={showTokens.hiddenParser ? "text" : "password"}
                  value={config.hiddenParserApiKey}
                  onChange={(e) => handleConfigChange('hiddenParserApiKey', e.target.value)}
                  placeholder="Enter your parser API key (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => toggleTokenVisibility('hiddenParser')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  {showTokens.hiddenParser ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(config.hiddenParserApiKey)}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                  disabled={!config.hiddenParserApiKey}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={testHiddenParserConnection}
                disabled={!config.hiddenParserUrl || status.hiddenParser.testing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {status.hiddenParser.testing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>{status.hiddenParser.testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              {status.hiddenParser.connected && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Connected</span>
                </div>
              )}

              {status.hiddenParser.error && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{status.hiddenParser.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions</h5>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Create a new Google Apps Script project</li>
              <li>
                Copy the sample code from{' '}
                <a 
                  href="/apps-script-sample.gs" 
                  target="_blank" 
                  className="underline hover:text-blue-900 inline-flex items-center"
                >
                  apps-script-sample.gs
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>Set up Script Properties with your API token</li>
              <li>Deploy as Web App with appropriate permissions</li>
              <li>Copy the Web App URL and paste it above</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppsScriptConfig;
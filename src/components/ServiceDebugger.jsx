/**
 * Service Debugger Component
 * Provides interface for testing and debugging the complete guardrail system
 */

import React, { useState, useEffect } from 'react';
import { useServiceManager } from '../hooks/useServiceManager';

const ServiceDebugger = () => {
  const {
    isInitialized,
    isLoading,
    error,
    status,
    processUserRequest,
    executeDirectAction,
    getServiceStatus,
    testConnections,
    updateConfig
  } = useServiceManager();

  const [testPrompt, setTestPrompt] = useState('List all tabs in spreadsheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  const [testContext, setTestContext] = useState('{}');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('test');
  const [serviceStatus, setServiceStatus] = useState(null);
  const [connectionTests, setConnectionTests] = useState(null);

  // Update service status periodically
  useEffect(() => {
    if (isInitialized) {
      const updateStatus = () => {
        setServiceStatus(getServiceStatus());
      };
      
      updateStatus();
      const interval = setInterval(updateStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, getServiceStatus]);

  const handleTestRequest = async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      let context = {};
      try {
        context = JSON.parse(testContext);
      } catch (e) {
        console.warn('Invalid context JSON, using empty object');
      }

      const result = await processUserRequest(testPrompt, context);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message,
        steps: []
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestConnections = async () => {
    try {
      const results = await testConnections();
      setConnectionTests(results);
    } catch (err) {
      setConnectionTests({
        error: err.message
      });
    }
  };

  const renderServiceStatus = () => {
    if (!serviceStatus) return <div>Loading status...</div>;

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Overall Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Initialized:</span>
              <span className={`ml-2 ${serviceStatus.initialized ? 'text-green-600' : 'text-red-600'}`}>
                {serviceStatus.initialized ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Config Valid:</span>
              <span className={`ml-2 ${serviceStatus.config.valid ? 'text-green-600' : 'text-yellow-600'}`}>
                {serviceStatus.config.valid ? '✅ Yes' : '⚠️ Issues'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Services</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(serviceStatus.services).map(([name, status]) => (
              <div key={name} className="flex justify-between">
                <span className="capitalize">{name}:</span>
                <span className={status.configured ? 'text-green-600' : 'text-red-600'}>
                  {status.configured ? '✅ Configured' : '❌ Not Configured'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Guardrails</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(serviceStatus.guardrails).map(([name, status]) => (
              <div key={name} className="flex justify-between">
                <span className="capitalize">{name.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="text-green-600">✅ Available</span>
              </div>
            ))}
          </div>
        </div>

        {serviceStatus.config.warnings?.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-yellow-800">Configuration Warnings</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              {serviceStatus.config.warnings.map((warning, index) => (
                <li key={index}>⚠️ {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className={`font-semibold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {testResult.success ? '✅ Success' : '❌ Failed'}
          </h3>
          {testResult.error && (
            <p className="text-red-700 mt-2">{testResult.error}</p>
          )}
        </div>

        {testResult.steps && testResult.steps.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Processing Steps</h3>
            {testResult.steps.map((step, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{step.name}</h4>
                  <span className={`text-sm ${step.success ? 'text-green-600' : 'text-red-600'}`}>
                    {step.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </div>
                
                {step.error && (
                  <p className="text-red-600 text-sm mb-2">{step.error}</p>
                )}

                {step.attempts && (
                  <div className="text-sm">
                    <strong>Attempts:</strong>
                    <ul className="ml-4 mt-1">
                      {step.attempts.map((attempt, i) => (
                        <li key={i} className={attempt.success ? 'text-green-600' : 'text-red-600'}>
                          {attempt.service}: {attempt.success ? '✅' : '❌'} {attempt.error && `(${attempt.error})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {step.layers && (
                  <div className="text-sm">
                    <strong>Guardrail Layers:</strong>
                    <ul className="ml-4 mt-1">
                      {step.layers.map((layer, i) => (
                        <li key={i} className={layer.success ? 'text-green-600' : 'text-red-600'}>
                          {layer.name}: {layer.success ? '✅' : '❌'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {testResult.finalResult && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Final Result</h3>
            <pre className="text-sm bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(testResult.finalResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderConnectionTests = () => {
    if (!connectionTests) return null;

    return (
      <div className="space-y-3">
        {connectionTests.error ? (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-700">Error: {connectionTests.error}</p>
          </div>
        ) : (
          Object.entries(connectionTests).map(([service, result]) => (
            <div key={service} className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex justify-between items-center">
                <h3 className="font-semibold capitalize">{service}</h3>
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅ Connected' : '❌ Failed'}
                </span>
              </div>
              {result.error && (
                <p className="text-red-600 text-sm mt-2">{result.error}</p>
              )}
              {result.response && (
                <p className="text-gray-600 text-sm mt-2">Response: {result.response}</p>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Initializing Service Manager...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <h2 className="text-red-800 font-semibold mb-2">Service Manager Error</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Service Debugger</h1>
        <p className="text-gray-600">Test and debug the complete guardrail system</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'test', label: 'Test Request' },
            { id: 'status', label: 'Service Status' },
            { id: 'connections', label: 'Connection Tests' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4">Test User Request</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">User Prompt</label>
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows={3}
                  placeholder="Enter natural language request..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Context (JSON)</label>
                <textarea
                  value={testContext}
                  onChange={(e) => setTestContext(e.target.value)}
                  className="w-full p-3 border rounded-lg font-mono text-sm"
                  rows={3}
                  placeholder='{"spreadsheetId": "...", "tabName": "..."}'
                />
              </div>

              <button
                onClick={handleTestRequest}
                disabled={testLoading || !isInitialized}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testLoading ? 'Processing...' : 'Test Request'}
              </button>
            </div>
          </div>

          {renderTestResult()}
        </div>
      )}

      {activeTab === 'status' && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Service Status</h2>
          {renderServiceStatus()}
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Connection Tests</h2>
            <button
              onClick={handleTestConnections}
              disabled={!isInitialized}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Test Connections
            </button>
          </div>
          {renderConnectionTests()}
        </div>
      )}
    </div>
  );
};

export default ServiceDebugger;
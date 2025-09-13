/**
 * React Hook for Service Manager
 * Provides easy access to the complete guardrail system
 */

import { useState, useEffect, useRef } from 'react';
import ServiceManager from '../services/serviceManager.js';

export const useServiceManager = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  
  const serviceManagerRef = useRef(null);

  // Initialize service manager on mount
  useEffect(() => {
    const initializeServices = async () => {
      if (serviceManagerRef.current) return; // Already initialized

      setIsLoading(true);
      setError(null);

      try {
        console.log('🚀 Initializing Service Manager...');
        
        const serviceManager = new ServiceManager();
        const initResult = await serviceManager.initialize();
        
        serviceManagerRef.current = serviceManager;
        setStatus(initResult);
        setIsInitialized(initResult.success);
        
        if (!initResult.success) {
          setError(initResult.error || 'Service initialization failed');
        }

      } catch (err) {
        console.error('❌ Service Manager initialization error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeServices();
  }, []);

  /**
   * Processes user request through complete pipeline
   * @param {string} userPrompt - User's natural language request
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Processing result
   */
  const processUserRequest = async (userPrompt, context = {}) => {
    if (!serviceManagerRef.current) {
      throw new Error('Service Manager not initialized');
    }

    return await serviceManagerRef.current.processUserRequest(userPrompt, context);
  };

  /**
   * Executes a direct action (bypassing AI generation)
   * @param {Object} action - Direct action object
   * @returns {Promise<Object>} Execution result
   */
  const executeDirectAction = async (action) => {
    if (!serviceManagerRef.current) {
      throw new Error('Service Manager not initialized');
    }

    return await serviceManagerRef.current.processDirectAction(action);
  };

  /**
   * Gets current service status
   * @returns {Object} Service status
   */
  const getServiceStatus = () => {
    if (!serviceManagerRef.current) {
      return { initialized: false };
    }

    return serviceManagerRef.current.getServiceStatus();
  };

  /**
   * Tests all service connections
   * @returns {Promise<Object>} Connection test results
   */
  const testConnections = async () => {
    if (!serviceManagerRef.current) {
      throw new Error('Service Manager not initialized');
    }

    return await serviceManagerRef.current.testConnections();
  };

  /**
   * Gets configuration service
   * @returns {ConfigService} Configuration service
   */
  const getConfigService = () => {
    if (!serviceManagerRef.current) {
      return null;
    }

    return serviceManagerRef.current.getConfigService();
  };

  /**
   * Updates configuration
   * @param {Object} configUpdates - Configuration updates
   */
  const updateConfig = (configUpdates) => {
    const configService = getConfigService();
    if (configService) {
      // Update specific config sections
      if (configUpdates.appsScript) {
        if (configUpdates.appsScript.url) {
          configService.setAppsScriptUrl(configUpdates.appsScript.url);
        }
        if (configUpdates.appsScript.token) {
          configService.setAppsScriptToken(configUpdates.appsScript.token);
        }
      }

      if (configUpdates.gemini?.apiKey) {
        configService.setGeminiApiKey(configUpdates.gemini.apiKey);
      }

      if (configUpdates.openRouter?.apiKey) {
        configService.setOpenRouterApiKey(configUpdates.openRouter.apiKey);
      }

      if (configUpdates.ui) {
        configService.updateUIConfig(configUpdates.ui);
      }
    }
  };

  return {
    // State
    isInitialized,
    isLoading,
    error,
    status,
    
    // Actions
    processUserRequest,
    executeDirectAction,
    getServiceStatus,
    testConnections,
    updateConfig,
    
    // Services
    serviceManager: serviceManagerRef.current,
    configService: getConfigService()
  };
};

export default useServiceManager;
/**
 * OpenRouter Model Service
 * Handles fetching and managing available models from OpenRouter API
 */

class OpenRouterModelService {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.modelsCache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (!this.apiKey) {
      console.warn('OpenRouter API key not configured');
      return false;
    }
    
    try {
      await this.fetchModels();
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenRouter service:', error);
      return false;
    }
  }

  /**
   * Fetch available models from OpenRouter
   * @returns {Promise<Array>} List of available models
   */
  async fetchModels() {
    // Return cached models if still valid
    if (this.modelsCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.modelsCache;
    }

    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Process and sort models
      const models = data.data.map(model => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || '',
        pricing: {
          prompt: model.pricing?.prompt || 0,
          completion: model.pricing?.completion || 0
        },
        context_length: model.context_length || 0,
        architecture: model.architecture || {},
        top_provider: model.top_provider || {},
        per_request_limits: model.per_request_limits || null
      })).sort((a, b) => {
        // Sort by popularity and cost-effectiveness
        const aScore = this.calculateModelScore(a);
        const bScore = this.calculateModelScore(b);
        return bScore - aScore;
      });

      // Cache the results
      this.modelsCache = models;
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      return models;
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      throw error;
    }
  }

  /**
   * Calculate a score for model ranking (higher is better)
   * @param {Object} model - Model object
   * @returns {number} Score
   */
  calculateModelScore(model) {
    let score = 0;
    
    // Prefer models with lower cost
    const promptCost = parseFloat(model.pricing.prompt) || 0;
    const completionCost = parseFloat(model.pricing.completion) || 0;
    const avgCost = (promptCost + completionCost) / 2;
    
    if (avgCost > 0) {
      score += Math.max(0, 100 - (avgCost * 1000000)); // Lower cost = higher score
    }
    
    // Prefer models with higher context length
    if (model.context_length > 0) {
      score += Math.min(50, model.context_length / 1000); // Cap at 50 points
    }
    
    // Boost popular providers
    const popularProviders = ['anthropic', 'openai', 'meta-llama', 'mistralai', 'google'];
    if (popularProviders.some(provider => model.id.toLowerCase().includes(provider))) {
      score += 25;
    }
    
    // Boost fast models (good for normalization)
    const fastModels = ['haiku', 'turbo', '3.5', '7b', '8b'];
    if (fastModels.some(keyword => model.id.toLowerCase().includes(keyword))) {
      score += 15;
    }
    
    return score;
  }

  /**
   * Get recommended models for different use cases
   * @returns {Object} Categorized model recommendations
   */
  async getRecommendedModels() {
    const models = await this.fetchModels();
    
    return {
      // Fast and cheap models for normalization
      normalization: models.filter(model => {
        const id = model.id.toLowerCase();
        return (
          id.includes('haiku') || 
          id.includes('turbo') || 
          id.includes('3.5') ||
          id.includes('7b') ||
          id.includes('8b')
        ) && parseFloat(model.pricing.prompt || 0) < 0.000005; // Very cheap
      }).slice(0, 5),
      
      // Balanced models for general use
      general: models.filter(model => {
        const cost = parseFloat(model.pricing.prompt || 0);
        return cost > 0.000001 && cost < 0.00005 && model.context_length >= 4000;
      }).slice(0, 5),
      
      // High-quality models for complex tasks
      premium: models.filter(model => {
        const id = model.id.toLowerCase();
        return (
          id.includes('claude-3') || 
          id.includes('gpt-4') || 
          id.includes('gemini-pro')
        ) && model.context_length >= 8000;
      }).slice(0, 5),
      
      // All models sorted by score
      all: models
    };
  }

  /**
   * Get a specific model by ID
   * @param {string} modelId - Model ID
   * @returns {Object|null} Model object or null if not found
   */
  async getModel(modelId) {
    const models = await this.fetchModels();
    return models.find(model => model.id === modelId) || null;
  }

  /**
   * Test a model with a simple request
   * @param {string} modelId - Model ID to test
   * @returns {Promise<Object>} Test result
   */
  async testModel(modelId) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://smart-spreadsheet-assistant.com',
          'X-Title': 'Smart Spreadsheet Assistant'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: 'Respond with just "OK" to confirm you are working.'
            }
          ],
          max_tokens: 10,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`Test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content?.trim() || '';
      
      return {
        success: true,
        modelId: modelId,
        response: responseText,
        working: responseText.toLowerCase().includes('ok'),
        usage: data.usage || {}
      };
    } catch (error) {
      return {
        success: false,
        modelId: modelId,
        error: error.message
      };
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  async getHealth() {
    return {
      service: 'OpenRouterModelService',
      configured: !!this.apiKey,
      cacheStatus: {
        cached: !!this.modelsCache,
        expiry: this.cacheExpiry,
        modelsCount: this.modelsCache?.length || 0
      },
      lastError: null
    };
  }

  /**
   * Clear the models cache
   */
  clearCache() {
    this.modelsCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Format model for display in UI
   * @param {Object} model - Model object
   * @returns {Object} Formatted model
   */
  formatModelForDisplay(model) {
    const promptCost = parseFloat(model.pricing.prompt || 0);
    const completionCost = parseFloat(model.pricing.completion || 0);
    
    return {
      id: model.id,
      name: model.name,
      displayName: this.getDisplayName(model),
      description: model.description,
      provider: this.extractProvider(model.id),
      pricing: {
        prompt: promptCost,
        completion: completionCost,
        formatted: this.formatPricing(promptCost, completionCost)
      },
      contextLength: model.context_length,
      contextFormatted: this.formatContextLength(model.context_length),
      score: this.calculateModelScore(model),
      recommended: this.isRecommended(model)
    };
  }

  /**
   * Get display name for a model
   * @param {Object} model - Model object
   * @returns {string} Display name
   */
  getDisplayName(model) {
    if (model.name && model.name !== model.id) {
      return model.name;
    }
    
    // Clean up the ID for display
    return model.id
      .replace(/^[^\/]+\//, '') // Remove provider prefix
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  /**
   * Extract provider from model ID
   * @param {string} modelId - Model ID
   * @returns {string} Provider name
   */
  extractProvider(modelId) {
    const parts = modelId.split('/');
    return parts[0] || 'Unknown';
  }

  /**
   * Format pricing for display
   * @param {number} promptCost - Prompt cost
   * @param {number} completionCost - Completion cost
   * @returns {string} Formatted pricing
   */
  formatPricing(promptCost, completionCost) {
    if (promptCost === 0 && completionCost === 0) {
      return 'Free';
    }
    
    const avgCost = (promptCost + completionCost) / 2;
    if (avgCost < 0.000001) {
      return 'Very Cheap';
    } else if (avgCost < 0.00001) {
      return 'Cheap';
    } else if (avgCost < 0.0001) {
      return 'Moderate';
    } else {
      return 'Premium';
    }
  }

  /**
   * Format context length for display
   * @param {number} contextLength - Context length
   * @returns {string} Formatted context length
   */
  formatContextLength(contextLength) {
    if (contextLength >= 1000000) {
      return `${(contextLength / 1000000).toFixed(1)}M tokens`;
    } else if (contextLength >= 1000) {
      return `${(contextLength / 1000).toFixed(0)}K tokens`;
    } else {
      return `${contextLength} tokens`;
    }
  }

  /**
   * Check if a model is recommended
   * @param {Object} model - Model object
   * @returns {boolean} Whether the model is recommended
   */
  isRecommended(model) {
    const score = this.calculateModelScore(model);
    return score > 50; // Arbitrary threshold
  }
}

// Export singleton instance
export default new OpenRouterModelService();
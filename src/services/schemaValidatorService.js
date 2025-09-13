/**
 * Schema Validator Service
 * Third layer of guardrail - validates JSON against predefined schemas
 */
class SchemaValidatorService {
  constructor() {
    this.schemas = this.initializeSchemas();
  }

  /**
   * Initialize predefined schemas for each action
   * @returns {Object} Schema definitions
   */
  initializeSchemas() {
    return {
      listTabs: {
        type: 'object',
        required: ['action', 'spreadsheetId'],
        properties: {
          action: { type: 'string', enum: ['listTabs'] },
          spreadsheetId: { type: 'string', minLength: 1 },
          options: {
            type: 'object',
            properties: {
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      fetchTabData: {
        type: 'object',
        required: ['action', 'spreadsheetId', 'tabName'],
        properties: {
          action: { type: 'string', enum: ['fetchTabData'] },
          spreadsheetId: { type: 'string', minLength: 1 },
          tabName: { type: 'string', minLength: 1 },
          options: {
            type: 'object',
            properties: {
              sampleMaxRows: { type: 'number', minimum: 1, maximum: 1000 },
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      updateCell: {
        type: 'object',
        required: ['action', 'spreadsheetId', 'tabName', 'range', 'data'],
        properties: {
          action: { type: 'string', enum: ['updateCell'] },
          spreadsheetId: { type: 'string', minLength: 1 },
          tabName: { type: 'string', minLength: 1 },
          range: { type: 'string', pattern: '^[A-Z]+[0-9]+$' }, // e.g., A1, B2, etc.
          data: {
            type: 'object',
            required: ['value'],
            properties: {
              value: {} // Any type allowed
            }
          },
          options: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean' },
              skipSnapshot: { type: 'boolean' },
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      addRow: {
        type: 'object',
        required: ['action', 'spreadsheetId', 'tabName', 'data'],
        properties: {
          action: { type: 'string', enum: ['addRow'] },
          spreadsheetId: { type: 'string', minLength: 1 },
          tabName: { type: 'string', minLength: 1 },
          data: {
            oneOf: [
              { type: 'array', items: {} }, // Array of values
              { type: 'object' }            // Object with key-value pairs
            ]
          },
          options: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean' },
              skipSnapshot: { type: 'boolean' },
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      readRange: {
        type: 'object',
        required: ['action', 'spreadsheetId', 'tabName', 'range'],
        properties: {
          action: { type: 'string', enum: ['readRange'] },
          spreadsheetId: { type: 'string', minLength: 1 },
          tabName: { type: 'string', minLength: 1 },
          range: { type: 'string', minLength: 1 }, // e.g., A1:C10
          options: {
            type: 'object',
            properties: {
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      discoverAll: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['discoverAll'] },
          options: {
            type: 'object',
            properties: {
              maxResults: { type: 'number', minimum: 1, maximum: 100 },
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      },

      health: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['health'] },
          options: {
            type: 'object',
            properties: {
              author: { type: 'string' }
            }
          }
        },
        additionalProperties: false
      }
    };
  }

  /**
   * Validates JSON against appropriate schema
   * @param {Object} json - Parsed JSON object
   * @returns {Object} Validation result
   */
  validate(json) {
    const result = {
      valid: false,
      action: null,
      schema: null,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Determine action
      if (!json || typeof json !== 'object') {
        result.errors.push('Input must be a valid object');
        return result;
      }

      if (!json.action) {
        result.errors.push('Missing required field: action');
        return result;
      }

      result.action = json.action;

      // Get appropriate schema
      const schema = this.schemas[json.action];
      if (!schema) {
        result.errors.push(`Unknown action: ${json.action}`);
        result.suggestions.push(`Valid actions: ${Object.keys(this.schemas).join(', ')}`);
        return result;
      }

      result.schema = schema;

      // Validate against schema
      const validation = this.validateAgainstSchema(json, schema);
      result.valid = validation.valid;
      result.errors = validation.errors;
      result.warnings = validation.warnings;

      // Add contextual suggestions
      if (!result.valid) {
        result.suggestions = this.generateSuggestions(json, schema, validation.errors);
      }

      return result;

    } catch (error) {
      result.errors.push(`Schema validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validates object against JSON schema
   * @param {Object} obj - Object to validate
   * @param {Object} schema - JSON schema
   * @returns {Object} Validation result
   */
  validateAgainstSchema(obj, schema) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj)) {
          result.valid = false;
          result.errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(obj)) {
        const propSchema = schema.properties[key];
        
        if (!propSchema) {
          if (schema.additionalProperties === false) {
            result.warnings.push(`Unexpected property: ${key}`);
          }
          continue;
        }

        const propValidation = this.validateProperty(value, propSchema, key);
        if (!propValidation.valid) {
          result.valid = false;
          result.errors.push(...propValidation.errors);
        }
        result.warnings.push(...propValidation.warnings);
      }
    }

    return result;
  }

  /**
   * Validates a single property against its schema
   * @param {*} value - Property value
   * @param {Object} propSchema - Property schema
   * @param {string} propName - Property name
   * @returns {Object} Validation result
   */
  validateProperty(value, propSchema, propName) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Type validation
    if (propSchema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (propSchema.type !== actualType) {
        result.valid = false;
        result.errors.push(`Property '${propName}' should be ${propSchema.type}, got ${actualType}`);
        return result; // Early return for type mismatch
      }
    }

    // Enum validation
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      result.valid = false;
      result.errors.push(`Property '${propName}' must be one of: ${propSchema.enum.join(', ')}`);
    }

    // String validations
    if (typeof value === 'string') {
      if (propSchema.minLength && value.length < propSchema.minLength) {
        result.valid = false;
        result.errors.push(`Property '${propName}' must be at least ${propSchema.minLength} characters`);
      }

      if (propSchema.maxLength && value.length > propSchema.maxLength) {
        result.valid = false;
        result.errors.push(`Property '${propName}' must be at most ${propSchema.maxLength} characters`);
      }

      if (propSchema.pattern) {
        const regex = new RegExp(propSchema.pattern);
        if (!regex.test(value)) {
          result.valid = false;
          result.errors.push(`Property '${propName}' does not match required pattern`);
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (propSchema.minimum !== undefined && value < propSchema.minimum) {
        result.valid = false;
        result.errors.push(`Property '${propName}' must be at least ${propSchema.minimum}`);
      }

      if (propSchema.maximum !== undefined && value > propSchema.maximum) {
        result.valid = false;
        result.errors.push(`Property '${propName}' must be at most ${propSchema.maximum}`);
      }
    }

    // Object validation (recursive)
    if (propSchema.type === 'object' && propSchema.properties) {
      const objValidation = this.validateAgainstSchema(value, propSchema);
      if (!objValidation.valid) {
        result.valid = false;
        result.errors.push(...objValidation.errors.map(e => `${propName}.${e}`));
      }
      result.warnings.push(...objValidation.warnings.map(w => `${propName}.${w}`));
    }

    // Array validation
    if (propSchema.type === 'array' && propSchema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemValidation = this.validateProperty(value[i], propSchema.items, `${propName}[${i}]`);
        if (!itemValidation.valid) {
          result.valid = false;
          result.errors.push(...itemValidation.errors);
        }
        result.warnings.push(...itemValidation.warnings);
      }
    }

    // OneOf validation
    if (propSchema.oneOf) {
      let validCount = 0;
      for (const subSchema of propSchema.oneOf) {
        const subValidation = this.validateProperty(value, subSchema, propName);
        if (subValidation.valid) {
          validCount++;
        }
      }

      if (validCount === 0) {
        result.valid = false;
        result.errors.push(`Property '${propName}' does not match any of the allowed schemas`);
      } else if (validCount > 1) {
        result.warnings.push(`Property '${propName}' matches multiple schemas (ambiguous)`);
      }
    }

    return result;
  }

  /**
   * Generates helpful suggestions based on validation errors
   * @param {Object} json - Original JSON
   * @param {Object} schema - Schema that failed
   * @param {Array} errors - Validation errors
   * @returns {Array} Suggestions
   */
  generateSuggestions(json, schema, errors) {
    const suggestions = [];

    // Missing required fields
    const missingFields = errors
      .filter(e => e.startsWith('Missing required field:'))
      .map(e => e.replace('Missing required field: ', ''));

    if (missingFields.length > 0) {
      suggestions.push(`Add missing fields: ${missingFields.join(', ')}`);
      
      // Specific suggestions based on action
      if (json.action === 'updateCell' && missingFields.includes('range')) {
        suggestions.push('Range should be in format like "A1", "B2", "C10"');
      }
      
      if (missingFields.includes('spreadsheetId')) {
        suggestions.push('SpreadsheetId should be the Google Sheets ID from the URL');
      }
    }

    // Type errors
    const typeErrors = errors.filter(e => e.includes('should be'));
    if (typeErrors.length > 0) {
      suggestions.push('Check data types - strings should be quoted, numbers unquoted');
    }

    // Pattern errors
    if (errors.some(e => e.includes('pattern'))) {
      suggestions.push('Check format requirements (e.g., cell ranges like "A1")');
    }

    return suggestions;
  }

  /**
   * Gets validation summary for debugging
   * @param {Object} validationResult - Result from validate()
   * @returns {string} Human-readable summary
   */
  getValidationSummary(validationResult) {
    const { valid, action, errors, warnings, suggestions } = validationResult;

    let summary = `Schema Validation Result: ${valid ? '✅ PASSED' : '❌ FAILED'}\n`;
    summary += `Action: ${action || 'unknown'}\n`;

    if (errors.length > 0) {
      summary += `\nErrors (${errors.length}):\n${errors.map(e => `  • ${e}`).join('\n')}`;
    }

    if (warnings.length > 0) {
      summary += `\nWarnings (${warnings.length}):\n${warnings.map(w => `  • ${w}`).join('\n')}`;
    }

    if (suggestions.length > 0) {
      summary += `\nSuggestions:\n${suggestions.map(s => `  💡 ${s}`).join('\n')}`;
    }

    return summary;
  }

  /**
   * Gets schema for a specific action
   * @param {string} action - Action name
   * @returns {Object|null} Schema or null if not found
   */
  getSchema(action) {
    return this.schemas[action] || null;
  }

  /**
   * Lists all available actions
   * @returns {Array} Array of action names
   */
  getAvailableActions() {
    return Object.keys(this.schemas);
  }
}

export default SchemaValidatorService;
/**
 * Regex Check Service
 * First layer of guardrail - validates basic JSON structure and required keys
 */
class RegexCheckService {
  constructor() {
    this.requiredKeys = ['action'];
    this.optionalKeys = ['spreadsheetId', 'tabName', 'range', 'data', 'options'];
    this.validActions = [
      'listTabs', 'fetchTabData', 'updateCell', 'addRow', 
      'readRange', 'discoverAll', 'health'
    ];
  }

  /**
   * Performs basic regex validation on AI output
   * @param {string} aiOutput - Raw output from AI
   * @returns {Object} Validation result
   */
  validate(aiOutput) {
    const result = {
      valid: false,
      hasJsonStructure: false,
      hasRequiredKeys: false,
      errors: [],
      warnings: [],
      extractedJson: null
    };

    try {
      // Check 1: Basic JSON structure
      const jsonStructureCheck = this.checkJsonStructure(aiOutput);
      result.hasJsonStructure = jsonStructureCheck.valid;
      
      if (!jsonStructureCheck.valid) {
        result.errors.push(...jsonStructureCheck.errors);
        return result;
      }

      result.extractedJson = jsonStructureCheck.json;

      // Check 2: Required keys presence
      const requiredKeysCheck = this.checkRequiredKeys(result.extractedJson);
      result.hasRequiredKeys = requiredKeysCheck.valid;
      
      if (!requiredKeysCheck.valid) {
        result.errors.push(...requiredKeysCheck.errors);
      }

      // Check 3: Action validity
      const actionCheck = this.checkValidAction(result.extractedJson);
      if (!actionCheck.valid) {
        result.warnings.push(...actionCheck.warnings);
      }

      // Check 4: Context-specific validation
      const contextCheck = this.checkContextRequirements(result.extractedJson);
      if (!contextCheck.valid) {
        result.errors.push(...contextCheck.errors);
      }

      result.valid = result.hasJsonStructure && result.hasRequiredKeys && contextCheck.valid;

      return result;

    } catch (error) {
      result.errors.push(`Regex validation failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Checks if the output contains valid JSON structure
   * @param {string} output - AI output to check
   * @returns {Object} Structure check result
   */
  checkJsonStructure(output) {
    const result = {
      valid: false,
      errors: [],
      json: null
    };

    // Regex patterns for JSON detection
    const jsonPatterns = [
      /\{[^{}]*\}/g,  // Simple object
      /\{[\s\S]*\}/g  // Complex object with nested content
    ];

    let jsonFound = false;
    let parsedJson = null;

    for (const pattern of jsonPatterns) {
      const matches = output.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            parsedJson = JSON.parse(match);
            jsonFound = true;
            break;
          } catch (e) {
            // Continue trying other matches
          }
        }
        if (jsonFound) break;
      }
    }

    if (!jsonFound) {
      // Try to extract JSON-like content and fix common issues
      const cleanedOutput = this.extractPotentialJson(output);
      if (cleanedOutput) {
        try {
          parsedJson = JSON.parse(cleanedOutput);
          jsonFound = true;
        } catch (e) {
          result.errors.push('No valid JSON structure found in AI output');
        }
      } else {
        result.errors.push('No JSON-like structure detected in AI output');
      }
    }

    if (jsonFound && parsedJson) {
      result.valid = true;
      result.json = parsedJson;
    }

    return result;
  }

  /**
   * Extracts potential JSON from messy AI output
   * @param {string} output - Raw AI output
   * @returns {string|null} Cleaned JSON string or null
   */
  extractPotentialJson(output) {
    // Remove common AI response prefixes/suffixes
    let cleaned = output
      .replace(/^.*?(?=\{)/s, '') // Remove everything before first {
      .replace(/\}.*$/s, '}')     // Remove everything after last }
      .trim();

    // Fix common JSON issues
    cleaned = cleaned
      .replace(/'/g, '"')           // Single quotes to double quotes
      .replace(/(\w+):/g, '"$1":')  // Unquoted keys
      .replace(/,\s*}/g, '}')       // Trailing commas
      .replace(/,\s*]/g, ']');      // Trailing commas in arrays

    // Validate it looks like JSON
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      return cleaned;
    }

    return null;
  }

  /**
   * Checks if required keys are present
   * @param {Object} json - Parsed JSON object
   * @returns {Object} Required keys check result
   */
  checkRequiredKeys(json) {
    const result = {
      valid: true,
      errors: []
    };

    for (const key of this.requiredKeys) {
      if (!(key in json)) {
        result.valid = false;
        result.errors.push(`Missing required key: ${key}`);
      }
    }

    return result;
  }

  /**
   * Checks if action is valid
   * @param {Object} json - Parsed JSON object
   * @returns {Object} Action validation result
   */
  checkValidAction(json) {
    const result = {
      valid: true,
      warnings: []
    };

    if (json.action && !this.validActions.includes(json.action)) {
      result.valid = false;
      result.warnings.push(`Unknown action: ${json.action}. Valid actions: ${this.validActions.join(', ')}`);
    }

    return result;
  }

  /**
   * Checks context-specific requirements based on action
   * @param {Object} json - Parsed JSON object
   * @returns {Object} Context validation result
   */
  checkContextRequirements(json) {
    const result = {
      valid: true,
      errors: []
    };

    const { action } = json;

    switch (action) {
      case 'listTabs':
      case 'fetchTabData':
      case 'updateCell':
      case 'addRow':
      case 'readRange':
        if (!json.spreadsheetId) {
          result.valid = false;
          result.errors.push(`Action '${action}' requires spreadsheetId`);
        }
        break;

      case 'fetchTabData':
      case 'updateCell':
      case 'addRow':
      case 'readRange':
        if (!json.tabName) {
          result.valid = false;
          result.errors.push(`Action '${action}' requires tabName`);
        }
        break;

      case 'updateCell':
        if (!json.range) {
          result.valid = false;
          result.errors.push(`Action 'updateCell' requires range`);
        }
        if (!json.data || !json.data.value) {
          result.valid = false;
          result.errors.push(`Action 'updateCell' requires data.value`);
        }
        break;

      case 'addRow':
        if (!json.data) {
          result.valid = false;
          result.errors.push(`Action 'addRow' requires data`);
        }
        break;

      case 'readRange':
        if (!json.range) {
          result.valid = false;
          result.errors.push(`Action 'readRange' requires range`);
        }
        break;

      case 'discoverAll':
      case 'health':
        // No additional requirements
        break;
    }

    return result;
  }

  /**
   * Gets validation summary for debugging
   * @param {Object} validationResult - Result from validate()
   * @returns {string} Human-readable summary
   */
  getValidationSummary(validationResult) {
    const { valid, hasJsonStructure, hasRequiredKeys, errors, warnings } = validationResult;

    let summary = `Regex Check Result: ${valid ? '✅ PASSED' : '❌ FAILED'}\n`;
    summary += `- JSON Structure: ${hasJsonStructure ? '✅' : '❌'}\n`;
    summary += `- Required Keys: ${hasRequiredKeys ? '✅' : '❌'}\n`;

    if (errors.length > 0) {
      summary += `\nErrors:\n${errors.map(e => `  • ${e}`).join('\n')}`;
    }

    if (warnings.length > 0) {
      summary += `\nWarnings:\n${warnings.map(w => `  • ${w}`).join('\n')}`;
    }

    return summary;
  }
}

export default RegexCheckService;
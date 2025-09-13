/**
 * Normalizer Service
 * Second layer of guardrail - fixes common format issues in AI output
 */
class NormalizerService {
  constructor() {
    this.commonFixes = [
      'fixQuotes',
      'fixTrailingCommas',
      'fixUnquotedKeys',
      'fixCommonTypos',
      'fixSpacing',
      'fixBooleans',
      'fixNumbers'
    ];
  }

  /**
   * Normalizes AI output to valid JSON
   * @param {string} aiOutput - Raw AI output
   * @returns {Object} Normalization result
   */
  normalize(aiOutput) {
    const result = {
      success: false,
      originalOutput: aiOutput,
      normalizedOutput: null,
      appliedFixes: [],
      errors: [],
      json: null
    };

    try {
      let normalized = aiOutput.trim();

      // Apply each fix in sequence
      for (const fixName of this.commonFixes) {
        const fixMethod = this[fixName];
        if (typeof fixMethod === 'function') {
          const fixResult = fixMethod.call(this, normalized);
          if (fixResult.applied) {
            normalized = fixResult.output;
            result.appliedFixes.push({
              fix: fixName,
              description: fixResult.description,
              before: fixResult.before,
              after: fixResult.after
            });
          }
        }
      }

      result.normalizedOutput = normalized;

      // Try to parse the normalized output
      try {
        result.json = JSON.parse(normalized);
        result.success = true;
      } catch (parseError) {
        result.errors.push(`Failed to parse normalized JSON: ${parseError.message}`);
        
        // Try one more aggressive fix
        const aggressiveResult = this.aggressiveFix(normalized);
        if (aggressiveResult.success) {
          result.normalizedOutput = aggressiveResult.output;
          result.json = aggressiveResult.json;
          result.success = true;
          result.appliedFixes.push({
            fix: 'aggressiveFix',
            description: 'Applied aggressive JSON reconstruction',
            before: normalized,
            after: aggressiveResult.output
          });
        }
      }

      return result;

    } catch (error) {
      result.errors.push(`Normalization failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Fixes quote issues (single to double quotes)
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixQuotes(input) {
    const before = input;
    
    // Replace single quotes with double quotes, but be careful with apostrophes
    let output = input.replace(/'([^']*)':/g, '"$1":'); // Keys
    output = output.replace(/:\s*'([^']*)'/g, ': "$1"'); // String values
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Fixed single quotes to double quotes',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Removes trailing commas
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixTrailingCommas(input) {
    const before = input;
    
    let output = input.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Removed trailing commas',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Adds quotes to unquoted keys
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixUnquotedKeys(input) {
    const before = input;
    
    // Add quotes to unquoted keys
    let output = input.replace(/(\w+)(\s*:)/g, '"$1"$2');
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Added quotes to unquoted keys',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Fixes common typos in JSON
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixCommonTypos(input) {
    const before = input;
    let output = input;
    
    const typoFixes = {
      'True': 'true',
      'False': 'false',
      'None': 'null',
      'NULL': 'null',
      'undefined': 'null'
    };

    for (const [typo, fix] of Object.entries(typoFixes)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'g');
      output = output.replace(regex, fix);
    }
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Fixed common typos (True/False/None/undefined)',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Fixes spacing issues
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixSpacing(input) {
    const before = input;
    
    let output = input
      .replace(/\s*{\s*/g, '{ ')     // Space after opening brace
      .replace(/\s*}\s*/g, ' }')     // Space before closing brace
      .replace(/\s*:\s*/g, ': ')     // Space after colon
      .replace(/\s*,\s*/g, ', ')     // Space after comma
      .replace(/\s+/g, ' ')          // Multiple spaces to single
      .trim();
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Fixed spacing issues',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Fixes boolean values
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixBooleans(input) {
    const before = input;
    
    let output = input
      .replace(/:\s*"true"/g, ': true')
      .replace(/:\s*"false"/g, ': false')
      .replace(/:\s*"null"/g, ': null');
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Fixed quoted boolean/null values',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Fixes number values
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  fixNumbers(input) {
    const before = input;
    
    // Fix quoted numbers
    let output = input.replace(/:\s*"(\d+(?:\.\d+)?)"/g, ': $1');
    
    const applied = before !== output;
    
    return {
      applied,
      output,
      description: 'Fixed quoted numeric values',
      before: applied ? before : null,
      after: applied ? output : null
    };
  }

  /**
   * Aggressive fix - tries to reconstruct JSON from broken structure
   * @param {string} input - Input string
   * @returns {Object} Fix result
   */
  aggressiveFix(input) {
    try {
      // Extract key-value pairs using regex
      const keyValuePattern = /["']?(\w+)["']?\s*:\s*([^,}]+)/g;
      const matches = [];
      let match;

      while ((match = keyValuePattern.exec(input)) !== null) {
        const key = match[1];
        let value = match[2].trim();

        // Clean up value
        value = value.replace(/["']$/, '').replace(/^["']/, '');
        
        // Determine value type
        if (value === 'true' || value === 'false') {
          matches.push(`"${key}": ${value}`);
        } else if (value === 'null' || value === 'undefined') {
          matches.push(`"${key}": null`);
        } else if (/^\d+(\.\d+)?$/.test(value)) {
          matches.push(`"${key}": ${value}`);
        } else {
          matches.push(`"${key}": "${value}"`);
        }
      }

      if (matches.length > 0) {
        const reconstructed = `{ ${matches.join(', ')} }`;
        const json = JSON.parse(reconstructed);
        
        return {
          success: true,
          output: reconstructed,
          json: json
        };
      }

      return { success: false };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Validates that normalized output is proper JSON
   * @param {string} normalizedOutput - Normalized string
   * @returns {Object} Validation result
   */
  validateNormalized(normalizedOutput) {
    try {
      const json = JSON.parse(normalizedOutput);
      return {
        valid: true,
        json: json,
        error: null
      };
    } catch (error) {
      return {
        valid: false,
        json: null,
        error: error.message
      };
    }
  }

  /**
   * Gets normalization summary for debugging
   * @param {Object} normalizationResult - Result from normalize()
   * @returns {string} Human-readable summary
   */
  getNormalizationSummary(normalizationResult) {
    const { success, appliedFixes, errors } = normalizationResult;

    let summary = `Normalization Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    
    if (appliedFixes.length > 0) {
      summary += `\nApplied Fixes (${appliedFixes.length}):\n`;
      appliedFixes.forEach((fix, index) => {
        summary += `  ${index + 1}. ${fix.fix}: ${fix.description}\n`;
      });
    } else {
      summary += '\nNo fixes needed - output was already valid\n';
    }

    if (errors.length > 0) {
      summary += `\nErrors:\n${errors.map(e => `  • ${e}`).join('\n')}`;
    }

    return summary;
  }
}

export default NormalizerService;
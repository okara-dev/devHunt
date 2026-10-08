export class JsonFormatter {
  constructor(options = {}) {
    this.spaces = options.spaces || 2;
    this.sortKeys = options.sortKeys || false;
    this.removeTrailingCommas = options.removeTrailingCommas !== false;
  }

  /**
   * Format JSON with proper indentation
   */
  format(jsonString) {
    try {
      // Parse the JSON
      const parsed = JSON.parse(jsonString);
      
      // Stringify with proper formatting
      const formatted = JSON.stringify(parsed, null, this.spaces);
      
      return {
        success: true,
        formatted: formatted,
        parsed: parsed,
        originalLength: jsonString.length,
        formattedLength: formatted.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        position: error.message.match(/position (\d+)/)?.[1] || null
      };
    }
  }

  /**
   * Minify JSON (remove whitespace)
   */
  minify(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const minified = JSON.stringify(parsed);
      return {
        success: true,
        minified: minified,
        originalLength: jsonString.length,
        minifiedLength: minified.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate JSON syntax
   */
  validate(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const type = Array.isArray(parsed) ? 'array' : typeof parsed;
      
      // Count keys and depth
      const stats = this.getStats(parsed);
      
      return {
        valid: true,
        type: type,
        keys: stats.rootKeys || 0,
        depth: stats.maxDepth || 0,
        size: jsonString.length,
        parsed: parsed
      };
    } catch (error) {
      // Try to find line and column
      let line = 1;
      let column = 1;
      const posMatch = error.message.match(/position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const lines = jsonString.substring(0, pos).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
      
      return {
        valid: false,
        error: error.message,
        line: line,
        column: column,
        position: posMatch ? parseInt(posMatch[1]) : null
      };
    }
  }

  /**
   * Get statistics about the JSON
   */
  getStats(data) {
    const stats = {
      type: Array.isArray(data) ? 'array' : typeof data,
      size: 0,
      lines: 0,
      strings: 0,
      numbers: 0,
      booleans: 0,
      nulls: 0,
      arrays: 0,
      objects: 0,
      rootKeys: 0,
      totalKeys: 0,
      maxDepth: 0
    };

    function analyze(value, depth = 0) {
      if (depth > stats.maxDepth) {
        stats.maxDepth = depth;
      }

      if (value === null) {
        stats.nulls++;
      } else if (Array.isArray(value)) {
        stats.arrays++;
        stats.totalKeys += value.length;
        value.forEach(item => analyze(item, depth + 1));
      } else if (typeof value === 'object') {
        stats.objects++;
        if (depth === 1) {
          stats.rootKeys = Object.keys(value).length;
        }
        stats.totalKeys += Object.keys(value).length;
        Object.values(value).forEach(val => analyze(val, depth + 1));
      } else if (typeof value === 'string') {
        stats.strings++;
      } else if (typeof value === 'number') {
        stats.numbers++;
      } else if (typeof value === 'boolean') {
        stats.booleans++;
      }
    }

    try {
      // Convert to string to count lines
      const jsonString = JSON.stringify(data, null, 2);
      stats.size = jsonString.length;
      stats.lines = jsonString.split('\n').length;
      
      analyze(data, 1);
    } catch (error) {
      // Fallback
      stats.size = JSON.stringify(data).length;
      stats.lines = 1;
    }

    stats.values = stats.strings + stats.numbers + stats.booleans + stats.nulls;

    return stats;
  }

  /**
   * Convert JSON to a tree view
   */
  toTree(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      return this.buildTree(data);
    } catch (error) {
      throw new Error(`Failed to build tree: ${error.message}`);
    }
  }

  buildTree(data, prefix = '', isLast = true, path = 'root') {
    let result = '';
    
    if (Array.isArray(data)) {
      result += `${prefix}${isLast ? '└── ' : '├── '}📦 Array (${data.length} items)\n`;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      data.forEach((item, index) => {
        const isLastItem = index === data.length - 1;
        result += this.buildTree(item, newPrefix, isLastItem, `${path}[${index}]`);
      });
    } else if (data !== null && typeof data === 'object') {
      const keys = Object.keys(data);
      result += `${prefix}${isLast ? '└── ' : '├── '}📁 Object (${keys.length} keys)\n`;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      keys.forEach((key, index) => {
        const isLastItem = index === keys.length - 1;
        const value = data[key];
        const valueType = Array.isArray(value) ? `📦 Array (${value.length})` :
                         value === null ? 'null' :
                         typeof value === 'object' ? '📁 Object' :
                         typeof value === 'string' ? `"${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"` :
                         typeof value === 'number' ? String(value) :
                         typeof value === 'boolean' ? String(value) :
                         'unknown';
        
        const icon = typeof value === 'object' && value !== null ? 
                    (Array.isArray(value) ? '📦' : '📁') :
                    '📄';
        
        result += `${newPrefix}${isLastItem ? '└── ' : '├── '}${icon} ${key}: ${valueType}\n`;
        
        if (typeof value === 'object' && value !== null) {
          const subPrefix = newPrefix + (isLastItem ? '    ' : '│   ');
          result += this.buildTree(value, subPrefix, true, `${path}.${key}`);
        }
      });
    } else {
      // Primitive value
      const valueStr = typeof data === 'string' ? `"${data.substring(0, 30)}${data.length > 30 ? '...' : ''}"` : String(data);
      result += `${prefix}${isLast ? '└── ' : '├── '}📄 ${valueStr}\n`;
    }
    
    return result;
  }

  /**
   * Sort keys in JSON object
   */
  sortKeys(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.sortKeys(item));
    } else if (data !== null && typeof data === 'object') {
      const sorted = {};
      const keys = Object.keys(data).sort();
      for (const key of keys) {
        sorted[key] = this.sortKeys(data[key]);
      }
      return sorted;
    }
    return data;
  }

  /**
   * Remove trailing commas from JSON string
   */
  removeTrailingCommas(jsonString) {
    return jsonString.replace(/,\s*([}\]])/g, '$1');
  }

  /**
   * Find and fix common JSON errors
   */
  fixCommonErrors(jsonString) {
    let fixed = jsonString;
    
    // Fix single quotes
    // This is a simple fix, but might not work for all cases
    // fixed = fixed.replace(/'/g, '"');
    
    // Fix missing commas between objects
    fixed = fixed.replace(/\}\s*\{/g, '},{');
    
    // Fix trailing commas
    fixed = this.removeTrailingCommas(fixed);
    
    // Fix missing quotes around keys
    fixed = fixed.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":');
    
    return fixed;
  }

  /**
   * Try to fix and format JSON
   */
  fixAndFormat(jsonString) {
    try {
      // Try direct parse first
      return this.format(jsonString);
    } catch (error) {
      // Try to fix common errors
      const fixed = this.fixCommonErrors(jsonString);
      try {
        return this.format(fixed);
      } catch (error2) {
        return {
          success: false,
          error: `Could not fix JSON: ${error2.message}`,
          original: jsonString,
          fixed: fixed
        };
      }
    }
  }

  /**
   * Convert JSON to YAML-like format
   */
  toYamlLike(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return this.convertToYaml(data, 0);
    } catch (error) {
      throw new Error(`Failed to convert to YAML: ${error.message}`);
    }
  }

  convertToYaml(data, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        result += spaces + '- ' + this.convertToYaml(item, indent + 1).trim() + '\n';
      });
    } else if (data !== null && typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          result += spaces + key + ':\n';
          result += this.convertToYaml(value, indent + 1);
        } else {
          const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
          result += spaces + key + ': ' + valueStr + '\n';
        }
      });
    } else {
      result += String(data);
    }
    
    return result;
  }
}

export default JsonFormatter;
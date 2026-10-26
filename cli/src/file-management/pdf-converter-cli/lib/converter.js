import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export class PDFConverter {
  constructor(options = {}) {
    this.defaultPageSize = options.pageSize || 'A4';
    this.defaultOrientation = options.orientation || 'portrait';
    this.defaultFont = options.font || 'Helvetica';
    this.defaultFontSize = options.fontSize || 12;
  }

  /**
   * Convert a file to PDF
   */
  async convert(filePath, options = {}, onProgress = null) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const type = options.type || this.getFileType(ext);
      
      // Read the file
      const content = await readFile(filePath, 'utf8');
      
      // Determine output path
      const outputPath = options.output || path.join(
        path.dirname(filePath),
        path.basename(filePath, ext) + '.pdf'
      );

      // Create PDF based on type
      let result;
      switch (type) {
        case 'text':
          result = await this.createFromText(content, { ...options, output: outputPath });
          break;
        case 'markdown':
          result = await this.createFromMarkdown(content, { ...options, output: outputPath });
          break;
        case 'html':
          result = await this.createFromHTML(content, { ...options, output: outputPath });
          break;
        case 'json':
          result = await this.createFromJSON(content, { ...options, output: outputPath });
          break;
        case 'csv':
          result = await this.createFromCSV(content, { ...options, output: outputPath });
          break;
        case 'image':
          result = await this.createFromImage(filePath, { ...options, output: outputPath });
          break;
        default:
          // Try to auto-detect
          result = await this.createFromText(content, { ...options, output: outputPath });
      }

      if (result.success) {
        const stats = fs.statSync(result.outputPath);
        return {
          success: true,
          outputPath: result.outputPath,
          fileSize: stats.size,
          pages: result.pages || 1,
          type: type,
          stats: this.getTextStats(content)
        };
      } else {
        return result;
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: this.getSuggestion(error)
      };
    }
  }

  /**
   * Create PDF from text
   */
  async createFromText(text, options = {}) {
    try {
      const outputPath = options.output || 'document.pdf';
      const doc = new PDFDocument({
        size: options.pageSize || this.defaultPageSize,
        layout: options.landscape ? 'landscape' : 'portrait',
        margin: options.margin || 50
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add metadata
      if (options.title) doc.info.Title = options.title;
      if (options.author) doc.info.Author = options.author;

      // Add title if provided
      if (options.title) {
        doc.fontSize(24).text(options.title, { align: 'center' });
        doc.moveDown(2);
      }

      // Add content
      const lines = text.split('\n');
      let pageCount = 0;
      
      for (const line of lines) {
        if (line.trim() === '') {
          doc.moveDown();
          continue;
        }
        doc.fontSize(this.defaultFontSize).text(line);
        pageCount++;
      }

      doc.end();

      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });

      return {
        success: true,
        outputPath: outputPath,
        pages: pageCount
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create PDF from Markdown
   */
  async createFromMarkdown(markdown, options = {}) {
    try {
      // Simple markdown to text conversion (can be enhanced with a proper parser)
      let text = markdown;
      
      // Remove markdown syntax
      text = text.replace(/#{1,6}\s/g, ''); // Headers
      text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
      text = text.replace(/\*([^*]+)\*/g, '$1'); // Italic
      text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
      text = text.replace(/!\[([^\]]+)\]\([^)]+\)/g, '$1'); // Images
      text = text.replace(/`([^`]+)`/g, '$1'); // Inline code
      text = text.replace(/```[\s\S]*?```/g, ''); // Code blocks
      text = text.replace(/^>\s/gm, ''); // Blockquotes
      text = text.replace(/^-{3,}/gm, ''); // Horizontal rules
      text = text.replace(/\|/g, ' '); // Tables
      
      return await this.createFromText(text, options);

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create PDF from HTML
   */
  async createFromHTML(html, options = {}) {
    try {
      // Simple HTML to text conversion
      let text = html;
      
      // Remove HTML tags
      text = text.replace(/<[^>]*>/g, '');
      
      // Replace HTML entities
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
      
      // Decode multiple spaces
      text = text.replace(/\s{2,}/g, ' ');
      
      return await this.createFromText(text, options);

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create PDF from JSON
   */
  async createFromJSON(jsonString, options = {}) {
    try {
      const data = JSON.parse(jsonString);
      let text = '';
      
      // Format JSON nicely
      if (Array.isArray(data)) {
        text = 'JSON Array:\n\n';
        data.forEach((item, index) => {
          text += `Item ${index + 1}:\n`;
          text += this.formatJSONValue(item, 2);
          text += '\n';
        });
      } else {
        text = 'JSON Object:\n\n';
        text += this.formatJSONValue(data, 2);
      }
      
      return await this.createFromText(text, options);

    } catch (error) {
      return {
        success: false,
        error: `Invalid JSON: ${error.message}`
      };
    }
  }

  /**
   * Create PDF from CSV
   */
  async createFromCSV(csvString, options = {}) {
    try {
      const lines = csvString.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return {
          success: false,
          error: 'Empty CSV data'
        };
      }

      const headers = lines[0].split(',').map(h => h.trim());
      let text = 'CSV Data:\n\n';
      
      // Add headers
      text += headers.join(' | ') + '\n';
      text += '-'.repeat(headers.join(' | ').length) + '\n';
      
      // Add rows
      for (let i = 1; i < Math.min(lines.length, 50); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        text += values.join(' | ') + '\n';
      }
      
      if (lines.length > 50) {
        text += `\n... and ${lines.length - 50} more rows`;
      }

      return await this.createFromText(text, options);

    } catch (error) {
      return {
        success: false,
        error: `Invalid CSV: ${error.message}`
      };
    }
  }

  /**
   * Create PDF from image
   */
  async createFromImage(imagePath, options = {}) {
    try {
      const outputPath = options.output || path.join(
        path.dirname(imagePath),
        path.basename(imagePath, path.extname(imagePath)) + '.pdf'
      );

      const doc = new PDFDocument({
        size: options.pageSize || this.defaultPageSize,
        layout: options.landscape ? 'landscape' : 'portrait',
        margin: 0
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add image
      doc.image(imagePath, 0, 0, {
        fit: [doc.page.width, doc.page.height],
        align: 'center',
        valign: 'center'
      });

      doc.end();

      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });

      const stats = fs.statSync(outputPath);
      return {
        success: true,
        outputPath: outputPath,
        fileSize: stats.size,
        pages: 1
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to convert image: ${error.message}`
      };
    }
  }

  /**
   * Create a blank PDF
   */
  async createBlankPDF(title, options = {}) {
    try {
      const outputPath = options.output || `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      
      const doc = new PDFDocument({
        size: options.pageSize || this.defaultPageSize,
        layout: options.landscape ? 'landscape' : 'portrait'
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Set metadata
      doc.info.Title = title;
      if (options.author) doc.info.Author = options.author;

      // Add title
      doc.fontSize(28).text(title, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(14).text(`Created: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(4);
      
      // Add placeholder
      doc.fontSize(12).text('Your content here...', { align: 'center' });

      doc.end();

      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });

      const stats = fs.statSync(outputPath);
      return {
        success: true,
        outputPath: outputPath,
        fileSize: stats.size,
        pages: 1
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add content to an existing PDF
   */
  async addContent(pdfPath, content) {
    try {
      // For simplicity, create a new PDF with the content
      // In a real implementation, you'd use a library like pdf-lib to modify existing PDFs
      const outputPath = path.join(
        path.dirname(pdfPath),
        'modified_' + path.basename(pdfPath)
      );

      const doc = new PDFDocument();
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Read existing PDF metadata (simplified)
      doc.fontSize(14).text('Updated Content:');
      doc.moveDown();
      
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          doc.fontSize(12).text(line);
        } else {
          doc.moveDown();
        }
      }

      doc.end();

      await new Promise((resolve) => {
        writeStream.on('finish', resolve);
      });

      // Replace original with modified
      fs.unlinkSync(pdfPath);
      fs.renameSync(outputPath, pdfPath);

      return {
        success: true,
        outputPath: pdfPath
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Merge multiple PDFs
   */
  async mergePDFs(pdfFiles, outputPath) {
    try {
      // Since PDFKit doesn't support merging directly, we'll use a simple approach
      // For production, consider using a library like pdf-lib
      
      const firstPDF = await readFile(pdfFiles[0]);
      let merged = firstPDF;
      
      for (let i = 1; i < pdfFiles.length; i++) {
        const nextPDF = await readFile(pdfFiles[i]);
        // Simple concatenation (may not work for complex PDFs)
        // In practice, use a proper PDF merging library
        merged = Buffer.concat([merged, nextPDF]);
      }

      await writeFile(outputPath, merged);

      const stats = fs.statSync(outputPath);
      return {
        success: true,
        outputPath: outputPath,
        fileSize: stats.size,
        pages: pdfFiles.length // Approximate
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to merge PDFs: ${error.message}`
      };
    }
  }

  /**
   * Get PDF information
   */
  async getPDFInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const content = await readFile(filePath, 'utf8');
      
      // Extract basic metadata (simplified)
      const info = {
        fileSize: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        pages: this.estimatePages(content),
        metadata: {
          Title: 'Unknown',
          Author: 'Unknown',
          Creator: 'Unknown'
        }
      };

      // Try to extract metadata from the PDF
      const titleMatch = content.match(/\/Title\s*\(([^)]*)\)/);
      if (titleMatch) info.metadata.Title = titleMatch[1];
      
      const authorMatch = content.match(/\/Author\s*\(([^)]*)\)/);
      if (authorMatch) info.metadata.Author = authorMatch[1];
      
      const creatorMatch = content.match(/\/Creator\s*\(([^)]*)\)/);
      if (creatorMatch) info.metadata.Creator = creatorMatch[1];

      const versionMatch = content.match(/\/PDFVersion\s*([0-9.]+)/);
      if (versionMatch) info.version = versionMatch[1];

      return info;

    } catch (error) {
      throw new Error(`Failed to get PDF info: ${error.message}`);
    }
  }

  /**
   * Get text statistics
   */
  getTextStats(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const words = text.split(/\s+/).filter(w => w.trim()).length;
    const characters = text.replace(/\s/g, '').length;
    
    return {
      lines: lines.length,
      words: words,
      characters: characters
    };
  }

  /**
   * Get file type based on extension
   */
  getFileType(ext) {
    const types = {
      '.txt': 'text',
      '.log': 'text',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.html': 'html',
      '.htm': 'html',
      '.json': 'json',
      '.csv': 'csv',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.bmp': 'image',
      '.svg': 'image'
    };
    return types[ext] || 'text';
  }

  /**
   * Format JSON value for display
   */
  formatJSONValue(value, indent = 0) {
    const spaces = '  '.repeat(indent);
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      let result = '[\n';
      value.forEach((item, index) => {
        result += spaces + '  ' + this.formatJSONValue(item, indent + 1);
        if (index < value.length - 1) result += ',';
        result += '\n';
      });
      result += spaces + ']';
      return result;
    } else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      let result = '{\n';
      keys.forEach((key, index) => {
        result += spaces + '  ' + key + ': ' + this.formatJSONValue(value[key], indent + 1);
        if (index < keys.length - 1) result += ',';
        result += '\n';
      });
      result += spaces + '}';
      return result;
    } else if (typeof value === 'string') {
      return `"${value}"`;
    } else if (typeof value === 'number') {
      return String(value);
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (value === null) {
      return 'null';
    }
    return String(value);
  }

  /**
   * Estimate pages based on content length
   */
  estimatePages(content) {
    const lines = content.split('\n').length;
    // Rough estimate: ~50 lines per page
    return Math.max(1, Math.ceil(lines / 50));
  }

  /**
   * Get suggestion for fixing errors
   */
  getSuggestion(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('enoent') || message.includes('not found')) {
      return 'Check if the file path is correct and the file exists.';
    }
    if (message.includes('permission')) {
      return 'Check if you have permission to read the file or write to the output directory.';
    }
    if (message.includes('json')) {
      return 'Make sure the JSON is valid. Use a JSON validator to check the syntax.';
    }
    if (message.includes('csv')) {
      return 'Check if the CSV is properly formatted with consistent delimiters.';
    }
    if (message.includes('image')) {
      return 'Make sure the image format is supported (JPG, PNG, GIF, BMP, SVG).';
    }
    return 'Try converting the file manually first or check if the file format is supported.';
  }

  /**
   * Get supported formats
   */
  async getSupportedFormats() {
    return [
      'Text (.txt, .log)',
      'Markdown (.md, .markdown)',
      'HTML (.html, .htm)',
      'JSON (.json)',
      'CSV (.csv)',
      'Images (.jpg, .jpeg, .png, .gif, .bmp, .svg)',
      'PDF (.pdf) - for merging'
    ];
  }
}

export default PDFConverter;
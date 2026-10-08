import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

export class Organizer {
  constructor(basePath) {
    this.basePath = path.resolve(basePath);
    this.categories = this.constructor.getCategories();
    this.fileTypes = this.constructor.getFileTypes();
    this.categoryIcons = this.constructor.getCategoryIcons();
    this.specialFiles = this.constructor.getSpecialFiles();
  }

  static getCategories() {
    return [
      'Images',
      'Documents',
      'Spreadsheets',
      'Presentations',
      'Archives',
      'Audio',
      'Video',
      'Code',
      'Databases',
      'Fonts',
      'Config',
      'Executables',
      'Design',
      'Backups',
      'Scripts',
      'Other'
    ];
  }

  static getFileTypes() {
    return {
      'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', '.tiff', '.psd', '.ai', '.eps'],
      'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md', '.tex', '.wpd', '.pages'],
      'Spreadsheets': ['.xls', '.xlsx', '.csv', '.ods', '.numbers', '.tsv'],
      'Presentations': ['.ppt', '.pptx', '.odp', '.key', '.pps'],
      'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.tgz', '.z', '.lz'],
      'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus'],
      'Video': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.3gp'],
      'Code': ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.rb', '.go', '.rs', '.php', '.html', '.css', '.scss', '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.toml', '.sh', '.bash', '.zsh', '.ps1', '.pl', '.lua', '.r', '.swift', '.kt', '.dart'],
      'Databases': ['.sql', '.sqlite', '.db', '.mdb', '.accdb', '.sqlite3'],
      'Fonts': ['.ttf', '.otf', '.woff', '.woff2', '.eot', '.fnt'],
      'Config': ['.conf', '.config', '.ini', '.cfg', '.properties', '.env', '.htaccess'],
      'Executables': ['.exe', '.msi', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.sh', '.bin'],
      'Design': ['.sketch', '.fig', '.xd', '.indd', '.psd', '.ai', '.eps'],
      'Backups': ['.bak', '.backup', '.old', '.tmp', '.temp', '.swp', '.swo'],
      'Scripts': ['.sh', '.bash', '.zsh', '.ps1', '.pl', '.rb', '.py', '.js', '.ts'],
      'Other': []
    };
  }

  static getCategoryIcons() {
    return {
      'Images': '🖼️',
      'Documents': '📄',
      'Spreadsheets': '📊',
      'Presentations': '📽️',
      'Archives': '📦',
      'Audio': '🎵',
      'Video': '🎬',
      'Code': '💻',
      'Databases': '🗄️',
      'Fonts': '🔤',
      'Config': '⚙️',
      'Executables': '⚡',
      'Design': '🎨',
      'Backups': '💾',
      'Scripts': '📜',
      'Other': '📁'
    };
  }

  static getSpecialFiles() {
    return {
      'README.md': 'Documents',
      'LICENSE': 'Documents',
      'CONTRIBUTING.md': 'Documents',
      'CHANGELOG.md': 'Documents',
      'package.json': 'Config',
      'package-lock.json': 'Config',
      'yarn.lock': 'Config',
      'Cargo.toml': 'Config',
      'Cargo.lock': 'Config',
      'Gemfile': 'Config',
      'Gemfile.lock': 'Config',
      'Pipfile': 'Config',
      'Pipfile.lock': 'Config',
      'requirements.txt': 'Config',
      'setup.py': 'Config',
      'Makefile': 'Config',
      'CMakeLists.txt': 'Config',
      'Dockerfile': 'Config',
      'docker-compose.yml': 'Config',
      'docker-compose.yaml': 'Config',
      '.gitignore': 'Config',
      '.env': 'Config',
      '.env.example': 'Config',
      '.eslintrc.js': 'Config',
      '.prettierrc': 'Config'
    };
  }

  getCategoryIcon(category) {
    return this.categoryIcons[category] || '📁';
  }

  getFileCategory(file) {
    const filename = path.basename(file.path);
    
    // Check special files first
    if (this.specialFiles[filename]) {
      return this.specialFiles[filename];
    }

    // Check by extension
    const ext = path.extname(filename).toLowerCase();
    for (const [category, extensions] of Object.entries(this.fileTypes)) {
      if (extensions.includes(ext)) {
        return category;
      }
    }

    // Check by filename pattern
    if (filename.startsWith('.') && !filename.endsWith('.swp')) {
      return 'Config';
    }

    if (filename.includes('backup') || filename.includes('bak')) {
      return 'Backups';
    }

    return 'Other';
  }

  async scan() {
    const files = await this.getFiles();
    const categories = new Set();
    const fileTypes = new Set();
    const categoryCounts = {};
    let totalSize = 0;

    for (const file of files) {
      const category = this.getFileCategory(file);
      categories.add(category);
      
      const ext = path.extname(file.path).toLowerCase() || 'no-extension';
      fileTypes.add(ext);
      
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      totalSize += file.size;
    }

    // Count folders
    const folders = this.getFolders();

    return {
      totalFiles: files.length,
      totalFolders: folders.length,
      fileTypes: Array.from(fileTypes).sort(),
      categories: Array.from(categories).sort(),
      categoryCounts: categoryCounts,
      totalSize: totalSize,
      totalSizeFormatted: this.formatSize(totalSize)
    };
  }

  async getFiles(dirPath = this.basePath, relativePath = '') {
    const files = [];
    const items = await readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await stat(fullPath);

      // Skip system directories and already organized folders
      if (stats.isDirectory()) {
        if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__' || item === '.git') {
          continue;
        }
        // Skip if it's an organization folder
        if (this.categories.includes(item)) {
          continue;
        }
        files.push(...await this.getFiles(fullPath, path.join(relativePath, item)));
      } else {
        // Skip files in organization folders
        const parentDir = path.basename(dirPath);
        if (this.categories.includes(parentDir)) {
          continue;
        }
        files.push({
          path: fullPath,
          relativePath: path.join(relativePath, item),
          name: item,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime
        });
      }
    }

    return files;
  }

  getFolders(dirPath = this.basePath) {
    const folders = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules' && item !== '__pycache__' && item !== '.git') {
            folders.push({
              path: fullPath,
              name: item
            });
            folders.push(...this.getFolders(fullPath));
          }
        }
      } catch (error) {
        // Skip inaccessible folders
      }
    }

    return folders;
  }

  async organize(onProgress = null) {
    const files = await this.getFiles();
    const moved = [];
    let alreadyOrganized = 0;
    let errors = 0;
    let foldersCreated = new Set();

    const total = files.length;
    let current = 0;

    for (const file of files) {
      current++;
      
      if (onProgress) {
        onProgress({
          current: current,
          total: total,
          message: `Processing ${path.basename(file.path)}...`
        });
      }

      try {
        const category = this.getFileCategory(file);
        const targetDir = path.join(this.basePath, category);
        const targetPath = path.join(targetDir, path.basename(file.path));

        // Check if file is already in the correct folder
        const parentDir = path.basename(path.dirname(file.path));
        if (parentDir === category) {
          alreadyOrganized++;
          continue;
        }

        // Create target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true });
          foldersCreated.add(category);
        }

        // Handle duplicate filenames
        let finalTargetPath = targetPath;
        let counter = 1;
        while (fs.existsSync(finalTargetPath)) {
          const ext = path.extname(file.path);
          const baseName = path.basename(file.path, ext);
          finalTargetPath = path.join(targetDir, `${baseName}_${counter}${ext}`);
          counter++;
        }

        // Move the file
        await rename(file.path, finalTargetPath);
        moved.push({
          from: file.path,
          to: finalTargetPath,
          category: category,
          size: file.size
        });

      } catch (error) {
        errors++;
        console.error(`\n${colors.red}Error moving ${file.path}: ${error.message}${colors.reset}`);
      }
    }

    return {
      moved: moved.length,
      alreadyOrganized: alreadyOrganized,
      errors: errors,
      foldersCreated: foldersCreated.size,
      details: moved
    };
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getFilesByCategory() {
    const files = await this.getFiles();
    const categorized = {};

    for (const file of files) {
      const category = this.getFileCategory(file);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(file);
    }

    return categorized;
  }

  async getFileTypeStats() {
    const files = await this.getFiles();
    const stats = {};

    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase() || 'no-extension';
      if (!stats[ext]) {
        stats[ext] = {
          count: 0,
          totalSize: 0,
          files: []
        };
      }
      stats[ext].count++;
      stats[ext].totalSize += file.size;
      stats[ext].files.push(file);
    }

    return stats;
  }

  async cleanupEmptyFolders() {
    const folders = this.getFolders();
    let removed = 0;

    // Sort by depth (deepest first)
    const sorted = folders.sort((a, b) => {
      const aDepth = a.path.split(path.sep).length;
      const bDepth = b.path.split(path.sep).length;
      return bDepth - aDepth;
    });

    for (const folder of sorted) {
      try {
        const contents = await readdir(folder.path);
        if (contents.length === 0) {
          await fs.promises.rmdir(folder.path);
          removed++;
        }
      } catch (error) {
        // Skip if can't remove
      }
    }

    return removed;
  }

  async getDirectorySize(dirPath = this.basePath) {
    let totalSize = 0;
    const items = await readdir(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(fullPath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  async findDuplicates() {
    const files = await this.getFiles();
    const byName = {};
    const duplicates = [];

    for (const file of files) {
      const name = path.basename(file.path);
      if (!byName[name]) {
        byName[name] = [];
      }
      byName[name].push(file);
    }

    for (const [name, files] of Object.entries(byName)) {
      if (files.length > 1) {
        // Check if files are actually duplicates (same size)
        const bySize = {};
        for (const file of files) {
          const sizeKey = file.size;
          if (!bySize[sizeKey]) {
            bySize[sizeKey] = [];
          }
          bySize[sizeKey].push(file);
        }
        for (const [size, sameSizeFiles] of Object.entries(bySize)) {
          if (sameSizeFiles.length > 1) {
            duplicates.push({
              name: name,
              size: parseInt(size),
              files: sameSizeFiles
            });
          }
        }
      }
    }

    return duplicates;
  }
}

export default Organizer;
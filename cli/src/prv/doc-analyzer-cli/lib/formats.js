import path from 'path';

export const SUPPORTED_FORMATS = {
  // Text-basiert
  '.txt': 'text',
  '.md': 'text',
  '.markdown': 'text',
  '.log': 'text',
  '.csv': 'text',
  '.json': 'text',
  '.xml': 'text',
  '.yaml': 'text',
  '.yml': 'text',
  '.html': 'html',
  '.htm': 'html',
  '.rtf': 'text',

  // PDF
  '.pdf': 'pdf',

  // Word
  '.docx': 'docx',
  '.doc': 'docx'
};

export function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS[ext] || null;
}

export function getSupportedExtensions() {
  return Object.keys(SUPPORTED_FORMATS);
}
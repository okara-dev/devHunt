import fs from 'fs';
import path from 'path';
import { getFileType } from './formats.js';

/**
 * Extrahiert Text aus einer Datei (PDF, DOCX, TXT, etc.)
 */
export async function extractText(filePath) {
  const type = getFileType(filePath);

  if (!type) {
    throw new Error(`Nicht unterstütztes Format: ${path.extname(filePath)}`);
  }

  switch (type) {
    case 'text':
      return extractTextFile(filePath);
    case 'html':
      return extractHtmlFile(filePath);
    case 'pdf':
      return extractPdf(filePath);
    case 'docx':
      return extractDocx(filePath);
    default:
      throw new Error(`Format "${type}" wird nicht unterstützt`);
  }
}

/**
 * Einfache Textdatei
 */
function extractTextFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return {
    text: content,
    type: 'text',
    pages: null
  };
}

/**
 * HTML-Datei (Tags entfernen)
 */
function extractHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Scripts & Styles entfernen
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // HTML-Tags entfernen
  content = content.replace(/<[^>]+>/g, ' ');

  // HTML-Entities
  content = content
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Mehrfache Whitespaces
  content = content.replace(/\s{2,}/g, ' ').trim();

  return {
    text: content,
    type: 'html',
    pages: null
  };
}

/**
 * PDF-Datei extrahieren
 */
async function extractPdf(filePath) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    return {
      text: data.text,
      type: 'pdf',
      pages: data.numpages,
      info: data.info
    };
  } catch (error) {
    throw new Error(`PDF konnte nicht gelesen werden: ${error.message}`);
  }
}

/**
 * DOCX-Datei extrahieren
 */
async function extractDocx(filePath) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    return {
      text: result.value,
      type: 'docx',
      pages: null,
      messages: result.messages
    };
  } catch (error) {
    throw new Error(`DOCX konnte nicht gelesen werden: ${error.message}`);
  }
}

/**
 * Text für KI vorbereiten (kürzen falls nötig)
 */
export function prepareTextForAI(text, maxChars = 100000) {
  // Bereinigen
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Kürzen wenn zu lang (ca. 25.000 Tokens)
  let truncated = false;
  if (cleaned.length > maxChars) {
    cleaned = cleaned.substring(0, maxChars);
    truncated = true;
  }

  return { text: cleaned, truncated };
}
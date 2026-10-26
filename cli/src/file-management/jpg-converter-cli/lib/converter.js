import sharp from 'sharp';
import path from 'path';

/**
 * Konvertiert ein Bild in JPG oder PNG
 */
export async function convertImage(inputPath, outputPath, format, quality = 90) {
  const image = sharp(inputPath);

  if (format === 'jpg' || format === 'jpeg') {
    // JPG: Alpha-Kanal entfernen (JPG unterstützt keine Transparenz)
    await image
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality, mozjpeg: true })
      .toFile(outputPath);
  } else if (format === 'png') {
    // PNG: Transparenz erhalten
    await image
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
  } else {
    throw new Error(`Nicht unterstütztes Format: ${format}`);
  }

  return outputPath;
}

/**
 * Liest Bild-Informationen
 */
export async function getImageInfo(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();

  return {
    format: metadata.format || 'unknown',
    width: metadata.width || 0,
    height: metadata.height || 0,
    channels: metadata.channels || 0,
    space: metadata.space,
    density: metadata.density,
    hasAlpha: metadata.hasAlpha || false
  };
}
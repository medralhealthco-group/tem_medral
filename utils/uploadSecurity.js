const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED = {
  jpeg: {
    ext: '.jpg',
    mime: 'image/jpeg',
    acceptedMimes: new Set(['image/jpeg', 'image/jpg']),
    acceptedExts: new Set(['.jpg', '.jpeg'])
  },
  png: {
    ext: '.png',
    mime: 'image/png',
    acceptedMimes: new Set(['image/png']),
    acceptedExts: new Set(['.png'])
  },
  webp: {
    ext: '.webp',
    mime: 'image/webp',
    acceptedMimes: new Set(['image/webp']),
    acceptedExts: new Set(['.webp'])
  }
};

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function isAllowedExtension(ext) {
  const normalized = String(ext || '').toLowerCase();
  return Object.values(ALLOWED).some(type => type.acceptedExts.has(normalized));
}

function isAllowedMime(mime) {
  const normalized = String(mime || '').toLowerCase();
  return Object.values(ALLOWED).some(type => type.acceptedMimes.has(normalized));
}

/**
 * Detect real image type from magic bytes (not client-declared MIME/extension).
 * @param {Buffer} buffer
 * @returns {'jpeg'|'png'|'webp'|null}
 */
function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

function generateSafeFilename(ext) {
  const id = crypto.randomBytes(16).toString('hex');
  return `product-${Date.now()}-${id}${ext}`;
}

function resolveSafeUploadPath(filename) {
  const base = path.basename(String(filename || ''));
  if (!base || base !== filename || base.includes('..')) {
    return null;
  }
  if (!/^product-\d+-[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i.test(base)) {
    // Allow legacy names already on disk: product-<digits>-<digits>.<ext>
    if (!/^product-\d+-\d+\.(jpg|jpeg|png|webp)$/i.test(base)) {
      return null;
    }
  }
  const full = path.join(UPLOAD_DIR, base);
  if (!full.startsWith(UPLOAD_DIR)) {
    return null;
  }
  return full;
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {
    // ignore cleanup errors
  }
}

function deleteUploadByUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  const match = imageUrl.match(/^\/uploads\/([^/?#]+)$/);
  if (!match) return false;
  const full = resolveSafeUploadPath(match[1]);
  if (!full) return false;
  safeUnlink(full);
  return true;
}

function cleanupUploadedFiles(files = []) {
  for (const file of files || []) {
    if (file && file.path) {
      safeUnlink(file.path);
    } else if (file && file.filename) {
      const full = resolveSafeUploadPath(file.filename);
      if (full) safeUnlink(full);
    }
  }
}

module.exports = {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED,
  ensureUploadDir,
  isAllowedExtension,
  isAllowedMime,
  detectImageType,
  generateSafeFilename,
  resolveSafeUploadPath,
  safeUnlink,
  deleteUploadByUrl,
  cleanupUploadedFiles
};

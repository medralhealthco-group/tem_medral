const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED,
  ensureUploadDir,
  isAllowedExtension,
  isAllowedMime,
  detectImageType,
  generateSafeFilename,
  safeUnlink,
  cleanupUploadedFiles
} = require('../utils/uploadSecurity');

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Provisional name only — final extension is rewritten after magic-byte validation
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = isAllowedExtension(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.bin';
    cb(null, generateSafeFilename(safeExt));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (!isAllowedExtension(ext) || !isAllowedMime(mime)) {
    return cb(new Error('Only image files (.jpg, .jpeg, .png, .webp) are allowed!'), false);
  }

  // Reject double-extension tricks like evil.php.jpg when originalname has extra dots of concern
  const base = path.basename(file.originalname || '');
  if (base.split('.').length > 2) {
    // Still allow "my.photo.jpg" style names if final ext is allowed — check all segments
    const parts = base.toLowerCase().split('.');
    const dangerous = parts.slice(0, -1).some(part =>
      ['php', 'phtml', 'asp', 'aspx', 'js', 'jsp', 'cgi', 'exe', 'sh', 'bat', 'cmd', 'com', 'svg', 'html', 'htm'].includes(part)
    );
    if (dangerous) {
      return cb(new Error('Invalid upload filename.'), false);
    }
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5
  },
  fileFilter
});

/**
 * Post-multer gate: verify magic bytes and normalize MIME/extension from file content.
 * Rejects spoofed images and removes any invalid files from disk.
 */
function validateUploadedImages(req, res, next) {
  const files = Array.isArray(req.files) ? req.files : [];

  try {
    for (const file of files) {
      if (!file || !file.path) {
        throw new Error('Upload failed — incomplete file received.');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Each image must be 5MB or smaller.');
      }

      const fd = fs.openSync(file.path, 'r');
      const header = Buffer.alloc(16);
      let bytesRead = 0;
      try {
        bytesRead = fs.readSync(fd, header, 0, 16, 0);
      } finally {
        fs.closeSync(fd);
      }

      const detectedKey = detectImageType(header.slice(0, bytesRead));
      if (!detectedKey || !ALLOWED[detectedKey]) {
        throw new Error('Invalid image content. Only real JPEG, PNG, or WebP files are allowed.');
      }

      const detected = ALLOWED[detectedKey];
      const currentExt = path.extname(file.filename || '').toLowerCase();
      let finalName = file.filename;

      if (currentExt !== detected.ext) {
        finalName = path.basename(file.filename, currentExt) + detected.ext;
        const newPath = path.join(UPLOAD_DIR, finalName);
        fs.renameSync(file.path, newPath);
        file.path = newPath;
        file.filename = finalName;
      }

      file.mimetype = detected.mime;
    }

    return next();
  } catch (err) {
    cleanupUploadedFiles(files);
    req.files = [];
    err.status = err.status || 400;
    return next(err);
  }
}

/** Convenience chain for product gallery uploads (same field name / UX). */
const uploadProductImages = [upload.array('images', 5), validateUploadedImages];

module.exports = upload;
module.exports.upload = upload;
module.exports.validateUploadedImages = validateUploadedImages;
module.exports.uploadProductImages = uploadProductImages;
module.exports.cleanupUploadedFiles = cleanupUploadedFiles;
module.exports.UPLOAD_DIR = UPLOAD_DIR;

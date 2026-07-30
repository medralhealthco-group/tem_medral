const fs = require('fs');
const path = require('path');

/**
 * Lightweight Minifier Utility for CSS and JS files
 */
function minifyCSS(cssContent) {
  if (!cssContent) return '';
  return cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
    .replace(/\s+/g, ' ') // Collapse consecutive whitespace
    .replace(/\s*([\{\}:;,])\s*/g, '$1') // Remove spaces around delimiters
    .replace(/;\}/g, '}') // Remove trailing semicolons before closing brace
    .trim();
}

function minifyJS(jsContent) {
  if (!jsContent) return '';
  return jsContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*/g, '') // Remove line comments
    .replace(/^\s+|\s+$/gm, '') // Trim whitespace per line
    .replace(/\n+/g, '\n') // Collapse blank lines
    .trim();
}

function processDirectory(dirPath, extension, minifierFn) {
  if (!fs.existsSync(dirPath)) return;

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith(extension) && !file.endsWith(`.min${extension}`)) {
      const fullPath = path.join(dirPath, file);
      const minPath = path.join(
        dirPath,
        file.replace(new RegExp(`\\${extension}$`), `.min${extension}`)
      );
      const content = fs.readFileSync(fullPath, 'utf8');
      const minified = minifierFn(content);
      fs.writeFileSync(minPath, minified, 'utf8');
    }
  }
}

function runMinification() {
  const cssDir = path.join(__dirname, '..', 'assets', 'css');
  const jsDir = path.join(__dirname, '..', 'assets', 'js');

  processDirectory(cssDir, '.css', minifyCSS);
  processDirectory(jsDir, '.js', minifyJS);
}

if (require.main === module) {
  runMinification();
  console.log('Static CSS and JS minification complete.');
}

module.exports = {
  minifyCSS,
  minifyJS,
  runMinification
};

const fs = require("fs");
const path = require("path");

const viewsDir = path.join(__dirname, "views");

function fixIncludes(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fixIncludes(fullPath);
    } else if (fullPath.endsWith(".ejs")) {
      let content = fs.readFileSync(fullPath, "utf8");

      // Calculate relative path from this file to the views directory
      let rel = path
        .relative(path.dirname(fullPath), viewsDir)
        .replace(/\\/g, "/");
      if (rel === "") {
        rel = ".";
      }
      // Replace <%- include('/partials/header') %>
      content = content.replace(
        /<%- include\('\/partials\/header'\) %>/g,
        `<%- include('${rel}/partials/header') %>`,
      );
      content = content.replace(
        /<%- include\('\/partials\/footer'\) %>/g,
        `<%- include('${rel}/partials/footer') %>`,
      );

      fs.writeFileSync(fullPath, content, "utf8");
    }
  }
}

fixIncludes(viewsDir);
console.log("Fixed include paths.");

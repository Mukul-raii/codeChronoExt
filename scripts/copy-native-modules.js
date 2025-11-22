const fs = require("fs");
const path = require("path");

// Modules that need to be copied (sqlite3 and its dependencies)
const modulesToCopy = ["sqlite3", "bindings", "file-uri-to-path"];

// Create node_modules directory in dist if it doesn't exist
const distNodeModules = path.join(__dirname, "..", "dist", "node_modules");
if (!fs.existsSync(distNodeModules)) {
  fs.mkdirSync(distNodeModules, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy each module
modulesToCopy.forEach((moduleName) => {
  const moduleSource = path.join(__dirname, "..", "node_modules", moduleName);
  const moduleDest = path.join(distNodeModules, moduleName);

  if (fs.existsSync(moduleSource)) {
    console.log(`Copying ${moduleName} to dist/node_modules...`);
    copyRecursiveSync(moduleSource, moduleDest);
    console.log(`✓ ${moduleName} copied successfully`);
  } else {
    console.warn(`⚠ Warning: ${moduleName} not found in node_modules`);
  }
});

console.log("\n✓ All native modules copied successfully");

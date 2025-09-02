#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;

// Files to keep - organized by functionality
const essentialFiles = {
  // Core configuration
  coreConfig: [
    "package.json",
    "drizzle.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "components.json",
    "jest.config.cjs",
    "jest.setup.cjs",
    "playwright.config.ts",
    "tsconfig.json",
  ],

  // Environment and Docker
  deployment: [
    "Dockerfile",
    "docker-compose.dev.yml",
    "docker-compose.test.yml",
    ".env.example",
    ".gitignore",
  ],

  // Main application directories
  applicationCore: ["client/", "server/", "shared/", "packages/", ".github/"],

  // Essential scripts and utilities
  utilities: ["migrate-supabase.cjs", "tenant-auth-test.html", "test-onboarding-ui.html"],

  // Key documentation
  documentation: [".github/copilot-instructions.md", "README.md"],
};

// Categories of files to remove
const filesToRemove = {
  // Temporary test files
  temporaryTests: [
    /^test-.*\.(js|cjs|mjs|ts|html)$/,
    /^check-.*\.(js|cjs|mjs|ts)$/,
    /^debug-.*\.(js|cjs|mjs|ts)$/,
    /^setup-.*\.(js|cjs|mjs|ts)$/,
    /^get-.*\.(js|cjs|mjs|ts)$/,
    /^create-.*\.(js|cjs|mjs|ts)$/,
    /^fix-.*\.(js|cjs|mjs|ts|sql)$/,
    /^run-.*\.(js|cjs|mjs|ts)$/,
    /^simple-.*\.(js|cjs|mjs|ts)$/,
  ],

  // Documentation reports (keep only essential docs)
  reports: [
    /.*_REPORT\.md$/,
    /.*_COMPLETE\.md$/,
    /.*_RESULTS\.md$/,
    /.*_SUMMARY\.md$/,
    /.*_GUIDE\.md$/,
    /.*_FIXES\.md$/,
    /.*_SETUP\.md$/,
    "PUBLISHING-GUIDE.md", // duplicate
    "OAUTH_CONFIGURATION.md", // duplicate
  ],

  // Temporary server files
  temporaryServers: ["basic-server.cjs", "diagnostic-server.js", "server-fixed.js"],

  // Demo and presentation files
  demoFiles: [
    /^demo-.*\.(js|html)$/,
    /^senior-management.*\.(js|html)$/,
    "saas-dashboard.html",
    "portal-navigation.html",
  ],

  // Configuration duplicates
  configDuplicates: ["azure-mcp-config.json"],

  // Image files (screenshots)
  screenshots: [/.*\.png$/],

  // Python examples
  pythonExamples: ["python-integration-example.py"],

  // PowerShell scripts
  powershellScripts: [/.*\.ps1$/],
};

// Get all files to remove
function getFilesToRemove() {
  const files = fs.readdirSync(projectRoot);
  const toRemove = [];

  files.forEach(file => {
    const filePath = path.join(projectRoot, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      // Check against all removal patterns
      Object.values(filesToRemove).forEach(patterns => {
        patterns.forEach(pattern => {
          if (typeof pattern === "string" && file === pattern) {
            toRemove.push(file);
          } else if (pattern instanceof RegExp && pattern.test(file)) {
            toRemove.push(file);
          }
        });
      });
    }
  });

  return [...new Set(toRemove)]; // Remove duplicates
}

// Get essential files list
function getEssentialFiles() {
  const essential = [];
  Object.values(essentialFiles).forEach(files => {
    essential.push(...files);
  });
  return essential;
}

console.log("=".repeat(80));
console.log("PROJECT CLEANUP ANALYSIS");
console.log("=".repeat(80));

const filesToRemoveList = getFilesToRemove();
const essentialFilesList = getEssentialFiles();

console.log("\n📁 ESSENTIAL FILES TO KEEP:");
console.log("─".repeat(40));
Object.entries(essentialFiles).forEach(([category, files]) => {
  console.log(`\n${category.toUpperCase()}:`);
  files.forEach(file => {
    const exists = fs.existsSync(path.join(projectRoot, file));
    console.log(`  ${exists ? "✅" : "❌"} ${file}`);
  });
});

console.log("\n🗑️  FILES TO REMOVE:");
console.log("─".repeat(40));
Object.entries(filesToRemove).forEach(([category, patterns]) => {
  console.log(`\n${category.toUpperCase()}:`);
  const categoryFiles = filesToRemoveList.filter(file => {
    return patterns.some(pattern => {
      if (typeof pattern === "string") return file === pattern;
      if (pattern instanceof RegExp) return pattern.test(file);
      return false;
    });
  });
  categoryFiles.forEach(file => {
    console.log(`  🗑️  ${file}`);
  });
});

console.log("\n📊 SUMMARY:");
console.log("─".repeat(40));
console.log(`Essential files: ${essentialFilesList.length}`);
console.log(`Files to remove: ${filesToRemoveList.length}`);

// Ask for confirmation before removal
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n❓ Do you want to proceed with cleanup? (y/N): ");
rl.question("", answer => {
  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    console.log("\n🧹 Starting cleanup...");

    let removedCount = 0;
    filesToRemoveList.forEach(file => {
      const filePath = path.join(projectRoot, file);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`  ✅ Removed: ${file}`);
          removedCount++;
        }
      } catch (error) {
        console.log(`  ❌ Failed to remove: ${file} - ${error.message}`);
      }
    });

    console.log(`\n✨ Cleanup complete! Removed ${removedCount} files.`);

    // Remove empty test-results directory if it exists
    const testResultsDir = path.join(projectRoot, "test-results");
    if (fs.existsSync(testResultsDir)) {
      try {
        fs.rmSync(testResultsDir, { recursive: true, force: true });
        console.log("  ✅ Removed: test-results/ directory");
      } catch (error) {
        console.log(`  ❌ Failed to remove test-results directory: ${error.message}`);
      }
    }

    // Remove empty playwright-report directory if it exists
    const playwrightDir = path.join(projectRoot, "playwright-report");
    if (fs.existsSync(playwrightDir)) {
      try {
        fs.rmSync(playwrightDir, { recursive: true, force: true });
        console.log("  ✅ Removed: playwright-report/ directory");
      } catch (error) {
        console.log(`  ❌ Failed to remove playwright-report directory: ${error.message}`);
      }
    }

    // Remove temp-scripts directory if it exists
    const tempScriptsDir = path.join(projectRoot, "temp-scripts");
    if (fs.existsSync(tempScriptsDir)) {
      try {
        fs.rmSync(tempScriptsDir, { recursive: true, force: true });
        console.log("  ✅ Removed: temp-scripts/ directory");
      } catch (error) {
        console.log(`  ❌ Failed to remove temp-scripts directory: ${error.message}`);
      }
    }
  } else {
    console.log("\n❌ Cleanup cancelled.");
  }

  rl.close();
});

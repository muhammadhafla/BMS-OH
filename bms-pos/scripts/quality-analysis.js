#!/usr/bin/env node

/**
 * BMS-POS Code Quality Analysis Script
 * Analyzes code quality, complexity, and technical debt
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  sourceDir: './src',
  outputDir: './quality-reports',
  maxComplexity: 15,
  maxFileSize: 1000, // lines
  maxFunctionLength: 50, // lines
  excludedPatterns: [
    'node_modules',
    'dist',
    'build',
    '.git',
    '*.test.*',
    '*.spec.*',
    '*.d.ts',
  ],
};

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function createOutputDirectory() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!CONFIG.excludedPatterns.some(pattern => filePath.includes(pattern))) {
        getAllFiles(filePath, fileList);
      }
    } else {
      if (shouldAnalyzeFile(filePath)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

function shouldAnalyzeFile(filePath) {
  const ext = path.extname(filePath);
  const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  if (!validExtensions.includes(ext)) {
    return false;
  }
  
  return !CONFIG.excludedPatterns.some(pattern => {
    if (pattern.startsWith('*.')) {
      return filePath.endsWith(pattern.substring(1));
    }
    return filePath.includes(pattern);
  });
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const analysis = {
    filePath: path.relative('.', filePath),
    lines: lines.length,
    size: content.length,
    complexity: calculateComplexity(content),
    functions: extractFunctions(content),
    imports: extractImports(content),
    exports: extractExports(content),
    issues: [],
  };
  
  // Check for issues
  if (analysis.lines > CONFIG.maxFileSize) {
    analysis.issues.push({
      type: 'file-size',
      severity: 'warning',
      message: `File has ${analysis.lines} lines (max: ${CONFIG.maxFileSize})`,
    });
  }
  
  if (analysis.complexity > CONFIG.maxComplexity) {
    analysis.issues.push({
      type: 'complexity',
      severity: 'error',
      message: `Cyclomatic complexity ${analysis.complexity} exceeds limit ${CONFIG.maxComplexity}`,
    });
  }
  
  // Analyze functions
  analysis.functions.forEach(func => {
    if (func.lines > CONFIG.maxFunctionLength) {
      analysis.issues.push({
        type: 'function-length',
        severity: 'warning',
        message: `Function "${func.name}" has ${func.lines} lines (max: ${CONFIG.maxFunctionLength})`,
        line: func.startLine,
      });
    }
  });
  
  // Check for console.log statements
  const consoleLogCount = (content.match(/console\.log/g) || []).length;
  if (consoleLogCount > 0) {
    analysis.issues.push({
      type: 'console-statements',
      severity: 'warning',
      message: `Contains ${consoleLogCount} console.log statements`,
    });
  }
  
  // Check for TODO/FIXME comments
  const todoMatches = content.match(/TODO|FIXME|XXX|HACK/gi) || [];
  if (todoMatches.length > 0) {
    analysis.issues.push({
      type: 'todo-comments',
      severity: 'info',
      message: `Contains ${todoMatches.length} TODO/FIXME comments`,
    });
  }
  
  // Check for duplicate imports
  const importCounts = {};
  analysis.imports.forEach(imp => {
    importCounts[imp.module] = (importCounts[imp.module] || 0) + 1;
  });
  
  Object.entries(importCounts).forEach(([module, count]) => {
    if (count > 1) {
      analysis.issues.push({
        type: 'duplicate-imports',
        severity: 'warning',
        message: `Module "${module}" imported ${count} times`,
      });
    }
  });
  
  return analysis;
}

function calculateComplexity(content) {
  // Simple cyclomatic complexity calculation
  const complexityKeywords = [
    'if', 'else', 'while', 'for', 'switch', 'case',
    'catch', '&&', '||', '?', ':', 'try'
  ];
  
  let complexity = 1; // Base complexity
  
  complexityKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = content.match(regex) || [];
    complexity += matches.length;
  });
  
  return complexity;
}

function extractFunctions(content) {
  const functions = [];
  const lines = content.split('\n');
  
  // Match function declarations
  const functionRegex = /(?:function\s+(\w+)|(\w+)\s*:\s*\(.*?\)\s*=>|const\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1] || match[2] || match[3];
    const startLine = content.substring(0, match.index).split('\n').length;
    
    // Find function end (simplified)
    let braceCount = 0;
    let endLine = startLine;
    let inFunction = false;
    
    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            endLine = i + 1;
            break;
          }
        }
      }
      if (braceCount === 0 && inFunction) {
        break;
      }
    }
    
    functions.push({
      name: funcName,
      startLine,
      endLine,
      lines: endLine - startLine + 1,
    });
  }
  
  return functions;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      line: content.substring(0, match.index).split('\n').length,
    });
  }
  
  return imports;
}

function extractExports(content) {
  const exports = [];
  const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)/g;
  let match;
  
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push({
      line: content.substring(0, match.index).split('\n').length,
      type: match[0],
    });
  }
  
  return exports;
}

function generateReport(analyses) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analyses.length,
      totalLines: analyses.reduce((sum, a) => sum + a.lines, 0),
      totalSize: analyses.reduce((sum, a) => sum + a.size, 0),
      averageComplexity: analyses.reduce((sum, a) => sum + a.complexity, 0) / analyses.length,
      issuesByType: {},
      issuesBySeverity: { error: 0, warning: 0, info: 0 },
    },
    files: analyses,
    recommendations: [],
  };
  
  // Count issues
  analyses.forEach(analysis => {
    analysis.issues.forEach(issue => {
      report.summary.issuesByType[issue.type] = (report.summary.issuesByType[issue.type] || 0) + 1;
      report.summary.issuesBySeverity[issue.severity]++;
    });
  });
  
  // Generate recommendations
  if (report.summary.issuesBySeverity.error > 0) {
    report.recommendations.push('Address all error-level issues to improve code quality');
  }
  
  if (report.summary.issuesByType['file-size'] > 5) {
    report.recommendations.push('Consider breaking down large files into smaller modules');
  }
  
  if (report.summary.issuesByType['console-statements'] > 0) {
    report.recommendations.push('Remove console.log statements or use proper logging library');
  }
  
  if (report.summary.issuesByType['todo-comments'] > 0) {
    report.recommendations.push('Address TODO/FIXME comments or create proper issues for them');
  }
  
  return report;
}

function saveReport(report) {
  const reportPath = path.join(CONFIG.outputDir, `quality-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  const summaryPath = path.join(CONFIG.outputDir, 'latest-report.json');
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  
  return { reportPath, summaryPath };
}

function printSummary(report) {
  log('\n📊 Code Quality Analysis Summary', COLORS.bright);
  log('================================', COLORS.cyan);
  
  log(`📁 Files analyzed: ${report.summary.totalFiles}`, COLORS.green);
  log(`📏 Total lines: ${report.summary.totalLines.toLocaleString()}`, COLORS.green);
  log(`💾 Total size: ${(report.summary.totalSize / 1024).toFixed(2)} KB`, COLORS.green);
  log(`🧮 Average complexity: ${report.summary.averageComplexity.toFixed(2)}`, COLORS.green);
  
  log('\n🚨 Issues by Severity:', COLORS.bright);
  Object.entries(report.summary.issuesBySeverity).forEach(([severity, count]) => {
    const color = severity === 'error' ? COLORS.red : severity === 'warning' ? COLORS.yellow : COLORS.blue;
    log(`  ${severity.toUpperCase()}: ${count}`, color);
  });
  
  log('\n🔍 Issues by Type:', COLORS.bright);
  Object.entries(report.summary.issuesByType).forEach(([type, count]) => {
    log(`  ${type}: ${count}`, COLORS.magenta);
  });
  
  if (report.recommendations.length > 0) {
    log('\n💡 Recommendations:', COLORS.bright);
    report.recommendations.forEach(rec => {
      log(`  • ${rec}`, COLORS.cyan);
    });
  }
  
  // Show top issues
  const allIssues = report.files.flatMap(f => 
    f.issues.map(issue => ({ ...issue, file: f.filePath }))
  ).sort((a, b) => {
    const severityOrder = { error: 3, warning: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
  
  if (allIssues.length > 0) {
    log('\n🔝 Top Issues:', COLORS.bright);
    allIssues.slice(0, 10).forEach(issue => {
      const color = issue.severity === 'error' ? COLORS.red : 
                   issue.severity === 'warning' ? COLORS.yellow : COLORS.blue;
      log(`  ${issue.severity.toUpperCase()}: ${issue.message}`, color);
      log(`    📁 ${issue.file}`, COLORS.reset);
    });
  }
}

function main() {
  try {
    log('🔍 Starting BMS-POS Code Quality Analysis...', COLORS.bright);
    
    createOutputDirectory();
    
    if (!fs.existsSync(CONFIG.sourceDir)) {
      log('❌ Source directory not found!', COLORS.red);
      process.exit(1);
    }
    
    const files = getAllFiles(CONFIG.sourceDir);
    log(`📁 Found ${files.length} files to analyze`, COLORS.green);
    
    const analyses = files.map(file => analyzeFile(file));
    const report = generateReport(analyses);
    
    const { reportPath } = saveReport(report);
    
    printSummary(report);
    
    log(`\n📄 Detailed report saved to: ${reportPath}`, COLORS.cyan);
    
    // Exit with error code if there are error-level issues
    if (report.summary.issuesBySeverity.error > 0) {
      log('\n❌ Analysis completed with errors. Please fix the issues.', COLORS.red);
      process.exit(1);
    } else {
      log('\n✅ Analysis completed successfully!', COLORS.green);
      process.exit(0);
    }
    
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, COLORS.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeFile,
  generateReport,
  calculateComplexity,
};
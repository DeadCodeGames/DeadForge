const fs = require('fs');
const path = require('path');
const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const i18nConfigFile = path.join(__dirname, '..', '..', 'src', 'locales', 'i18n.ts');

function updateI18nConfig() {
  const files = fs.readdirSync(localesDir);
  const availableLanguages = files
    .filter(file => file.endsWith('.json'))
    .map(file => path.basename(file, '.json'));
  
  let content = fs.readFileSync(i18nConfigFile, 'utf8');
  
  // Update imports section
  const importMatches = [...content.matchAll(/import (\w+) from '\.\/(\w+)\.json';/g)];
  const currentImports = importMatches.map(match => match[1]);
  const newLanguages = availableLanguages.filter(lang => !currentImports.includes(lang));
  
  if (newLanguages.length > 0) {
    const updatedImports = [
      ...importMatches.map(match => `import ${match[1]} from './${match[2]}.json';`),
      ...newLanguages.map(lang => `import ${lang} from './${lang}.json';`)
    ];
  
    content = content.replace(
      /(import\s+\w+\s+from\s+'\.\/[\w-]+\.json';\s*)+/m,
      updatedImports.join('\n') + '\n'
    );
  }
  
  // Create complete resources object with all languages
  // Find where resources declaration starts
  const resourcesStartMatch = content.match(/const resources:.*?= \{/);
  if (!resourcesStartMatch) {
    console.error("Could not find resources declaration in i18n.ts");
    return;
  }
  
  // Find where resources object ends (just the closing brace and semicolon)
  const resourcesStart = content.indexOf(resourcesStartMatch[0]);
  let braceCount = 0;
  let resourcesEnd = -1;
  let inString = false;
  let stringChar = '';
  
  // Start after the opening brace
  for (let i = resourcesStart + resourcesStartMatch[0].length; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (inString) {
      if (char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = '';
      }
      continue;
    }
    
    // Count braces outside of strings
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      if (braceCount === 0) {
        // This is the closing brace of the resources object
        // Look for the semicolon
        if (content[i + 1] === ';') {
          resourcesEnd = i + 2;
          break;
        }
      } else {
        braceCount--;
      }
    }
  }
  
  if (resourcesEnd === -1) {
    console.error("Could not find end of resources declaration in i18n.ts");
    return;
  }
  
  // Determine the indent level from the current content
  const indentMatch = content.match(/const resources.*?{\s*\n(\s+)/);
  const indent = indentMatch ? indentMatch[1] : '  ';
  
  // Generate all resource entries
  const allResourceEntries = availableLanguages
    .map(lang => `${indent}${lang}: { translation: ${lang} },`)
    .join('\n');
  
  // Replace only the resources object content
  const resourcesStart_str = resourcesStartMatch[0];
  const newResourcesSection = `${resourcesStart_str}\n${allResourceEntries}\n};`;
  
  // Replace the resources object with the updated one
  const beforeResources = content.substring(0, resourcesStart);
  const afterResources = content.substring(resourcesEnd);
  
  content = beforeResources + newResourcesSection + afterResources;
  
  fs.writeFileSync(i18nConfigFile, content, 'utf8');
  console.log(`i18n.ts updated. All languages now included in resources.`);
  if (newLanguages.length > 0) {
    console.log(`New languages added: ${newLanguages.join(', ')}`);
  }
}

updateI18nConfig();

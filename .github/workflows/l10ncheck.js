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
  
  // Find where resource declaration ends
  const resourcesEndMatch = content.match(/\};(\s*if\s*\(!window\.App\.isPackaged\)|\s*i18n)/);
  if (!resourcesEndMatch) {
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
  
  // Replace the resources object with the updated one
  const resourcesStart = resourcesStartMatch[0];
  const resourcesEnd = resourcesEndMatch[0];
  const newResourcesSection = `${resourcesStart}\n${allResourceEntries}\n};`;
  
  content = content.replace(
    new RegExp(`${escapeRegExp(resourcesStart)}[\\s\\S]*?${escapeRegExp(resourcesEnd)}`),
    newResourcesSection + resourcesEnd.substring(2)
  );
  
  fs.writeFileSync(i18nConfigFile, content, 'utf8');
  console.log(`i18n.ts updated. All languages now included in resources.`);
  if (newLanguages.length > 0) {
    console.log(`New languages added: ${newLanguages.join(', ')}`);
  }
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

updateI18nConfig();
const fs = require('fs');
const path = require('path');

// Paths
const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const i18nConfigFile = path.join(__dirname, '..', '..', 'src', 'locales', 'i18n.ts');
// Commented out page.tsx related path
// const pageFile = path.join(__dirname, '..', '..', 'src', 'app', 'page.tsx');

// Helper function to generate imports and resources
function generateLanguageData(languages) {
  const imports = languages.map(lang => `import ${lang} from './${lang}.json';`).join('\n');
  const resources = languages.map(lang => `  ${lang}: { translation: ${lang} },`).join('\n');
  return { imports, resources };
}

// Function to update i18n.ts
function updateI18nConfig() {
    const files = fs.readdirSync(localesDir);
    const availableLanguages = files.filter(file => file.endsWith('.json')).map(file => path.basename(file, '.json'));
    let content = fs.readFileSync(i18nConfigFile, 'utf8');
   
    // Extract existing imports and resources from the file
    const importMatches = [...content.matchAll(/import (\w+) from '\.\/(\w+)\.json';/g)];
    const currentImports = importMatches.map(match => match[1]);
    const currentImportOrder = importMatches.map(match => match[2]);
    const currentResources = [...content.matchAll(/(\w+): \{ translation: \w+ \},/g)].map(match => match[1]);
  
    // Determine which languages are new
    const newLanguages = availableLanguages.filter(lang => !currentImports.includes(lang));
    if (newLanguages.length === 0) {
      console.log("No new languages to add in i18n.ts.");
      return;
    }
  
    // Reconstruct import section while maintaining original order and appending new languages
    const updatedImports = [
      ...importMatches.map(match => `import ${match[1]} from './${match[2]}.json';`),
      ...newLanguages.map(lang => `import ${lang} from './${lang}.json';`)
    ];
  
    // Replace the import section
    content = content.replace(
      /(import\s+\w+\s+from\s+'\.\/[\w-]+\.json';\s*)+/m, 
      updatedImports.join('\n') + '\n'
    );
  
    // Add new resources at the end of the resources object
    const resourceSection = content.match(/(const resources = \{[\s\S]*?)\};/)[1];
    const newResourceStatements = newLanguages.map(lang => `  ${lang}: { translation: ${lang} },`).join('\n');
    const updatedResourceSection = `${resourceSection}${newResourceStatements}\n};`;
  
    // Replace the resources section
    content = content.replace(/(const resources = \{[\s\S]*?)\};/, updatedResourceSection);
  
    // Write the updated content back to the file
    fs.writeFileSync(i18nConfigFile, content, 'utf8');
    console.log(`i18n.ts updated. New languages added: ${newLanguages.join(', ')}`);
  }

/* 
// Function to update UI_LANGUAGES in page.tsx - Commented out
function updateUILanguages() {
  const files = fs.readdirSync(localesDir);
  const availableLanguages = files.filter(file => file.endsWith('.json')).map(file => path.basename(file, '.json'));

  let content = fs.readFileSync(pageFile, 'utf8');
  const currentLanguagesMatch = content.match(/const UI_LANGUAGES = \[([^\]]*)\];/);

  if (!currentLanguagesMatch) {
    console.error("UI_LANGUAGES array not found in page.tsx.");
    return;
  }

  const currentLanguages = currentLanguagesMatch[1].split(',').map(lang => lang.trim().replace(/['"]/g, ''));
  const newLanguages = availableLanguages.filter(lang => !currentLanguages.includes(lang));

  if (newLanguages.length === 0) {
    console.log("No new languages to add in UI_LANGUAGES.");
    return;
  }

  const updatedLanguages = [...currentLanguages, ...newLanguages].map(lang => `'${lang}'`).join(', ');
  content = content.replace(/const UI_LANGUAGES = \[([^\]]*)\];/, `const UI_LANGUAGES = [${updatedLanguages}];`);

  fs.writeFileSync(pageFile, content, 'utf8');
  console.log(`UI_LANGUAGES updated. New languages added: ${newLanguages.join(', ')}`);
}
*/

// Run only the i18n config update
updateI18nConfig();
// Commented out updateUILanguages call
// updateUILanguages();
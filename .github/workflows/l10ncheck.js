const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const i18nConfigFile = path.join(__dirname, '..', '..', 'src', 'locales', 'i18n.ts');

// Helper function to generate imports and resources
function generateLanguageData(languages) {
  const imports = languages.map(lang => `import ${lang} from './${lang}.json';`).join('\n');
  const resources = languages.map(lang => `  ${lang}: { translation: ${lang} },`).join('\n');
  return { imports, resources };
}

function updateI18nConfig() {
    const files = fs.readdirSync(localesDir);
    const availableLanguages = files.filter(file => file.endsWith('.json')).map(file => path.basename(file, '.json'));
    let content = fs.readFileSync(i18nConfigFile, 'utf8');
   
    const importMatches = [...content.matchAll(/import (\w+) from '\.\/(\w+)\.json';/g)];
    const currentImports = importMatches.map(match => match[1]);
    const newLanguages = availableLanguages.filter(lang => !currentImports.includes(lang));
    if (newLanguages.length === 0) {
      console.log("No new languages to add in i18n.ts.");
      return;
    }
  
    const updatedImports = [
      ...importMatches.map(match => `import ${match[1]} from './${match[2]}.json';`),
      ...newLanguages.map(lang => `import ${lang} from './${lang}.json';`)
    ];
  
    content = content.replace(
      /(import\s+\w+\s+from\s+'\.\/[\w-]+\.json';\s*)+/m, 
      updatedImports.join('\n') + '\n'
    );
  
    const resourceSection = content.match(/(const resources:.*?= \{[\s\S]*?)\};/)[1];
    const newResourceStatements = newLanguages.map(lang => `  ${lang}: { translation: ${lang} },`).join('\n');
    const updatedResourceSection = `${resourceSection}${newResourceStatements}\n};`;
      content = content.replace(/(const resources = \{[\s\S]*?)\};/, updatedResourceSection);
  
    fs.writeFileSync(i18nConfigFile, content, 'utf8');
    console.log(`i18n.ts updated. New languages added: ${newLanguages.join(', ')}`);
  }
updateI18nConfig();
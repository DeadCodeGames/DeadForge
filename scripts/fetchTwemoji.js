const fs = require('fs');
const path = require('path');
const https = require('https');
const twemoji = require('twemoji');
const LOCALES_DIR = path.join(__dirname, '../src/locales');


function extractEmojisFromLocales() {
    const files = fs.readdirSync(LOCALES_DIR);
    const emojis = [];

    for (const file of files) {
        const fullPath = path.join(LOCALES_DIR, file);
        if (fs.statSync(fullPath).isFile() && file.endsWith('.json')) {
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                const emoji = content?.meta?.emoji;
                if (typeof emoji === 'string') emojis.push(emoji);
            } catch (err) {
                console.warn(`⚠️ Failed to parse ${file}: ${err.message}`);
            }
        }
    }

    return emojis;
}

const EMOJIS = extractEmojisFromLocales();

const OUTPUT_DIR = path.join(__dirname, '../public/twemoji');

function fetchAndSave(url, outPath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const file = fs.createWriteStream(outPath, {});
        https
            .get(url, res => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                }
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
            })
            .on('error', reject);
    });
}

(async () => {
    if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const codepoints = new Set();

    for (const emoji of EMOJIS) {
        const parsed = twemoji.parse(emoji, {
            callback: (_icon, options, variant) =>
                twemoji.convert.toCodePoint(emoji),
        });

        const match = parsed.match(/src="([a-f0-9-]+)"/);
        if (match && match[1]) codepoints.add(match[1]);
    }

    for (const codepoint of codepoints) {
        const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${codepoint}.svg`;
        const outPath = path.join(OUTPUT_DIR, "svg", `${codepoint}.svg`);

        try {
            console.log(`Fetching ${codepoint} from ${url}...`);
            await fetchAndSave(url, outPath);
        } catch (err) {
            console.error(`Error fetching ${codepoint}:`, err.message);
        }
    }

    console.log(`✅ Done. ${codepoints.size} emoji(s) saved to ${OUTPUT_DIR}`);
})();

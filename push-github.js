/**
 * Nirogya AI — Push fixes to GitHub via REST API (no git required)
 * Run: node push-github.js YOUR_GITHUB_TOKEN
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.argv[2] || process.env.GITHUB_TOKEN || '';
const OWNER = 'Himanshugupta4105';
const REPO = 'nirogya-ai';
let BRANCH = 'main';

if (!TOKEN) {
    console.log('\n❌  Usage:  node push-github.js YOUR_GITHUB_TOKEN');
    console.log('   Get a token at https://github.com/settings/tokens (scope: repo)\n');
    process.exit(1);
}

const ROOT = path.resolve(__dirname);

const FILES = [
    'index.html',
    '.nojekyll',
    '404.html',
    'frontend/INDEX.html',
    'frontend/STYLE.css',
    'frontend/script.js',
    'frontend/chat-engine.js',
    'frontend/features.html',
    'frontend/features.js',
    'frontend/features.css',
    '.github/workflows/deploy.yml'
];

function api(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${OWNER}/${REPO}${endpoint}`,
            method,
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'nirogya-push-script',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request(options, res => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, data: raw }); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function run() {
    console.log('\n✳  Nirogya AI — GitHub Push Script\n');

    // 1. Verify repo access
    const repo = await api('GET', '');
    if (repo.status !== 200) {
        console.log('❌ Cannot access repo. Check token/repo.', repo.data);
        process.exit(1);
    }
    console.log(`✅ Connected: ${repo.data.full_name}`);

    // 2. Determine branch
    let ref = await api('GET', `/git/ref/heads/${BRANCH}`);
    if (ref.status !== 200) {
        BRANCH = 'master';
        ref = await api('GET', `/git/ref/heads/${BRANCH}`);
    }
    if (ref.status !== 200) {
        console.log('❌ Cannot find main or master branch');
        process.exit(1);
    }
    console.log(`✅ Branch: ${BRANCH}`);

    // 3. Push each file
    let ok = 0, fail = 0;
    for (const relPath of FILES) {
        const fullPath = path.join(ROOT, relPath);
        const apiPath = relPath.replace(/\\/g, '/');

        if (!fs.existsSync(fullPath)) {
            console.log(`  ⏭  SKIP (not found): ${relPath}`);
            continue;
        }

        process.stdout.write(`  📄 ${relPath} ... `);

        const content = fs.readFileSync(fullPath).toString('base64');

        // Check if file exists to get sha
        let sha = null;
        const existing = await api('GET', `/contents/${apiPath}?ref=${BRANCH}`);
        if (existing.status === 200 && existing.data.sha) {
            sha = existing.data.sha;
        }

        const body = {
            message: `fix: ${relPath} — production fix [auto-push]`,
            content,
            branch: BRANCH
        };
        if (sha) body.sha = sha;

        const result = await api('PUT', `/contents/${apiPath}`, body);
        if (result.status === 200 || result.status === 201) {
            console.log('✅');
            ok++;
        } else {
            console.log(`❌ (${result.status})`);
            fail++;
        }
    }

    console.log(`\n🏁 Done! ${ok} pushed, ${fail} failed.\n`);
    if (ok > 0) {
        console.log('🌐 Next steps:');
        console.log(`   1. Go to: https://github.com/${OWNER}/${REPO}/settings/pages`);
        console.log('   2. Set Source to "GitHub Actions"');
        console.log(`   3. Site: https://${OWNER}.github.io/${REPO}/\n`);
    }
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });

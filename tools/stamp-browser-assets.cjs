'use strict';

const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');

const root = 'https://matchapp.tv';
const assets = [
    '/brand.css', '/patches/jonas-adult-page.js', '/final-wiring.js', '/settings.js', '/voice-input.js',
    '/discover.js', '/locale-results.js', '/match-guarantee.js', '/music-video-releases.js',
    '/human-conversation.js', '/human-conversation-male-only-20261010.js',
    '/human-conversation-cloud-20261010.js', '/production-hardening.js',
    '/jonas/discovery-avatar-stage-20261010.js', '/jonas/jonas-20261010-v3.js'
];

function stampHtml(html, filename, hashes) {
    return html.replace(/<(?:script|link)\b[^>]*>/gi, tag => tag.replace(
        /(\s(?:src|href)\s*=\s*)(["'])([^"']+)\2/i,
        (attribute, name, quote, value) => {
            const url = new URL(value.replace(/&amp;/g, '&'), root + '/' + filename);
            const hash = url.origin === root && hashes.get(url.pathname);
            if (!hash || url.searchParams.get('ma_rev') === hash) return attribute;
            const [path, fragment] = value.split('#');
            const revised = /[?&](?:amp;)?ma_rev=/.test(path)
                ? path.replace(/([?&](?:amp;)?ma_rev=)[^&#]*/, '$1' + hash)
                : path + (path.includes('?') ? '&amp;' : '?') + 'ma_rev=' + hash;
            return name + quote + revised + (fragment === undefined ? '' : '#' + fragment) + quote;
        }
    ));
}

if (require.main === module) {
    const hashes = new Map(assets.map(asset => [asset, createHash('sha256')
        .update(fs.readFileSync(asset.slice(1))).digest('hex').slice(0, 12)]));
    const pages = execFileSync('git', ['ls-files', '-z', '--', '*.html'], {encoding:'utf8'}).split('\0');
    let changed = 0;
    for (const file of pages) {
        if (!file || /^(?:android(?:-studio)?|desktop|tests|tools|supabase|docs|reports)\//.test(file)) continue;
        const original = fs.readFileSync(file, 'utf8');
        const stamped = stampHtml(original, file, hashes);
        if (original !== stamped) { fs.writeFileSync(file, stamped); changed++; }
    }
    console.log('Stamped browser assets in ' + changed + ' published HTML files.');
}

module.exports = {stampHtml};

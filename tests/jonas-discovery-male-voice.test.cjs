'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('all discover answer read-aloud routes must use approved masculine voices',()=>{
 const html=read('discover.html'),answer=read('discover-male-only-20261010.js'),human=read('human-conversation-male-only-20261010.js');
 assert.ok(html.indexOf('male-voice-policy-20261010.js')<html.indexOf('discover.js?v='));
 assert.match(html,/discovery-speech-lock-20261010\.js/);
 assert.match(answer,/MatchAppJonasVoicePolicy\?\.select\?/);
 assert.match(answer,/if \(!voice\) \{/);
 assert.match(human,/MatchAppJonasVoicePolicy\?\.select\?/);
 assert.match(human,/if \(!v\) \{/);
 assert.doesNotMatch(human,/S\?\.resolveVoice\s*\?/);
 assert.match(read('final-wiring.js'),/human-conversation-male-only-20261010/);
 assert.match(read('build-meta.js'),/final-wiring\.js\?v=20261010-malevoice/);
});

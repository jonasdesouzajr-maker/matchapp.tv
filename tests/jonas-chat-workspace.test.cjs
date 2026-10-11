const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Jonas transcript owns scrolling; composer stays outside expanding answer cards',()=>{
 const src=read('discover.js'),html=read('discover.html'),css=read('jonas/chat-workspace-20261011.css');
 assert.match(src,/function revealJonasTurn\(node\)/);
 assert.match(src,/log\.scrollTop=/);
 assert.match(src,/function placeDiscoverComposer\(wrap,grid\)[\s\S]{0,140}parkDiscoverComposer\(\)/);
 assert.doesNotMatch(src,/\(bubble\?\.wrap \|\| row\)\.scrollIntoView/);
 assert.match(html,/chat-workspace-20261011\.css/);
 assert.match(html,/chat-workspace-20261011\.js/);
 assert.match(css,/#chat-log\{[\s\S]{0,160}flex:1 1 auto/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/--jonas-workspace-height/);
});
test('Jonas changes expression and speech visemes only from speech-level and platform boundary callbacks',()=>{
 const avatar=read('jonas/discovery-avatar-stage-20261010.js');
 const speech=read('jonas/secure-speech-20261010.js');
 assert.match(avatar,/jds-expression/);
 assert.match(avatar,/smile\.jpg/);
 assert.match(avatar,/meterLevel>=\.23\?'aa'/);
 assert.match(avatar,/if\(active&&meterAt-lastFrameAt>=FRAME_HOLD_MS\)/);
 assert.match(speech,/utter\.onboundary=function/);
 assert.match(speech,/options\.onLevel\?\.\(\.24\)/);
});
test('cookie notice never obscures Jonas composer and no code path scrolls the whole document on replies',()=>{
 const workspace=read('jonas/chat-workspace-20261011.js');
 const css=read('jonas/chat-workspace-20261011.css');
 const chat=read('discover.js');
 const avatar=read('jonas/discovery-avatar-stage-20261010.js');
 assert.match(workspace,/document\.querySelector\('body > \.ma-cookie'\)/);
 assert.match(workspace,/MutationObserver/);
 assert.match(workspace,/Math\.min\(viewportBottom-10,cookieTop\)/);
 assert.doesNotMatch(chat,/scrollIntoView\s*\(/);
 assert.match(css,/--jds-head-y/);
 assert.match(avatar,/--jds-head-y/);
 assert.match(avatar,/--jds-head-scale/);
});
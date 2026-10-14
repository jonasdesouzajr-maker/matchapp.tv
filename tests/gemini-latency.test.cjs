'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('adult Flash latency tuning preserves schemas and complete output budgets',async()=>{
  const {withGeminiLatency}=await import('../supabase/functions/gemini-proxy/latency-config.mjs');
  const base={maxOutputTokens:8192,responseMimeType:'application/json',responseSchema:{type:'OBJECT',required:['answer']}};
  for(const model of ['gemini-3.5-flash','gemini-3.6-flash','gemini-3.8-flash']){
    const config=withGeminiLatency(base,model,false);
    assert.equal(config.thinkingConfig.thinkingLevel,'low');
    assert.equal(config.maxOutputTokens,8192);
    assert.equal(config.responseSchema,base.responseSchema);
    assert.equal(config.responseMimeType,'application/json');
  }
  assert.equal(base.thinkingConfig,undefined,'shared base is not mutated');
});
test('Kids, Lite and unknown model settings retain original inference behavior',async()=>{
  const {withGeminiLatency}=await import('../supabase/functions/gemini-proxy/latency-config.mjs');
  const base={maxOutputTokens:8192,responseMimeType:'application/json'};
  assert.equal(withGeminiLatency(base,'gemini-3.6-flash',true),base);
  for(const model of ['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-2.5-flash-preview-tts','future-model']){
    assert.equal(withGeminiLatency(base,model,false),base);
  }
});
test('aliased model retries are removed per key without reordering independent fallback projects',async()=>{
  const {uniqueGeminiRoutes}=await import('../supabase/functions/gemini-proxy/latency-config.mjs');
  const routes=[
    {model:'gemini-3.5-flash',key:'project-a'},
    {model:'gemini-3.6-flash',key:'project-a'},
    {model:'gemini-3.5-flash-lite',key:'project-a'},
    {model:'gemini-3.6-flash',key:'project-b'},
  ];
  assert.deepEqual(uniqueGeminiRoutes(routes),[routes[0],routes[2],routes[3]]);
  assert.equal(uniqueGeminiRoutes(routes,true),routes);
  assert.equal(routes.length,4);
});

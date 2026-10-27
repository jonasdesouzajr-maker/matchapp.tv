/* Execute the Lumina RPC contract against real embedded Postgres, with synthetic users only. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261027222612_lumina_browser_friends_and_progress.sql'),'utf8');
const A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const C='cccccccc-cccc-cccc-cccc-cccccccccccc';
const G='dddddddd-dddd-dddd-dddd-dddddddddddd';

test('Lumina Postgres rooms and account saves enforce auth, friendship, turns, hidden cards and optimistic revisions',async(t)=>{
  const {PGlite}=await import('@electric-sql/pglite');
  const db=await PGlite.create();
  async function admin(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
  async function as(uid,action,payload={}){
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||'']);
    await db.exec('set role authenticated');
    const result=await db.query('select public.lumina_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)]);
    return result.rows[0].result;
  }
  async function settled(uid,code){
    await admin("update match_private.lumina_rooms set reveal_until=clock_timestamp()-interval '1 second' where code=$1 and reveal_until is not null",[code]);
    return as(uid,'get',{code});
  }
  async function createActive(){
    const room=await as(A,'create',{friend:B});
    return as(B,'accept',{code:room.code});
  }
  async function deckFor(code){return (await admin('select deck from match_private.lumina_rooms where code=$1',[code])).rows[0].deck;}
  async function clearRooms(){await admin('delete from match_private.lumina_rooms');}
  try{
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key,is_anonymous boolean not null);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated;
      create schema match_private; grant usage on schema match_private to authenticated;
      create table match_private.friend_profiles(user_id uuid primary key references auth.users(id),alias text,presence boolean,last_seen timestamptz);
      create table match_private.friendships(id uuid primary key default gen_random_uuid(),sender uuid references auth.users(id),recipient uuid references auth.users(id),status text);
      alter table match_private.friend_profiles enable row level security;
      alter table match_private.friendships enable row level security;
      revoke all on all tables in schema match_private from public,anon,authenticated;
      insert into auth.users values('${A}',false),('${B}',false),('${C}',false),('${G}',true);
      insert into match_private.friend_profiles values('${A}','Host',false,null),('${B}','Friend',true,now()),('${C}','Other',false,null);
      insert into match_private.friendships(sender,recipient,status) values('${A}','${B}','accepted'),('${A}','${C}','pending');
    `);
    await db.exec(migration);

    await t.test('new tables deny direct reads; wrapper is invoker and auth rejects anonymous/forged ids',async()=>{
      await db.exec('set role anon');
      await assert.rejects(db.query("select public.lumina_action('list','{}')"),/permission denied/);
      await assert.rejects(as(null,'list'),/LUMINA_SIGN_IN_REQUIRED/);
      await assert.rejects(as(G,'list'),/LUMINA_SIGN_IN_REQUIRED/);
      await assert.rejects(as('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','list'),/LUMINA_SIGN_IN_REQUIRED/);
      await as(A,'list');
      await assert.rejects(db.query('select * from match_private.lumina_rooms'),/permission denied/);
      await assert.rejects(db.query('select * from match_private.lumina_progress'),/permission denied/);
      const metadata=await admin("select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='lumina_action'");
      assert.equal(metadata.rows[0].prosecdef,false);
    });

    await t.test('lists only approved friends, requires approval and reuses pending invitation',async()=>{
      const list=await as(A,'list');
      assert.deepEqual(list.friends,[{friend:B,alias:'Friend',online:true}]);
      await assert.rejects(as(A,'create',{friend:C}),/LUMINA_FORBIDDEN/);
      await assert.rejects(as(A,'create',{friend:A}),/LUMINA_FORBIDDEN/);
      const first=await as(A,'create',{friend:B});
      assert.equal(first.status,'pending');assert.equal(first.player,1);assert.deepEqual(first.cards,[]);
      assert.equal((await as(A,'create',{friend:B})).code,first.code);
      assert.equal((await as(B,'create',{friend:A})).code,first.code);
      assert.equal((await as(B,'list')).rooms[0].incoming,true);
      await assert.rejects(as(C,'get',{code:first.code}),/LUMINA_NOT_FOUND/);
      await assert.rejects(as(A,'accept',{code:first.code}),/LUMINA_FORBIDDEN/);
      await as(A,'cancel',{code:first.code});
    });

    await t.test('hidden deck, expected revision, turn ownership and reveal delay are server enforced',async()=>{
      await clearRooms();
      let room=await createActive();const code=room.code;
      assert.equal(room.status,'active');assert.equal(room.cards.length,12);
      assert.ok(room.cards.every(c=>c.art===null&&!c.flipped&&!c.matched));
      assert.equal((await as(A,'create',{friend:B})).code,code,'host resumes the active room instead of creating another');
      assert.equal((await as(B,'create',{friend:A})).code,code,'guest resumes the same active room');
      const roomCount=await admin('select count(*)::integer as count from match_private.lumina_rooms');
      assert.equal(roomCount.rows[0].count,1);
      const deck=await deckFor(code);
      assert.equal(new Set(deck).size,6);
      for(const name of new Set(deck))assert.equal(deck.filter(x=>x===name).length,2);
      await assert.rejects(as(B,'flip',{code,index:0,revision:room.revision}),/LUMINA_NOT_YOUR_TURN/);
      room=await as(A,'flip',{code,index:0,revision:room.revision});
      assert.equal(room.cards.filter(c=>c.art!==null).length,1);
      await assert.rejects(as(A,'flip',{code,index:1,revision:room.revision-1}),/LUMINA_CONFLICT/);
      await assert.rejects(as(A,'flip',{code,index:0,revision:room.revision}),/LUMINA_INVALID/);
      await assert.rejects(as(A,'flip',{code,index:12,revision:room.revision}),/LUMINA_INVALID/);
      const miss=deck.findIndex(name=>name!==deck[0]);
      room=await as(A,'flip',{code,index:miss,revision:room.revision});
      assert.equal(room.cards.filter(c=>c.art!==null).length,2);
      assert.equal(room.moves,1);assert.equal(room.turn,1);assert.ok(room.revealUntil);
      await assert.rejects(as(A,'flip',{code,index:2,revision:room.revision}),/LUMINA_WAIT/);
      room=await settled(B,code);
      assert.equal(room.turn,2);assert.equal(room.cards.filter(c=>c.art!==null).length,0);
      await as(B,'leave',{code});
    });

    await t.test('a full shared round scores exactly once, retains successful turns and freezes result',async()=>{
      await clearRooms();
      let room=await createActive();const code=room.code,deck=await deckFor(code);
      for(const name of new Set(deck)){
        const pair=deck.map((x,i)=>x===name?i:-1).filter(i=>i>=0);
        room=await as(A,'flip',{code,index:pair[0],revision:room.revision});
        room=await as(A,'flip',{code,index:pair[1],revision:room.revision});
        assert.equal(room.turn,1);
        room=await settled(B,code);
      }
      assert.equal(room.status,'complete');assert.deepEqual(room.scores,[6,0]);
      assert.equal(room.moves,6);assert.equal(room.winner,1);assert.ok(room.cards.every(c=>c.matched&&c.art));
      const rev=room.revision;
      assert.equal((await as(A,'get',{code})).revision,rev);
      assert.equal((await as(A,'leave',{code})).status,'complete');
      await assert.rejects(as(A,'flip',{code,index:0,revision:rev}),/LUMINA_FINISHED/);
    });

    await t.test('friend removal revokes game reads/writes and expired invitation cannot activate',async()=>{
      await clearRooms();const invite=await as(A,'create',{friend:B});
      await admin("update match_private.friendships set status='pending' where sender=$1 and recipient=$2",[A,B]);
      await assert.rejects(as(A,'get',{code:invite.code}),/LUMINA_FORBIDDEN/);
      await assert.rejects(as(B,'accept',{code:invite.code}),/LUMINA_FORBIDDEN/);
      assert.deepEqual((await as(A,'list')).rooms,[]);
      await admin("update match_private.friendships set status='accepted' where sender=$1 and recipient=$2",[A,B]);
      await admin("update match_private.lumina_rooms set expires_at=now()-interval '1 minute' where code=$1",[invite.code]);
      const expired=await as(B,'accept',{code:invite.code});
      assert.equal(expired.status,'expired');assert.deepEqual(expired.cards,[]);
    });

    await t.test('decline and cancel require correct party and terminal invitations stay closed',async()=>{
      await clearRooms();const invite=await as(A,'create',{friend:B});
      await assert.rejects(as(A,'decline',{code:invite.code}),/LUMINA_FORBIDDEN/);
      await assert.rejects(as(B,'cancel',{code:invite.code}),/LUMINA_FORBIDDEN/);
      assert.equal((await as(B,'decline',{code:invite.code})).status,'declined');
      assert.equal((await as(B,'accept',{code:invite.code})).status,'declined');
      const second=await as(A,'create',{friend:B});assert.notEqual(second.code,invite.code);
      assert.equal((await as(A,'cancel',{code:second.code})).status,'canceled');
    });

    await t.test('daily invite bound prevents unbounded room creation',async()=>{
      await clearRooms();
      await admin("insert into match_private.lumina_rooms(host,guest,status) select $1::uuid,$2::uuid,'canceled' from generate_series(1,20)",[A,B]);
      await assert.rejects(as(A,'create',{friend:B}),/LUMINA_LIMIT/);
      await clearRooms();
    });

    await t.test('creation and room access hold approval locks until their transaction ends',async()=>{
      await clearRooms();
      await admin('begin');
      try{
        const invitation=await as(A,'create',{friend:B});
        const creationLocks=await admin("select mode from pg_locks where relation='match_private.friendships'::regclass and mode='RowShareLock' and granted");
        assert.ok(creationLocks.rows.length>0,'SELECT FOR SHARE must hold the friendship approval during creation');
        await admin('commit');
        await admin('begin');
        await as(B,'get',{code:invitation.code});
        const accessLocks=await admin("select mode from pg_locks where relation='match_private.friendships'::regclass and mode='RowShareLock' and granted");
        assert.ok(accessLocks.rows.length>0,'room authorization must hold the friendship approval during access');
      }finally{await admin('rollback');}
    });

    await t.test('missing aliases stay null so the frontend can use the selected language',async()=>{
      await clearRooms();
      const invitation=await as(A,'create',{friend:B});
      await admin('update match_private.friend_profiles set alias=null where user_id=$1',[B]);
      try{
        assert.equal((await as(A,'get',{code:invitation.code})).friendAlias,null);
        assert.equal((await as(A,'list')).rooms[0].friendAlias,null);
      }finally{await admin("update match_private.friend_profiles set alias='Friend' where user_id=$1",[B]);}
    });

    const progress={points:20,rounds:2,activeRound:{moves:4,cards:['moon','star','planet','heart','crystal','butterfly'].flatMap(art=>[{art,matched:art==='moon'},{art,matched:art==='moon'}])}};
    await t.test('account save is private, resumes actual board, and rejects stale device overwrites',async()=>{
      assert.deepEqual(await as(A,'progress'),{revision:0,progress:null,updatedAt:null});
      const saved=await as(A,'save_progress',{revision:0,progress});
      assert.equal(saved.revision,1);assert.deepEqual(saved.progress,progress);assert.ok(saved.updatedAt);
      assert.deepEqual((await as(A,'progress')).progress,progress);
      assert.equal((await as(B,'progress')).progress,null);
      await assert.rejects(as(A,'save_progress',{revision:0,progress:{...progress,points:30}}),/LUMINA_CONFLICT/);
      assert.equal((await as(A,'progress')).progress.points,20);
      const ended=await as(A,'save_progress',{revision:1,progress:{points:30,rounds:3,activeRound:null}});
      assert.equal(ended.revision,2);assert.equal(ended.progress.activeRound,null);
    });

    await t.test('save validation rejects malformed decks, half-matched pairs and unwanted fields',async()=>{
      const invalid=[
        {...progress,points:-1}, {...progress,points:1000000001}, {...progress,rounds:1.5},
        {...progress,activeRound:{...progress.activeRound,moves:1000001}},
        {...progress,activeRound:{...progress.activeRound,cards:progress.activeRound.cards.slice(1)}},
        {...progress,activeRound:{...progress.activeRound,cards:progress.activeRound.cards.map((x,i)=>i===0?{...x,matched:false}:x)}},
        {...progress,activeRound:{...progress.activeRound,cards:progress.activeRound.cards.map((x,i)=>i===0?{...x,art:'secret'}:x)}},
        {...progress,activeRound:{...progress.activeRound,flipped:[0]}}, {...progress,adsReward:100},
        {...progress,activeRound:'not a round'}, {...progress,activeRound:{cards:[],moves:0}},
      ];
      for(const value of invalid)await assert.rejects(as(A,'save_progress',{revision:2,progress:value}),/LUMINA_INVALID/);
      assert.equal((await as(A,'progress')).revision,2);
    });
  }finally{await db.close();}
});

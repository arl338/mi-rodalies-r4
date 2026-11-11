const assert=require('node:assert/strict');
const E=require('../engine.js');
const now=Math.floor(Date.parse('2026-11-12T08:00:00Z')/1000);
const trip='5115J77512R4', start=now+600;
const t={id:trip,n:'77512',l:'R4',day:'2026-11-12',s:[['78710',start,start],['78805',start+2600,start+2600]]};
const leg={t,from:'78710',to:'78805',depart:start,arrive:start+2600};
function state(board=[],pos=[],can=[]){return E.enrichLeg(leg,board,pos,can,now);}
const radar={updatedAt:now*1000,departures:[{
  trainCode:'77512',tripId:trip,line:'R4',stationCode:'78710',
  plannedTime:start*1000, delayMinutes:4,timeType:'ESTIMATED',
  timestamp:now*1000,platform:'2',circulationState:'RUNNING'
}]};
const b=E.normalizeBoard(radar,'ADIF/RadarDeTrenes',now);
assert.equal(b.length,1);assert.equal(b[0].number,'77512');assert.equal(b[0].age,0);
assert.equal(b[0].estimated,start+240);assert.equal(state(b).estimated,start+240);
assert.equal(state(b).platform,'2');
const bStale=E.normalizeBoard({updatedAt:(now-600)*1000,departures:[{...radar.departures[0],timestamp:(now-600)*1000}]},'Radar',now);
assert.equal(state(bStale).estimated,null,'Stale station estimate must not be shown');
const bWrong=E.normalizeBoard({updatedAt:now*1000,departures:[{...radar.departures[0],stationCode:'78700'}]},'Radar',now);
assert.equal(state(bWrong).estimated,null,'Nearby but different ADIF station must not match');
const bWrongTrip=E.normalizeBoard({updatedAt:now*1000,departures:[{...radar.departures[0],tripId:'another-trip'}]},'Radar',now);
assert.equal(state(bWrongTrip).estimated,null,'Mismatched explicit trip ID must not fall back to train number');
const bNum=E.normalizeBoard({updatedAt:now*1000,departures:[{...radar.departures[0],tripId:''}]},'Radar',now);
assert.equal(state(bNum).estimated,start+240,'number+line+planned+station may match when trip id is not supplied');
const conflicting=E.normalizeBoard({updatedAt:now*1000,departures:[{...radar.departures[0],delayMinutes:18,timestamp:(now-20)*1000}]},'Other',now);
assert.equal(state([...b,...conflicting]).conflict,true);assert.equal(state([...b,...conflicting]).estimated,null,'Do not choose an arbitrary ETA on contradiction');
const ps=E.normalizePositions({updatedAt:new Date(now*1000).toISOString(),trains:[{trainCode:'77512',tripId:trip,type:'commuter',line:'R4',timestamp:new Date((now-15)*1000).toISOString()}]},'Radar',now);
assert.equal(ps.length,1);assert.equal(ps[0].age,15);
assert.equal(state([],ps).state,'live');
const latePos=E.normalizePositions({trains:[{trainCode:'77512',tripId:trip,type:'commuter',timestamp:new Date((now-150)*1000).toISOString()}]},'Radar',now);
assert.equal(state([],latePos).state,'scheduled');
const ld=E.normalizePositions({trains:[{trainCode:'77512',tripId:trip,type:'long_distance',timestamp:new Date(now*1000).toISOString()}]},'Radar',now);
assert.equal(ld.length,0,'Never treat long-distance trains as R4');
const future=E.normalizePositions({trains:[{trainCode:'77512',tripId:trip,type:'commuter',timestamp:new Date((now+120)*1000).toISOString()}]},'Radar',now);
assert.equal(future[0].age,null,'Bad clock must not yield fresh telemetry');
const cn=E.normalizeCancels({trains:[{trip_id:trip,train_number:'77512',product:'R4',service_day:'2026-11-12'}]});
assert.equal(state([],[],cn).state,'cancelled');
assert.equal(state([],ps,cn).state,'conflict');
const cnBad=E.normalizeCancels({trains:[{trip_id:'other',train_number:'77512',product:'R4',service_day:'2026-11-12'}]});
assert.equal(state([],[],cnBad).state,'scheduled');
console.log('OK: RadarDeTrenes and Valfiguer schemas, timestamps, line/train matching, stale, conflict and cancellation');
assert.deepEqual(E.normalizeBoard({departures:[null,{},42]},'Radar',now),[]);
assert.deepEqual(E.normalizePositions({trains:[null,{},42]},'Radar',now),[]);
assert.deepEqual(E.normalizeCancels({trains:[null,{},42]}),[]);
assert.deepEqual(E.alertsForLines({alerts:[null,{text:'',lines:[null]}]},new Set(['R4'])),[]);
console.log('OK: malicious or malformed empty feed rows degrade safely');

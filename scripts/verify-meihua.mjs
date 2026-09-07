import assert from 'node:assert/strict';
import {cycle,structure,castTimeOrdinals,castCount,relation} from '../books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs';

const plum=castTimeOrdinals({yearBranch:5,month:12,day:17,hourBranch:9});
assert.deepEqual([plum.upper,plum.lower,plum.movingLine],[2,3,1]);
assert.deepEqual(plum.changed,{upper:2,lower:7});
assert.deepEqual(plum.mutual,{upper:1,lower:5});
assert.deepEqual([plum.body,plum.use],[2,3]);
const peony=castTimeOrdinals({yearBranch:6,month:3,day:16,hourBranch:4});
assert.deepEqual([peony.upper,peony.lower,peony.movingLine],[1,5,5]);
assert.deepEqual(peony.changed,{upper:3,lower:5});
assert.deepEqual(peony.mutual,{upper:1,lower:1});
// The knocking example is a separate two-group method, not count-time.
const knock=structure({upper:cycle(1,8),lower:cycle(5,8),movingLine:cycle(1+5+10,6)});
assert.deepEqual([knock.upper,knock.lower,knock.movingLine],[1,5,4]);
assert.deepEqual(knock.changed,{upper:5,lower:5});
const count=castCount({count:17,hourBranch:10});
assert.deepEqual([count.upper,count.lower,count.movingLine],[1,2,3]);
assert.equal(count.trace.movingTotal,27);
assert.equal(cycle(8,8),8); assert.equal(cycle(12,6),6);
assert.equal(relation(2,3),'用克体'); assert.equal(relation(6,1),'用生体');
assert.equal(relation(3,4),'用生体'); assert.equal(relation(1,6),'体生用');
assert.equal(relation(3,1),'体克用'); assert.equal(relation(1,2),'比和');
let invariantCases=0;
for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++)for(let movingLine=1;movingLine<=6;movingLine++){
  const s=structure({upper,lower,movingLine});
  assert.equal(s.lines.filter((v,i)=>v!==s.changedLines[i]).length,1);
  const reverse=structure({...s.changed,movingLine});
  assert.deepEqual(reverse.changed,{upper,lower});
  assert.equal(s.bodyPosition,movingLine<=3?'upper':'lower');
  for(const n of Object.values(s.mutual))assert.ok(n>=1&&n<=8);
  invariantCases++;
}
// Mid-line change distinguishes traditional pure-hexagram exception from standard mutual.
const pure=structure({upper:1,lower:1,movingLine:3});
const standard=structure({upper:1,lower:1,movingLine:3,mutualPolicy:'standard'});
assert.notDeepEqual(pure.mutual,standard.mutual);
assert.equal(pure.mutualFrom,'changed'); assert.equal(standard.mutualFrom,'original');
for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'3'])assert.throws(()=>castCount({count:n,hourBranch:1}));
assert.throws(()=>castCount({count:Number.MAX_SAFE_INTEGER,hourBranch:12}));
assert.throws(()=>castTimeOrdinals({yearBranch:2026,month:9,day:7,hourBranch:4}));
assert.throws(()=>structure({upper:1,lower:1,movingLine:[2,5]}));
assert.throws(()=>structure({upper:1,lower:1,movingLine:1,mutualPolicy:'unknown'}));
console.log(JSON.stringify({status:'passed',historicalArithmeticFixtures:3,countFixture:1,invariantCases,edgeAndInvalidInputs:'passed'}));

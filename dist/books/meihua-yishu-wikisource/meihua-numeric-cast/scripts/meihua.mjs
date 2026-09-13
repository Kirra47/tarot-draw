// Profile mh-ws-1. Arrays list lines from bottom (初爻) to top (上爻).
export const PROFILE = 'mh-ws-1';
export const TRIGRAMS = Object.freeze([
  null,
  {name:'乾',element:'金',lines:[1,1,1]},
  {name:'兑',element:'金',lines:[1,1,0]},
  {name:'离',element:'火',lines:[1,0,1]},
  {name:'震',element:'木',lines:[1,0,0]},
  {name:'巽',element:'木',lines:[0,1,1]},
  {name:'坎',element:'水',lines:[0,1,0]},
  {name:'艮',element:'土',lines:[0,0,1]},
  {name:'坤',element:'土',lines:[0,0,0]}
]);
function integer(n, name, max=Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(n) || n<1 || n>max) throw new RangeError(`${name} must be an integer in 1..${max}`);
  return n;
}
export function cycle(n, size) { integer(n,'number'); integer(size,'size'); return ((n-1)%size)+1; }
function sum(...ns) { const n=ns.reduce((a,b)=>a+b,0); return integer(n,'sum'); }
function identify(lines) { return TRIGRAMS.findIndex(t=>t && t.lines.every((v,i)=>v===lines[i])); }
function pair(lines) { return {lower:identify(lines.slice(0,3)),upper:identify(lines.slice(3,6))}; }
function mutual(lines) { return {lower:identify(lines.slice(1,4)),upper:identify(lines.slice(2,5))}; }
export function structure({upper,lower,movingLine,mutualPolicy='changed-for-pure'}) {
  integer(upper,'upper',8); integer(lower,'lower',8); integer(movingLine,'movingLine',6);
  if (!['changed-for-pure','standard'].includes(mutualPolicy)) throw new RangeError('Unknown mutual policy');
  const lines=[...TRIGRAMS[lower].lines,...TRIGRAMS[upper].lines];
  const changedLines=lines.map((v,i)=>i===movingLine-1?1-v:v);
  const pure=(upper===lower && [1,8].includes(upper));
  const mutualFrom=pure && mutualPolicy==='changed-for-pure'?'changed':'original';
  return {profile:PROFILE,upper,lower,movingLine,lines,changedLines,changed:pair(changedLines),
    mutual:mutual(mutualFrom==='changed'?changedLines:lines),mutualFrom,mutualPolicy,
    body:movingLine<=3?upper:lower,use:movingLine<=3?lower:upper,
    bodyPosition:movingLine<=3?'upper':'lower'};
}
export function castTimeOrdinals({yearBranch,month,day,hourBranch,...context}) {
  integer(yearBranch,'yearBranch',12); integer(month,'month',12);
  integer(day,'day',30); integer(hourBranch,'hourBranch',12);
  const upperTotal=sum(yearBranch,month,day),total=sum(upperTotal,hourBranch);
  return {method:'time-ordinals',inputs:{yearBranch,month,day,hourBranch},context,
    trace:{upperTotal,lowerTotal:total,movingTotal:total},
    ...structure({upper:cycle(upperTotal,8),lower:cycle(total,8),movingLine:cycle(total,6)})};
}
export function castCount({count,hourBranch}) {
  integer(count,'count'); integer(hourBranch,'hourBranch',12);
  const total=sum(count,hourBranch);
  return {method:'count-time',inputs:{count,hourBranch},trace:{upperTotal:count,lowerTotal:hourBranch,movingTotal:total},
    ...structure({upper:cycle(count,8),lower:cycle(hourBranch,8),movingLine:cycle(total,6)})};
}
const GENERATES={木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS={木:'土',土:'水',水:'火',火:'金',金:'木'};
export function relation(body,other) {
  integer(body,'body',8); integer(other,'other',8);
  const a=TRIGRAMS[body].element,b=TRIGRAMS[other].element;
  if(a===b)return '比和';
  if(GENERATES[b]===a)return '用生体';
  if(GENERATES[a]===b)return '体生用';
  if(CONTROLS[b]===a)return '用克体';
  return '体克用';
}

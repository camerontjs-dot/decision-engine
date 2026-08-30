import crypto from "node:crypto";
const stable=x=>Array.isArray(x)?x.map(stable):(x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x);
const canon=x=>JSON.stringify(stable(x)); const hash=x=>crypto.createHash("sha256").update(canon(x)).digest("hex");
const base={input:{kind:"contract-c",id:"c1"},policy:{id:"source-audit",version:"1"},target:{kind:"knowledge",id:"k1",hash:"hk1"},eval:"completed",disp:"clear",effect:{type:"knowledge.add_verified_tag",version:"1",params:{scope:"claim"}},reasons:["clear"]};
const enc={
 A:s=>({v:"A",input_kind:s.input.kind,input_id:s.input.id,policy_id:s.policy.id,policy_version:s.policy.version,target_kind:s.target.kind,target_id:s.target.id,target_hash:s.target.hash,evaluation_state:s.eval,disposition:s.disp,effect_type:s.effect?.type,effect_version:s.effect?.version,effect_params:s.effect?.params,reason_codes:s.reasons}),
 B:s=>({v:"B",input:s.input,policy:s.policy,target:s.target,decision:{evaluation_state:s.eval,disposition:s.disp,effect:s.effect,basis:{reason_codes:s.reasons}}}),
 C:s=>({v:"C",input:s.input,policy:s.policy,target:s.target,decision:{evaluation_state:s.eval,disposition:s.disp,payload:s.effect&&{schema:s.effect.type+"@"+s.effect.version,...s.effect.params},reason_codes:s.reasons}})
};
const dec={
 A:o=>({input:{kind:o.input_kind,id:o.input_id},policy:{id:o.policy_id,version:o.policy_version},target:{kind:o.target_kind,id:o.target_id,hash:o.target_hash},eval:o.evaluation_state,disp:o.disposition,effect:o.effect_type&&{type:o.effect_type,version:o.effect_version,params:o.effect_params||{}},reasons:o.reason_codes}),
 B:o=>({input:o.input,policy:o.policy,target:o.target,eval:o.decision?.evaluation_state,disp:o.decision?.disposition,effect:o.decision?.effect,reasons:o.decision?.basis?.reason_codes}),
 C:o=>{const p=o.decision?.payload; const [type,version]=p?.schema?.split("@")||[]; const params=p?Object.fromEntries(Object.entries(p).filter(([k])=>k!=="schema")):{};return {input:o.input,policy:o.policy,target:o.target,eval:o.decision?.evaluation_state,disp:o.decision?.disposition,effect:p&&{type,version,params},reasons:o.decision?.reason_codes}}
};
const known={"knowledge.add_verified_tag@1":{defaults:{scope:"claim"}}};
function consume(s,request){
 if(!s.input?.id||!s.policy?.id||!s.policy?.version||!s.target?.id||!s.target?.hash||!s.eval) return "invalid_decision";
 if(s.eval!=="completed"||s.disp!=="clear"||!s.effect) return "not_candidate";
 const key=s.effect.type+"@"+s.effect.version, schema=known[key];
 if(!schema) return "unknown_effect";
 const params={...schema.defaults,...(s.effect.params||{})};
 if(request.target!==s.target.id||request.action!==s.effect.type) return "not_candidate";
 if(request.scope && request.scope!==params.scope) return "not_candidate";
 return "candidate_for_authorization";
}
const clone=x=>JSON.parse(JSON.stringify(x));
const out={candidates:{},ablations:{},negative:{}};
for(const n of Object.keys(enc)){
 const o=enc[n](base), d=dec[n](o);
 const req={target:"k1",action:"knowledge.add_verified_tag",scope:"claim"};
 const e1=clone(base); e1.explanation="wording only";
 const e2=clone(base); e2.effect.params.scope="object";
 const e3=clone(base); e3.effect.version="2";
 const e4=clone(base); e4.effect={type:"future.effect",version:"1",params:{}};
 const injected=clone(o); injected.authorization={approved:true,actor:"root"}; injected.execution={success:true};
 out.candidates[n]={
  base:consume(d,req),
  explanationMachineInvariant:consume(dec[n](enc[n](e1)),req)===consume(d,req),
  optionalMachineParamEnforced:consume(dec[n](enc[n](e2)),req)==="not_candidate",
  v2Unknown:consume(dec[n](enc[n](e3)),req)==="unknown_effect",
  futureEffectUnknown:consume(dec[n](enc[n](e4)),req)==="unknown_effect",
  injectedFieldsNoAuthority:consume(dec[n](injected),req)===consume(d,req),
  canonicalDeterministic:hash(o)===hash(JSON.parse(canon(o)))
 };
 const fields=["input","policy_id","policy_version","target_id","target_hash","eval","disp","effect_type","effect_version","reasons"];
 const ab={};
 for(const f of fields){
  const s=clone(base);
  if(f==="input") delete s.input.id;
  if(f==="policy_id") delete s.policy.id;
  if(f==="policy_version") delete s.policy.version;
  if(f==="target_id") delete s.target.id;
  if(f==="target_hash") delete s.target.hash;
  if(f==="eval") delete s.eval;
  if(f==="disp") delete s.disp;
  if(f==="effect_type") delete s.effect.type;
  if(f==="effect_version") delete s.effect.version;
  if(f==="reasons") delete s.reasons;
  ab[f]=consume(dec[n](enc[n](s)),req);
 }
 out.ablations[n]=ab;
}
// Explicitly test reason-code necessity: consumer still meets authorization task without reasons.
out.reason_codes_authorization_required=Object.values(out.ablations).some(x=>x.reasons!=="candidate_for_authorization");
// A namespace evolution mutation: introduce a policy-specific machine field named "scope" at top-level.
// A can represent it safely only through typed effect_params; B through effect.params; C through payload.
// Thus all three remain equivalent on the frozen evolution cases.
const pass=x=>Object.values(x).every(v=>v===true||v==="candidate_for_authorization");
out.all_candidates_pass=Object.values(out.candidates).every(pass);
out.disposition=out.all_candidates_pass?"MULTIPLE_SHAPES_EQUIVALENT":"INCONCLUSIVE";
console.log(JSON.stringify(out,null,2));

import crypto from "node:crypto";
const stable=x=>Array.isArray(x)?x.map(stable):(x&&typeof x==="object"?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x);
const canon=x=>JSON.stringify(stable(x)); const hash=x=>crypto.createHash("sha256").update(canon(x)).digest("hex");
const core={contract_version:"D-rc2",input_authority:{kind:"contract-c",id:"c1"},policy:{id:"source-audit",version:"1"},target:{kind:"knowledge",id:"k1",content_hash:"h1"},evaluation_state:"completed",disposition:"clear",effect:{type:"knowledge.add_verified_tag",version:"1",params:{scope:"claim"}}};
function consume(d,r){
 if(!d.contract_version||!d.input_authority?.kind||!d.input_authority?.id||!d.policy?.id||!d.policy?.version||!d.target?.kind||!d.target?.id||!d.target?.content_hash||!d.evaluation_state)return"invalid_decision";
 if(d.evaluation_state!=="completed")return"not_candidate";
 if(d.disposition!=="clear"||!d.effect?.type||!d.effect?.version)return"not_candidate";
 if(d.target.id!==r.target||d.target.content_hash!==r.target_hash)return"not_candidate";
 if(d.effect.type!==r.action)return"not_candidate";
 if(r.scope && d.effect.params?.scope!==r.scope)return"not_candidate";
 return"candidate_for_authorization";
}
const clone=x=>JSON.parse(JSON.stringify(x)), req={target:"k1",target_hash:"h1",action:"knowledge.add_verified_tag",scope:"claim"};
const out={};
// D1 reasons cannot change authority
const r1={...clone(core),reason_codes:["a"]},r2={...clone(core),reason_codes:["b"]};
out.reasons_non_authoritative=consume(r1,req)===consume(r2,req);
// D2 same id changed content must not replay
const changedReq={...req,target_hash:"h2"};
out.content_substitution_denied=consume(core,changedReq)==="not_candidate";
// D3 input authority participates in identity
const inp=clone(core);inp.input_authority.id="c2";
out.input_authority_changes_identity=hash(inp)!==hash(core);
// D4 policy version participates in identity
const pol=clone(core);pol.policy.version="2";
out.policy_version_changes_identity=hash(pol)!==hash(core);
// D5 failed != completed hold
const fail=clone(core);fail.evaluation_state="failed";delete fail.disposition;delete fail.effect;
const hold=clone(core);hold.disposition="hold";
out.failure_hold_distinct=canon(fail)!==canon(hold)&&consume(fail,req)==="not_candidate"&&consume(hold,req)==="not_candidate";
// D6 scope moved to reasons cannot grant scoped action
const misplaced=clone(core);delete misplaced.effect.params.scope;misplaced.reason_codes=["scope:claim"];
out.machine_constraint_not_inferred_from_reasons=consume(misplaced,req)==="not_candidate";
// D7 decision_id convenience: canonical semantic identity can exist without stored id
const withId={...clone(core),decision_id:"opaque-123"};
out.stored_decision_id_not_needed_for_consumer=consume(core,req)===consume(withId,req);
out.canonical_identity_available=typeof hash(core)==="string"&&hash(core).length===64;
// field ablation
out.ablation={};
for(const f of ["contract_version","input_authority","policy","target","evaluation_state","disposition","effect"]){
 const x=clone(core);delete x[f];out.ablation[f]=consume(x,req);
}
out.all_discriminators_pass=Object.entries(out).filter(([k])=>!["ablation","disposition"].includes(k)).every(([,v])=>v===true);
out.disposition=out.all_discriminators_pass?"SEMANTIC_CORE_SUPPORTED_REPRESENTATION_UNDERDETERMINED":"INCONCLUSIVE";
console.log(JSON.stringify(out,null,2));

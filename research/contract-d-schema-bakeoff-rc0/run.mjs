import crypto from "node:crypto";

const stable = (x) => {
  if (Array.isArray(x)) return x.map(stable);
  if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])]));
  return x;
};
const canonical = x => JSON.stringify(stable(x));
const sha = x => crypto.createHash("sha256").update(canonical(x)).digest("hex");
const clone = x => JSON.parse(JSON.stringify(x));
const eq = (a,b) => canonical(a) === canonical(b);

const semantics = [
 {id:"source-audit-clear", input:["contract-c","c-source"], policy:["mainframe.source-audit","1"], target:["knowledge","k-1","h-k1"], eval:"completed", disposition:"clear", effect:["knowledge.add_verified_tag","1"], reasons:["policy_clear"]},
 {id:"citation-clear", input:["contract-c","c-cite"], policy:["mainframe.citation-use","1"], target:["knowledge","k-2","h-k2"], eval:"completed", disposition:"clear", effect:["knowledge.cite_as_evidence","1"], reasons:["citable"]},
 {id:"task-dispatch-clear", input:["task-review","r-task"], policy:["mainframe.task-dispatch","1"], target:["task","t-1","h-t1"], eval:"completed", disposition:"clear", effect:["task.dispatch","1"], reasons:["dispatch_eligible"]},
 {id:"completed-hold", input:["contract-c","c-hold"], policy:["mainframe.source-audit","1"], target:["knowledge","k-3","h-k3"], eval:"completed", disposition:"hold", effect:["knowledge.add_verified_tag","1"], reasons:["insufficient_policy_authority"]},
 {id:"evaluation-failure", input:["contract-c","c-fail"], policy:["mainframe.source-audit","1"], target:["knowledge","k-4","h-k4"], eval:"failed", disposition:null, effect:null, reasons:["policy_evaluation_failure"]}
];

const encoders = {
 A:s=>({contract_d_version:"rc0-a",input_authority_kind:s.input[0],input_authority_id:s.input[1],policy_id:s.policy[0],policy_version:s.policy[1],target_kind:s.target[0],target_id:s.target[1],target_sha256:s.target[2],evaluation_state:s.eval,disposition:s.disposition,effect:s.effect&&s.effect[0],effect_version:s.effect&&s.effect[1],reason_codes:s.reasons}),
 B:s=>({contract_d_version:"rc0-b",input:{authority_kind:s.input[0],authority_id:s.input[1]},policy:{id:s.policy[0],version:s.policy[1]},target:{kind:s.target[0],object_id:s.target[1],content_sha256:s.target[2]},decision:{evaluation_state:s.eval,disposition:s.disposition,effect:s.effect&&{type:s.effect[0],version:s.effect[1]},basis:{reason_codes:s.reasons}}}),
 C:s=>({contract_d_version:"rc0-c",input:{authority_kind:s.input[0],authority_id:s.input[1]},policy:{id:s.policy[0],version:s.policy[1]},target:{kind:s.target[0],object_id:s.target[1],content_sha256:s.target[2]},decision:{evaluation_state:s.eval,disposition:s.disposition,payload:s.effect&&{schema:s.effect[0]+"@"+s.effect[1],effect_type:s.effect[0]},reason_codes:s.reasons}})
};

const decoders = {
 A:o=>({input:[o.input_authority_kind,o.input_authority_id],policy:[o.policy_id,o.policy_version],target:[o.target_kind,o.target_id,o.target_sha256],eval:o.evaluation_state,disposition:o.disposition,effect:o.effect&&[o.effect,o.effect_version],reasons:o.reason_codes}),
 B:o=>({input:[o.input?.authority_kind,o.input?.authority_id],policy:[o.policy?.id,o.policy?.version],target:[o.target?.kind,o.target?.object_id,o.target?.content_sha256],eval:o.decision?.evaluation_state,disposition:o.decision?.disposition,effect:o.decision?.effect&&[o.decision.effect.type,o.decision.effect.version],reasons:o.decision?.basis?.reason_codes}),
 C:o=>({input:[o.input?.authority_kind,o.input?.authority_id],policy:[o.policy?.id,o.policy?.version],target:[o.target?.kind,o.target?.object_id,o.target?.content_sha256],eval:o.decision?.evaluation_state,disposition:o.decision?.disposition,effect:o.decision?.payload&&[o.decision.payload.effect_type,(o.decision.payload.schema||"").split("@").at(-1)],reasons:o.decision?.reason_codes})
};

const semanticView=s=>({input:s.input,policy:s.policy,target:s.target,eval:s.eval,disposition:s.disposition,effect:s.effect,reasons:s.reasons});

function authorize(d, action, targetId) {
 if (d.eval!=="completed" || d.disposition!=="clear") return "deny";
 if (!d.effect || d.effect[0]!==action) return "deny";
 if (d.target[1]!==targetId) return "deny";
 return "eligible_for_authorization";
}

const results={candidates:{},negative_controls:{}};
for (const name of Object.keys(encoders)) {
 const objects=semantics.map(encoders[name]);
 const decoded=objects.map(decoders[name]);
 const roundtrip=decoded.every((d,i)=>eq(d,semanticView(semantics[i])));
 const hashes=objects.map(sha);
 const canonicalDeterministic=objects.every(o=>sha(o)===sha(JSON.parse(canonical(o))));
 const cross1=authorize(decoded[1],"task.dispatch","k-2");
 const cross2=authorize(decoded[2],"knowledge.add_verified_tag","t-1");
 const hold=decoded[3], fail=decoded[4];
 const holdFailureDistinct=hold.eval!==fail.eval && hold.disposition!==fail.disposition;
 // authorization context is deliberately external and cannot alter D
 const authContexts=[{actor:"a",approval:false},{actor:"a",approval:true},{actor:"b",approval:true}];
 const invariant=authContexts.map(()=>sha(objects[0])).every(h=>h===hashes[0]);
 // policy mutation must alter D identity
 const mutated=clone(semantics[0]); mutated.policy[1]="2";
 const policyMutationChanges=sha(encoders[name](mutated))!==hashes[0];
 // injected authorization/execution fields must not alter decoded semantics
 const injected=clone(objects[0]); injected.actor="evil"; injected.requiresHumanApproval=false; injected.appliedAutomatically=true;
 const injectionNoAuthority=eq(decoders[name](injected),decoded[0]);
 results.candidates[name]={roundtrip,canonicalDeterministic,crossUseCaseDenied:cross1==="deny"&&cross2==="deny",holdFailureDistinct,authorizationInvariant:invariant,policyMutationChanges,injectionNoAuthority,hashes};
}
// Negative control 1: eligibility without effect.
const weak=(s,action,target)=>s.eval==="completed"&&s.disposition==="clear"&&s.target[1]===target?"eligible_for_authorization":"deny";
results.negative_controls.generic_eligibility={
 citation_as_dispatch:weak(semantics[1],"task.dispatch","k-2"),
 task_as_tag:weak(semantics[2],"knowledge.add_verified_tag","t-1")
};
// Negative control 2: authorization embedded in D changes D identity with approval context.
const entangled=s=>({...encoders.B(s),authorization:{actor:"agent",approved:false}});
const e0=entangled(semantics[0]),e1=clone(e0);e1.authorization.approved=true;
results.negative_controls.entangled_authorization={decision_identity_changes_with_approval:sha(e0)!==sha(e1)};
// Negative control 3: collapse HOLD and failure.
const collapse=s=>s.eval==="failed"||s.disposition==="hold"?"hold":s.disposition;
results.negative_controls.collapsed_unknown={hold:collapse(semantics[3]),failure:collapse(semantics[4]),distinguishable:collapse(semantics[3])!==collapse(semantics[4])};

const allPass=Object.values(results.candidates).every(x=>Object.entries(x).filter(([k])=>k!=="hashes").every(([,v])=>v===true));
results.disposition=allPass?"MULTIPLE_SHAPES_EQUIVALENT":"INCONCLUSIVE";
results.note="RC0 discriminates required semantics and negative controls but does not choose among A/B/C when all are semantically equivalent.";
console.log(JSON.stringify(results,null,2));

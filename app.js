const q=s=>document.querySelector(s);
const all=s=>[...document.querySelectorAll(s)];
const state={mode:"stable"};

function setStable(){
 state.mode="stable";
 q("#heroRes").textContent="76 / 100";q("#heroRisk").textContent="18%";q("#heroRisk").style.color="var(--green)";q("#heroStatus").textContent="Monitoring";
 q("#kRisk").textContent="18%";q("#kNodes").textContent="0";q("#kPeople").textContent="0";q("#kTime").textContent="—";
 q("#mainRiskBar").style.width="18%";q("#mainRiskBar").style.background="linear-gradient(90deg,#37b276,#68d59a)";
 q("#cascadeNarrative").textContent="No critical cascade is active. Ω-CORE is continuously monitoring infrastructure dependencies and weak signals.";
 q("#fragile").textContent="Substation 4";q("#fragileDesc").textContent="High dependency centrality across water and communications.";
 q("#action").textContent="Standby";q("#actionDesc").textContent="No immediate intervention is required.";
 q("#improve").textContent="—";q("#improveDesc").textContent="Displayed after a cascade and intervention are evaluated.";
}
function simulate(){
 state.mode="cascade";
 q("#heroRes").textContent="47 / 100";q("#heroRisk").textContent="84%";q("#heroRisk").style.color="var(--red)";q("#heroStatus").textContent="Cascade detected";
 q("#kRisk").textContent="84%";q("#kNodes").textContent="4";q("#kPeople").textContent="8,420";q("#kTime").textContent="1h 42m";
 q("#mainRiskBar").style.width="84%";q("#mainRiskBar").style.background="linear-gradient(90deg,#e8a151,#db5058)";
 q("#cascadeNarrative").textContent="Extreme rainfall may flood Road B, isolate Substation 4, interrupt Pump 2 and threaten Hospital A water continuity. Ω-CORE identifies Pump 2 as the highest-leverage protection point.";
 q("#fragile").textContent="Pump 2";q("#fragileDesc").textContent="Protecting this node prevents the most important downstream hospital impact.";
 q("#action").textContent="Backup power → Pump 2";q("#actionDesc").textContent="Fastest targeted action with the highest downstream protection.";
 q("#improve").textContent="84% → 23%";q("#improveDesc").textContent="Projected cascade risk after the recommended intervention.";
 q("#godview").scrollIntoView({behavior:"smooth"});
}
function breakChain(){
 if(state.mode==="stable") simulate();
 state.mode="controlled";
 q("#heroRes").textContent="78 / 100";q("#heroRisk").textContent="23%";q("#heroRisk").style.color="var(--green)";q("#heroStatus").textContent="Cascade controlled";
 q("#kRisk").textContent="23%";q("#kNodes").textContent="1";q("#kPeople").textContent="1,310";q("#kTime").textContent="Stabilized";
 q("#mainRiskBar").style.width="23%";q("#mainRiskBar").style.background="linear-gradient(90deg,#37b276,#68d59a)";
 q("#cascadeNarrative").textContent="BREAK THE CHAIN protects Pump 2 with temporary backup power. The hospital water branch remains operational even if the upstream substation stays unstable.";
 q("#action").textContent="Generator at Pump 2";q("#actionDesc").textContent="Maintains water continuity while upstream restoration continues.";
 q("#improve").textContent="61% risk reduction";q("#improveDesc").textContent="Estimated reduction from 84% to 23%.";
}
function recover(){
 state.mode="recovery";
 q("#heroRes").textContent="86 / 100";q("#heroRisk").textContent="12%";q("#heroRisk").style.color="var(--green)";q("#heroStatus").textContent="Optimized recovery";
 q("#kRisk").textContent="12%";q("#kNodes").textContent="0";q("#kPeople").textContent="280";q("#kTime").textContent="2h 18m";
 q("#mainRiskBar").style.width="12%";q("#mainRiskBar").style.background="linear-gradient(90deg,#37b276,#68d59a)";
 q("#cascadeNarrative").textContent="Cascading Recovery restores Substation 4 first because this single upstream repair re-energizes Pump 2, supports Hospital A and improves communications.";
 q("#fragile").textContent="No critical single point";q("#fragileDesc").textContent="Network vulnerability is reduced after optimized restoration.";
 q("#action").textContent="Restore Substation 4 first";q("#actionDesc").textContent="Highest system-wide recovery benefit.";
 q("#improve").textContent="3+ services";q("#improveDesc").textContent="Recovered through one high-value upstream repair.";
}
q("#heroSim").onclick=simulate;q("#simBtn").onclick=simulate;q("#breakBtn").onclick=breakChain;q("#recoverBtn").onclick=recover;q("#resetBtn").onclick=setStable;

const rain=q("#rain"),temp=q("#temp"),backup=q("#backup");
function updateLabels(){q("#rainLabel").textContent=rain.value+" mm";q("#tempLabel").textContent="+"+Number(temp.value).toFixed(1)+"°C";q("#backupLabel").textContent=["None","Partial","Full critical"][backup.value]}
[rain,temp,backup].forEach(x=>x.oninput=updateLabels);updateLabels();
q("#scenarioBtn").onclick=()=>{
 const r=+rain.value,t=+temp.value,b=+backup.value;
 let risk=Math.round(Math.max(8,Math.min(96,(r-40)*.42+t*8-b*18)));
 let people=Math.round(risk*82);
 let res=Math.round(Math.max(22,Math.min(94,92-risk*.52+b*7)));
 q("#sRisk").textContent=risk+"%";q("#sPeople").textContent=people.toLocaleString();q("#sRes").textContent=res;
 q("#sNarrative").textContent=risk>70?"High cascade stress. Critical backup and intervention planning are strongly recommended.":risk>40?"Moderate-to-high stress. Redundancy meaningfully reduces the chance of downstream service loss.":"Low-to-moderate stress. Current backup capacity keeps most critical dependencies within the resilient range.";
};

const modeData={
 personal:["Personal Guardian","Shows clear personal risk, safe routes, power and water continuity, hospital accessibility, shelter guidance, preparedness gaps and what to do next — without overwhelming the user with engineering data."],
 family:["Family Resilience","Explains each family member's current safety, mobility and medication needs, meeting points, school status, evacuation support and who requires earlier assistance."],
 expert:["Engineering Intelligence","Shows causal graphs, failure probabilities, dependency centrality, uncertainty, evidence, intervention alternatives, reasons alternatives were rejected and recovery sequencing."],
 authority:["Authority Command View","Shows population exposure, critical services, intervention priority, resource allocation, approval status, resilience improvement and system-wide recovery value."]
};
all(".mode").forEach(b=>b.onclick=()=>{all(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");const d=modeData[b.dataset.mode];q("#modeTitle").textContent=d[0];q("#modeText").textContent=d[1]});

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("show")}),{threshold:.12});
all(".reveal").forEach(el=>io.observe(el));
setTimeout(()=>all(".reveal").slice(0,2).forEach(el=>el.classList.add("show")),100);
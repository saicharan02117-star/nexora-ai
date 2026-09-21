const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state={lat:null,lon:null,weather:null,hourly:null,place:"Your area",language:"English"};

function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,n))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(t){$("#toastText").textContent=t;$("#toast").classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>$("#toast").classList.remove("show"),2600)}
function setView(v){$$(".view").forEach(x=>x.classList.remove("active"));const target=$("#view-"+v);if(target)target.classList.add("active");$$(".navItem").forEach(x=>x.classList.toggle("active",x.dataset.view===v));window.scrollTo({top:0,behavior:"smooth"})}
$$(".navItem").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$("[data-jump]").forEach(b=>b.onclick=()=>setView(b.dataset.jump));
$("#languageSelect").onchange=e=>{state.language=e.target.value;$("#ctxLanguage").textContent=state.language;toast("Language preference: "+state.language)};

function weatherCodeLabel(code){
 if(code===0)return"Clear"; if([1,2].includes(code))return"Mostly clear"; if(code===3)return"Overcast";
 if([45,48].includes(code))return"Fog"; if(code>=51&&code<=67)return"Rain";
 if(code>=71&&code<=77)return"Snow"; if(code>=80&&code<=82)return"Rain showers";
 if(code>=95)return"Thunderstorm"; return"Mixed conditions"
}
function riskFromWeather(w,prob){
 let r=8;r+=Math.min(34,(Number(w.precipitation)||0)*10);r+=Math.min(34,(Number(prob)||0)*.34);
 r+=Math.min(10,Math.max(0,(Number(w.wind_speed_10m)||0)-25)*.4);return Math.round(clamp(r,5,92))
}
function riskClass(r){return r>=65?"high":r>=35?"watch":"low"}

function updateBrief(){
 const w=state.weather;if(!w)return;
 const prob=state.hourly?.precipitation_probability?.[0]??0;
 const r=riskFromWeather(w,prob), cls=riskClass(r);
 $("#riskScore").textContent=r+"%";
 $("#scoreRing").style.background=`conic-gradient(${cls==="high"?"#c94755":cls==="watch"?"#c5842c":"#2e9f69"} ${r}%,#e8eff5 0)`;
 $("#safetyHeadline").textContent=cls==="high"?"Conditions need extra caution":cls==="watch"?"Some conditions are worth watching":"No major weather-driven concern right now";
 $("#safetyMeaning").textContent=`Live weather shows ${weatherCodeLabel(w.weather_code).toLowerCase()}, ${w.temperature_2m}°C, ${w.precipitation} mm current precipitation and ${prob}% near-term rain probability. This is a weather caution indicator, not an official flood, traffic or utility forecast.`;
 $("#mainAction span").textContent=cls==="high"?"Avoid unnecessary exposure, check official alerts, and review your route before essential travel.":cls==="watch"?"Re-check rain before longer trips and stay aware of changing conditions.":"Continue normally while keeping official alerts available.";
 $("#confidenceBadge").textContent="Confidence: live weather + transparent limits";
 $("#briefText").textContent=`Live brief for ${state.place}. Updated ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}.`;
 $("#travelStatus").textContent=cls==="high"?"CAUTION":cls==="watch"?"WATCH":"GOOD NOW";
 $("#travelStatus").className="decisionStatus "+(cls==="low"?"safe":"watch");
 $("#travelText").textContent=cls==="high"?"Weather conditions are elevated. Use real navigation and official alerts before essential travel.":cls==="watch"?"Rain risk is meaningful enough to re-check before leaving.":"Current weather does not add a strong travel caution signal.";
 $("#ctxWeather").textContent=weatherCodeLabel(w.weather_code)+", "+w.temperature_2m+"°C";$("#ctxRain").textContent=prob+"%";
 $("#emGuideTitle").textContent=cls==="high"?"Weather conditions justify extra caution.":"No live emergency detected from the weather context.";
 $("#emGuideText").textContent=cls==="high"?"Avoid visibly flooded roads and moving water, follow official alerts, and use emergency services if you are in immediate danger.":"Use official alerts and local authorities for real emergency decisions. NEXUS-Ω will not invent closures, outages or evacuation orders.";
 $("#emEvidence").textContent=`Evidence: ${state.place}; ${w.temperature_2m}°C; precipitation ${w.precipitation} mm; near-term rain ${prob}%; wind ${w.wind_speed_10m} km/h.`;
}

async function getLocation(){
 if(!navigator.geolocation){toast("Location is not supported on this device.");return}
 $("#locationBtn").textContent="Locating...";
 navigator.geolocation.getCurrentPosition(async pos=>{
   state.lat=pos.coords.latitude;state.lon=pos.coords.longitude;state.place=`${state.lat.toFixed(3)}, ${state.lon.toFixed(3)}`;
   $("#locationBtn").textContent="Location active";$("#weatherPlace").textContent=state.place;$("#ctxLocation").textContent=state.place;
   localStorage.setItem("nexusLocation",JSON.stringify({lat:state.lat,lon:state.lon}));
   await loadWeather();
 },()=>{$("#locationBtn").textContent="Use my location";toast("Location permission was not granted.")},{enableHighAccuracy:true,timeout:12000,maximumAge:300000})
}
async function loadWeather(){
 if(state.lat==null){toast("Enable location first.");return}
 try{
   const url=`https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation&forecast_days=1&timezone=auto`;
   const r=await fetch(url);if(!r.ok)throw new Error("weather");
   const d=await r.json(), idx=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=new Date()));
   state.weather=d.current;state.hourly={time:d.hourly.time.slice(idx,idx+6),temperature_2m:d.hourly.temperature_2m.slice(idx,idx+6),precipitation_probability:d.hourly.precipitation_probability.slice(idx,idx+6),precipitation:d.hourly.precipitation.slice(idx,idx+6)};
   const prob=state.hourly.precipitation_probability[0]??0;
   $("#tempNow").textContent=Math.round(d.current.temperature_2m)+"°";$("#weatherState").textContent=weatherCodeLabel(d.current.weather_code);$("#weatherDetail").textContent="Live weather from Open-Meteo";
   $("#rainNow").textContent=d.current.precipitation+" mm";$("#rainProb").textContent=prob+"%";$("#windNow").textContent=d.current.wind_speed_10m+" km/h";
   renderTimeline();updateBrief();toast("Live weather updated.");
 }catch(e){toast("Could not load live weather. Try again shortly.")}
}
function renderTimeline(){const h=state.hourly;if(!h)return;$("#hourlyTimeline").innerHTML=h.time.map((t,i)=>`<div class="hourCard"><small>${new Date(t).toLocaleTimeString([],{hour:"numeric"})}</small><b>${Math.round(h.temperature_2m[i])}°</b><span>Rain ${h.precipitation_probability[i]??0}%</span></div>`).join("")}
$("#locationBtn").onclick=getLocation;$("#refreshBtn").onclick=loadWeather;
$("#whyBtn").onclick=()=>{const w=state.weather;$("#whyContent").textContent=w?`This score uses current precipitation (${w.precipitation} mm), near-term rain probability (${state.hourly?.precipitation_probability?.[0]??0}%) and wind (${w.wind_speed_10m} km/h). It does not know live road closures, utility outages, hospital capacity or evacuation orders unless verified sources are connected.`:"Location/weather are not loaded yet.";$("#whyModal").classList.add("show")};
$("[data-close]").onclick=()=>$("#whyModal").classList.remove("show");$("#whyModal").onclick=e=>{if(e.target.id==="whyModal")$("#whyModal").classList.remove("show")};

function localNexusAnswer(text){
 const q=String(text||"").toLowerCase(), w=state.weather, prob=state.hourly?.precipitation_probability?.[0]??null;
 let severity="low";if(w&&(Number(prob)>=70||Number(w.precipitation)>=8||Number(w.wind_speed_10m)>=45))severity="high";else if(w&&(Number(prob)>=35||Number(w.precipitation)>=2||Number(w.wind_speed_10m)>=30))severity="moderate";
 const weather=w?`Current live weather: ${weatherCodeLabel(w.weather_code)}, ${w.temperature_2m}°C, precipitation ${w.precipitation} mm, rain probability ${prob??"unknown"}%, wind ${w.wind_speed_10m} km/h.`:"Live weather has not been loaded yet.";
 let action=severity==="high"?"Avoid unnecessary exposure, re-check weather before travel, keep your phone charged, and follow official alerts if issued.":severity==="moderate"?"Use extra caution, re-check rain before leaving, and use your navigation app for actual road conditions.":"Normal activity is reasonable based on the weather context available here, but check official alerts before important travel.";
 if(q.includes("family"))action+=" Confirm a family check-in plan and keep essential contacts available.";
 if(q.includes("travel")||q.includes("route"))action+=" Route Guardian can add weather context, but a navigation service remains the source for traffic and closures.";
 if(q.includes("emergency"))action+=" If there is immediate danger, call emergency services.";
 window.__nexusAIEngine="local";
 return `What this means\n${weather}\n\nWhat may happen next\nThe current weather context suggests a ${severity} weather-related disruption level. NEXUS-Ω cannot verify live road closures, utility outages, hospital capacity, flood depth, evacuation orders or official alerts without verified sources.\n\nWhat you should do\n${action}\n\nWhy / evidence and limits\nThis local fallback uses the live weather already shown in NEXUS-Ω plus transparent safety rules. It is decision support, not an official emergency forecast.`;
}
async function askAI(text){
 const w=state.weather, prob=state.hourly?.precipitation_probability?.[0]??null;
 const safeContext=w?`Weather: ${weatherCodeLabel(w.weather_code)}, temperature ${w.temperature_2m}°C, precipitation ${w.precipitation} mm, rain probability ${prob??"unknown"}%, wind ${w.wind_speed_10m} km/h.`:"Live weather not loaded.";
 const prompt=`You are Ω-CORE Free, the NEXUS-Ω resilience assistant. Answer in ${state.language}. Help with weather-aware travel caution, preparedness, family safety and emergency planning. Never invent live road closures, utility outages, hospital capacity, flood depth, evacuation orders or official alerts. If information is missing, say so. For emergencies, direct the user to official authorities and emergency services. Structure: What this means; What may happen next; What you should do; Why / evidence and limits. APP CONTEXT: ${safeContext} USER QUESTION: ${text}`;
 const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),9000);
 try{
   const r=await fetch("https://text.pollinations.ai/"+encodeURIComponent(prompt),{signal:controller.signal,cache:"no-store"});
   if(!r.ok)throw new Error("free ai");
   const answer=(await r.text()).trim();if(!answer)throw new Error("empty");
   window.__nexusAIEngine="free";return answer;
 }catch(e){return localNexusAnswer(text)}finally{clearTimeout(timeout)}
}
async function sendMessage(text){
 text=(text||$("#askText").value).trim();if(!text)return;
 const chat=$("#chat");chat.insertAdjacentHTML("beforeend",`<div class="bubble user"><b>You</b><p>${escapeHtml(text)}</p></div>`);$("#askText").value="";
 const loading=document.createElement("div");loading.className="bubble ai";loading.innerHTML="<b>NEXUS-Ω</b><p>Thinking with the available context...</p>";chat.appendChild(loading);chat.scrollTop=chat.scrollHeight;
 const ans=await askAI(text);loading.querySelector("p").textContent=ans;$("#aiStatus").textContent=window.__nexusAIEngine==="free"?"Free generative AI active • no paid key required":"NEXUS local safety fallback active • always available";chat.scrollTop=chat.scrollHeight
}
$("#sendBtn").onclick=()=>sendMessage();$("#askText").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}};$$(".promptChips button").forEach(b=>b.onclick=()=>sendMessage(b.textContent));$("#makePlanBtn").onclick=()=>{setView("ask");setTimeout(()=>sendMessage("Create a simple safe-day plan for me based on the current context. Separate live facts from assumptions."),250)};
$("#voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast("Voice input is not supported in this browser.");return}const rec=new SR();rec.lang=state.language==="Telugu"?"te-IN":state.language==="Hindi"?"hi-IN":"en-IN";rec.onresult=e=>{$("#askText").value=e.results[0][0].transcript};rec.start();toast("Listening...")};

function routeAssessment(){
 const dest=$("#routeTo").value.trim();if(!dest){$("#routeResult h3").textContent="Add a destination.";return}
 const prob=state.hourly?.precipitation_probability?.[0]??null;
 const text=prob==null?"Live weather is not loaded, so NEXUS-Ω cannot add a weather caution yet.":prob>=65?`Near-term rain probability is ${prob}%. Extra weather caution is justified. Check live navigation and official alerts before essential travel.`:prob>=35?`Near-term rain probability is ${prob}%. Re-check rain before leaving and use your navigation app for actual road conditions.`:`Near-term rain probability is ${prob}%. Current weather does not add a strong caution signal, but traffic and closures still come from your navigation provider.`;
 $("#routeResult h3").textContent="Trip to "+dest;$("#routeResult p").textContent=text;saveTrip(dest);renderTrips()
}
function saveTrip(dest){let trips=JSON.parse(localStorage.getItem("nexusTrips")||"[]");trips=[dest,...trips.filter(x=>x!==dest)].slice(0,6);localStorage.setItem("nexusTrips",JSON.stringify(trips))}
function renderTrips(){const trips=JSON.parse(localStorage.getItem("nexusTrips")||"[]");$("#tripGrid").innerHTML=trips.length?trips.map(x=>`<button class="trip" data-trip="${escapeHtml(x)}"><b>${escapeHtml(x)}</b><span>Tap to reuse</span></button>`).join(""):'<div class="timelineEmpty">No frequent trips saved yet.</div>';$$("[data-trip]").forEach(b=>b.onclick=()=>{$("#routeTo").value=b.dataset.trip;routeAssessment()})}
$("#checkRouteBtn").onclick=routeAssessment;$("#openMapsBtn").onclick=()=>{const dest=$("#routeTo").value.trim();if(!dest){toast("Add a destination first.");return}const origin=state.lat!=null?`${state.lat},${state.lon}`:"";window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`,"_blank")};renderTrips();

function loadFamily(){return JSON.parse(localStorage.getItem("nexusFamily")||"[]")}function saveFamily(a){localStorage.setItem("nexusFamily",JSON.stringify(a))}
function renderFamily(){
 const a=loadFamily();$("#familyBoard").innerHTML=a.length?a.map((m,i)=>`<article class="familyCard"><div class="avatar">${escapeHtml(m.name[0].toUpperCase())}</div><h3>${escapeHtml(m.name)}</h3><p>${m.checked?"Checked in on this device.":"Waiting for check-in."}</p><button class="checkBtn ${m.checked?"checked":""}" data-check="${i}">${m.checked?"Checked in":"Mark checked in"}</button> <button class="linkBtn" data-remove="${i}">Remove</button></article>`).join(""):'<div class="timelineEmpty">Add family members to start local check-ins.</div>';
 const checked=a.filter(x=>x.checked).length;$("#familySummary").innerHTML=a.length?`<b>${checked} of ${a.length} checked in</b><span>${a.length-checked} still waiting for confirmation.</span>`:"<b>No family members added yet.</b><span>Add people you care about and record check-ins.</span>";$("#familyMiniStatus").textContent=a.length?`${checked}/${a.length} CHECKED`:"NOT CHECKED";$("#familyMiniText").textContent=a.length?`${a.length-checked} family member(s) have not checked in on this device.`:"Family check-ins are stored locally on this device.";
 $$("[data-check]").forEach(b=>b.onclick=()=>{const x=loadFamily();x[+b.dataset.check].checked=!x[+b.dataset.check].checked;saveFamily(x);renderFamily()});$$("[data-remove]").forEach(b=>b.onclick=()=>{const x=loadFamily();x.splice(+b.dataset.remove,1);saveFamily(x);renderFamily()})
}
$("#addFamilyBtn").onclick=()=>{const n=$("#familyName").value.trim();if(!n)return;const a=loadFamily();a.push({name:n,checked:false});saveFamily(a);$("#familyName").value="";renderFamily()};renderFamily();

function calcScenario(opts={}){
 const rain=Number(opts.rain??$("#rainSlider").value);
 const roadSupport=opts.roadSupport??$("#roadSupport").checked, subBackup=opts.subBackup??$("#subBackup").checked, pumpBackup=opts.pumpBackup??$("#pumpBackup").checked, hospitalStorage=opts.hospitalStorage??$("#hospitalStorage").checked;
 const road=clamp(10+0.8*rain-(roadSupport?25:0));
 const sub=clamp(5+0.7*road+0.2*rain-(subBackup?50:0));
 const pump=clamp(5+0.85*sub-(pumpBackup?60:0));
 const hospital=clamp(10+pump-(hospitalStorage?35:0));
 return {rain,road,sub,pump,hospital,roadSupport,subBackup,pumpBackup,hospitalStorage}
}
function baselineScenario(){return calcScenario({rain:Number($("#rainSlider").value),roadSupport:false,subBackup:false,pumpBackup:false,hospitalStorage:false})}
function bestIntervention(){
 const base=baselineScenario(), candidates=[
   {id:"roadSupport",label:"Strengthen road drainage / access",cost:2},
   {id:"subBackup",label:"Activate substation backup",cost:3},
   {id:"pumpBackup",label:"Protect Pump 2 with backup power",cost:2},
   {id:"hospitalStorage",label:"Use hospital emergency water storage",cost:1.5}
 ];
 return candidates.map(c=>{const o={rain:base.rain,roadSupport:false,subBackup:false,pumpBackup:false,hospitalStorage:false,[c.id]:true};const r=calcScenario(o);return {...c,result:r,reduction:base.hospital-r.hospital,score:(base.hospital-r.hospital)/c.cost}}).sort((a,b)=>b.score-a.score)[0]
}
function renderCascade(){
 const current=calcScenario(), base=baselineScenario(), best=bestIntervention();
 $("#rainValue").textContent=current.rain+"%";$("#rainNode").textContent=Math.round(current.rain)+"%";$("#roadRiskNode").textContent=Math.round(current.road)+"%";$("#subRiskNode").textContent=Math.round(current.sub)+"%";$("#pumpRiskNode").textContent=Math.round(current.pump)+"%";$("#hospitalRiskNode").textContent=Math.round(current.hospital)+"%";
 $("#baselineCascade").textContent=Math.round(base.hospital)+"%";$("#currentCascade").textContent=Math.round(current.hospital)+"%";$("#riskReduction").textContent=Math.max(0,Math.round(base.hospital-current.hospital))+"%";
 $("#breakTitle").textContent=best.label+".";$("#breakWhy").textContent=`In this synthetic model it produces about ${Math.round(best.reduction)} percentage-points of downstream hospital-risk reduction relative to the no-intervention baseline. This is educational decision logic, not an operational recommendation for a real city.`;
 $("#climateAgent").textContent=`Rain intensity is ${current.rain}%. The Climate Agent treats it as the initiating hazard, not as a real flood measurement.`;
 $("#powerAgent").textContent=`Substation 4 modeled risk is ${Math.round(current.sub)}%. Road access and rain stress propagate into the power layer.`;
 $("#waterAgent").textContent=`Pump 2 modeled risk is ${Math.round(current.pump)}%. It depends strongly on power continuity, so backup power can break the chain.`;
 $("#healthAgent").textContent=`Hospital A modeled continuity risk is ${Math.round(current.hospital)}%. This is the downstream human-impact indicator used by the demo.`;
 $("#verifyAgent").textContent="Verification Agent: all Cascade Lab values are synthetic. No live utility, road, hospital or evacuation data is being claimed."
}
["rainSlider","roadSupport","subBackup","pumpBackup","hospitalStorage"].forEach(id=>$("#"+id).addEventListener("input",renderCascade));
$("#resetScenario").onclick=()=>{$("#rainSlider").value=90;$("#roadSupport").checked=false;$("#subBackup").checked=false;$("#pumpBackup").checked=false;$("#hospitalStorage").checked=false;renderCascade();toast("Scenario reset.")};
$("#applyRecommended").onclick=()=>{const best=bestIntervention();["roadSupport","subBackup","pumpBackup","hospitalStorage"].forEach(id=>$("#"+id).checked=id===best.id);renderCascade();toast("Recommended synthetic intervention applied.")};
$("#useLiveRainBtn").onclick=()=>{const p=state.hourly?.precipitation_probability?.[0];if(p==null){toast("Load live weather first.");return}$("#rainSlider").value=clamp(Math.max(10,p));renderCascade();toast("Live rain probability mapped into the simulated scenario.")};renderCascade();

async function shareText(text){if(navigator.share)try{await navigator.share({text})}catch{}else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast("Copied to clipboard.")}}
$("#shareCheckinBtn").onclick=()=>shareText("I’m safe. This is my NEXUS-Ω family check-in.");
$("#safeCheckBtn").onclick=()=>shareText(`I’m safe. My current location: ${state.lat!=null?`https://maps.google.com/?q=${state.lat},${state.lon}`:"not shared"}.`);
$("#shareLocationBtn").onclick=()=>state.lat!=null?shareText(`My current location: https://maps.google.com/?q=${state.lat},${state.lon}`):toast("Enable location first.");
function hospitalSearch(){window.open(state.lat!=null?`https://www.google.com/maps/search/hospital/@${state.lat},${state.lon},14z`:"https://www.google.com/maps/search/hospital","_blank")}$("#emHospitalBtn").onclick=hospitalSearch;
$("#notifyBtn").onclick=async()=>{if(!("Notification" in window)){toast("Notifications are not supported.");return}const p=await Notification.requestPermission();toast(p==="granted"?"Browser alerts enabled.":"Notification permission not granted.")};
$("#speakBtn").onclick=()=>{if(!("speechSynthesis" in window)){toast("Speech is not supported.");return}const u=new SpeechSynthesisUtterance($("#emGuideTitle").textContent+". "+$("#emGuideText").textContent);u.lang=state.language==="Telugu"?"te-IN":state.language==="Hindi"?"hi-IN":"en-IN";speechSynthesis.speak(u)};
$("#offlinePackBtn").onclick=()=>{$("#offlinePack").scrollIntoView({behavior:"smooth"});toast("Offline safety pack opened.")};

if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
const saved=JSON.parse(localStorage.getItem("nexusLocation")||"null");if(saved){state.lat=saved.lat;state.lon=saved.lon;state.place=`${state.lat.toFixed(3)}, ${state.lon.toFixed(3)}`;$("#locationBtn").textContent="Location saved";$("#weatherPlace").textContent=state.place;$("#ctxLocation").textContent=state.place;loadWeather()}

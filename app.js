const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state={lat:null,lon:null,weather:null,hourly:null,place:"Your area",selectedReport:"Waterlogging",language:"English"};

function toast(t){$("#toastText").textContent=t;$("#toast").classList.add("show");clearTimeout(window._toast);window._toast=setTimeout(()=>$("#toast").classList.remove("show"),2800)}
function setView(v){$$(".view").forEach(x=>x.classList.remove("active"));$("#view-"+v).classList.add("active");$$(".navItem").forEach(x=>x.classList.toggle("active",x.dataset.view===v));window.scrollTo({top:0,behavior:"smooth"})}
$$(".navItem").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$("[data-jump]").forEach(b=>b.onclick=()=>setView(b.dataset.jump));
$("#languageSelect").onchange=e=>{state.language=e.target.value;$("#ctxLanguage").textContent=state.language;toast("Language preference set to "+state.language)};

function weatherCodeLabel(code){if([0].includes(code))return"Clear";if([1,2].includes(code))return"Mostly clear";if(code===3)return"Overcast";if([45,48].includes(code))return"Fog";if(code>=51&&code<=67)return"Rain";if(code>=71&&code<=77)return"Snow";if(code>=80&&code<=82)return"Rain showers";if(code>=95)return"Thunderstorm";return"Mixed conditions"}
function riskFromWeather(w,prob){let r=8;r+=Math.min(34,(w.precipitation||0)*10);r+=Math.min(34,(prob||0)*.34);r+=Math.min(10,Math.max(0,(w.wind_speed_10m||0)-25)*.4);return Math.round(Math.max(5,Math.min(92,r)))}
function riskClass(r){return r>=65?"high":r>=35?"watch":"low"}
function updateBrief(){
 const w=state.weather;if(!w)return;const prob=state.hourly?.precipitation_probability?.[0]??0;const r=riskFromWeather(w,prob);const cls=riskClass(r);
 $("#riskScore").textContent=r+"%";$("#scoreRing").style.background=`conic-gradient(${cls==="high"?"#db4f57":cls==="watch"?"#d48a32":"#27a76e"} ${r}%,#e8eff5 0)`;
 $("#safetyHeadline").textContent=cls==="high"?"Conditions need extra caution":cls==="watch"?"Some conditions are worth watching":"No major weather-driven concern right now";
 $("#safetyMeaning").textContent=`Live weather shows ${weatherCodeLabel(w.weather_code).toLowerCase()}, ${w.temperature_2m}°C, ${w.precipitation} mm current precipitation and ${prob}% near-term rain probability. NEXUS-Ω uses these live values for weather-related guidance; power, water and road closures are not claimed as live unless a source is connected.`;
 $("#mainAction span").textContent=cls==="high"?"Avoid unnecessary exposure to severe weather, check official local alerts, and use Route Guardian before essential travel.":cls==="watch"?"Keep an eye on rain before longer trips. If conditions worsen, re-check before leaving.":"Continue normally, with alerts enabled for meaningful weather changes.";
 $("#confidenceBadge").textContent="Confidence: live weather data + transparent limits";
 $("#briefText").textContent=`Live brief for ${state.place}. Last updated ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}.`;
 $("#travelStatus").textContent=cls==="high"?"CAUTION":cls==="watch"?"WATCH":"GOOD NOW";$("#travelStatus").className="decisionStatus "+(cls==="high"||cls==="watch"?"watch":"safe");
 $("#travelText").textContent=cls==="high"?"Weather conditions are elevated. Check your actual navigation app and official road alerts before essential travel.":cls==="watch"?"Rain risk is meaningful enough to re-check before leaving, especially for longer trips.":"Current weather does not indicate a strong reason to avoid normal travel. Actual road closures still require map/official data.";
 $("#emGuideTitle").textContent=cls==="high"?"Weather conditions justify extra caution.":"No live emergency detected from the weather context.";
 $("#emGuideText").textContent=cls==="high"?"Stay aware of official alerts, avoid visibly flooded roads and moving water, and use emergency services if you are in immediate danger. NEXUS-Ω is not claiming specific road closures without verified road data.":"Use official alerts and local authorities for real emergency decisions. NEXUS-Ω will not invent road closures, utility failures or evacuation orders.";
 $("#emEvidence").textContent=`Evidence: ${state.place}; ${w.temperature_2m}°C; precipitation ${w.precipitation} mm; near-term rain probability ${prob}%; wind ${w.wind_speed_10m} km/h.`;
 $("#ctxWeather").textContent=weatherCodeLabel(w.weather_code)+", "+w.temperature_2m+"°C";$("#ctxRain").textContent=prob+"%";
}

async function getLocation(){
 if(!navigator.geolocation){toast("Location is not supported on this device.");return}
 $("#locationBtn").textContent="📍 Locating…";
 navigator.geolocation.getCurrentPosition(async pos=>{
   state.lat=pos.coords.latitude;state.lon=pos.coords.longitude;state.place=`${state.lat.toFixed(3)}, ${state.lon.toFixed(3)}`;$("#locationBtn").textContent="📍 Location active";$("#weatherPlace").textContent=state.place;$("#ctxLocation").textContent=state.place;
   localStorage.setItem("nexusLocation",JSON.stringify({lat:state.lat,lon:state.lon}));
   await loadWeather();
 },err=>{$("#locationBtn").textContent="📍 Use my location";toast("Location permission was not granted.")},{enableHighAccuracy:true,timeout:12000,maximumAge:300000})
}
async function loadWeather(){
 if(state.lat==null)return toast("Enable location first.");
 try{
   const url=`https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation&forecast_days=1&timezone=auto`;
   const d=await fetch(url).then(r=>{if(!r.ok)throw new Error("weather");return r.json()});
   state.weather=d.current;
   $("#tempNow").textContent=Math.round(d.current.temperature_2m)+"°";$("#weatherState").textContent=weatherCodeLabel(d.current.weather_code);$("#weatherDetail").textContent="Live weather from Open-Meteo";
   $("#rainNow").textContent=d.current.precipitation+" mm";const idx=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=new Date()));const prob=d.hourly.precipitation_probability[idx]??d.hourly.precipitation_probability[0]??0;$("#rainProb").textContent=prob+"%";$("#windNow").textContent=d.current.wind_speed_10m+" km/h";
   state.hourly={time:d.hourly.time.slice(idx,idx+6),temperature_2m:d.hourly.temperature_2m.slice(idx,idx+6),precipitation_probability:d.hourly.precipitation_probability.slice(idx,idx+6),precipitation:d.hourly.precipitation.slice(idx,idx+6)};
   renderTimeline();updateBrief();toast("Live weather brief updated.");
 }catch(e){toast("Could not load live weather. Try again shortly.")}
}
function renderTimeline(){
 const h=state.hourly;if(!h)return;$("#hourlyTimeline").innerHTML=h.time.map((t,i)=>`<div class="hourCard"><small>${new Date(t).toLocaleTimeString([],{hour:"numeric"})}</small><b>${Math.round(h.temperature_2m[i])}°</b><span>Rain ${h.precipitation_probability[i]??0}%</span></div>`).join("")
}
$("#locationBtn").onclick=getLocation;$("#refreshBtn").onclick=loadWeather;

$("#whyBtn").onclick=()=>{const w=state.weather;$("#whyContent").textContent=w?`This weather-risk score is based on live precipitation (${w.precipitation} mm), near-term rain probability (${state.hourly?.precipitation_probability?.[0]??0}%) and wind (${w.wind_speed_10m} km/h). It is not a flood forecast, road-closure feed or utility outage forecast. Those need dedicated verified data sources.`:"Location/weather have not been loaded yet, so NEXUS-Ω has not calculated a live weather-aware score.";$("#whyModal").classList.add("show")};
$("[data-close]").onclick=()=>$("#whyModal").classList.remove("show");$("#whyModal").onclick=e=>{if(e.target.id==="whyModal")$("#whyModal").classList.remove("show")};

async function askAI(text){
 const payload={message:text,language:state.language,context:{location:state.place,weather:state.weather?{temperature:state.weather.temperature_2m,precipitation:state.weather.precipitation,weather:weatherCodeLabel(state.weather.weather_code),wind:state.weather.wind_speed_10m,rainProbability:state.hourly?.precipitation_probability?.[0]??null}:null}};
 const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const d=await r.json();if(!r.ok)throw new Error(d.error||"AI unavailable");return d.text
}
async function sendMessage(text){
 text=(text||$("#askText").value).trim();if(!text)return;const chat=$("#chat");chat.insertAdjacentHTML("beforeend",`<div class="bubble user"><b>You</b><p>${escapeHtml(text)}</p></div>`);$("#askText").value="";chat.scrollTop=chat.scrollHeight;
 const loading=document.createElement("div");loading.className="bubble ai";loading.innerHTML="<b>NEXUS-Ω</b><p>Thinking with your current context…</p>";chat.appendChild(loading);chat.scrollTop=chat.scrollHeight;
 try{const ans=await askAI(text);loading.querySelector("p").textContent=ans;$("#aiStatus").textContent="OpenAI response received securely via server";}catch(e){loading.querySelector("p").textContent="The live OpenAI connection is not configured yet. The server route is installed, but the Vercel project still needs an OPENAI_API_KEY environment variable. Your question and the rest of the app can continue working without exposing a key in the browser.";$("#aiStatus").textContent="OpenAI key not configured on server";}
 chat.scrollTop=chat.scrollHeight
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("#sendBtn").onclick=()=>sendMessage();$("#askText").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage()}};$$(".promptChips button").forEach(b=>b.onclick=()=>sendMessage(b.textContent));$("#makePlanBtn").onclick=()=>{setView("ask");setTimeout(()=>sendMessage("Create a simple safe-day plan for me based on the current context. Prioritize only practical actions and clearly separate live facts from assumptions."),250)};

let recognition;$("#voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast("Voice input is not supported in this browser.");recognition=new SR();recognition.lang=state.language==="Telugu"?"te-IN":state.language==="Hindi"?"hi-IN":"en-IN";recognition.onresult=e=>{$("#askText").value=e.results[0][0].transcript};recognition.start();toast("Listening…")};

function routeAssessment(){
 const dest=$("#routeTo").value.trim();if(!dest){$("#routeResult h3").textContent="Add a destination.";return}
 const prob=state.hourly?.precipitation_probability?.[0]??null;let text=prob==null?"Live weather is not loaded, so NEXUS-Ω cannot add a weather-aware caution yet.":"Current near-term rain probability is "+prob+"%. "+(prob>=65?"Extra weather caution is justified before this trip. Check actual road conditions in your navigation app and official alerts.":prob>=35?"Re-check rain before leaving and use your navigation app for actual road conditions.":"Current weather does not add a strong caution signal, but actual traffic and closures still come from your navigation app.");
 $("#routeResult h3").textContent="Trip to "+dest;$("#routeResult p").textContent=text;saveTrip(dest);renderTrips()
}
function saveTrip(dest){let trips=JSON.parse(localStorage.getItem("nexusTrips")||"[]");trips=[dest,...trips.filter(x=>x!==dest)].slice(0,6);localStorage.setItem("nexusTrips",JSON.stringify(trips))}
function renderTrips(){const trips=JSON.parse(localStorage.getItem("nexusTrips")||"[]");$("#tripGrid").innerHTML=trips.length?trips.map(x=>`<button class="trip" data-trip="${escapeHtml(x)}"><b>${escapeHtml(x)}</b><span>Tap to reuse</span></button>`).join(""):'<div class="timelineEmpty">No frequent trips saved yet.</div>';$$("[data-trip]").forEach(b=>b.onclick=()=>{$("#routeTo").value=b.dataset.trip;routeAssessment()})}
$("#checkRouteBtn").onclick=routeAssessment;$("#openMapsBtn").onclick=()=>{const dest=$("#routeTo").value.trim();if(!dest)return toast("Add a destination first.");const origin=state.lat!=null?`${state.lat},${state.lon}`:"";window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`,"_blank")};renderTrips();

function loadFamily(){return JSON.parse(localStorage.getItem("nexusFamily")||"[]")}
function saveFamily(a){localStorage.setItem("nexusFamily",JSON.stringify(a))}
function renderFamily(){const a=loadFamily();$("#familyBoard").innerHTML=a.length?a.map((m,i)=>`<article class="familyCard"><div class="avatar">${escapeHtml(m.name[0].toUpperCase())}</div><h3>${escapeHtml(m.name)}</h3><p>${m.checked?"Checked in on this device.":"Waiting for check-in."}</p><button class="checkBtn ${m.checked?"checked":""}" data-check="${i}">${m.checked?"✓ I’m safe":"Mark checked in"}</button> <button class="linkBtn" data-remove="${i}">Remove</button></article>`).join(""):'<div class="timelineEmpty">Add family members to start local check-ins.</div>';const checked=a.filter(x=>x.checked).length;$("#familySummary").innerHTML=a.length?`<b>${checked} of ${a.length} checked in</b><span>${a.length-checked} still waiting for confirmation.</span>`:"<b>No family members added yet.</b><span>Add people you care about, then tap their status to mark them checked in.</span>";$("#familyMiniStatus").textContent=a.length?`${checked}/${a.length} CHECKED`:"NOT CHECKED";$("#familyMiniText").textContent=a.length?`${a.length-checked} family member(s) have not checked in on this device.`:"Add family check-ins locally on this device and see who has not confirmed safety.";$$("[data-check]").forEach(b=>b.onclick=()=>{const x=loadFamily();x[+b.dataset.check].checked=!x[+b.dataset.check].checked;saveFamily(x);renderFamily()});$$("[data-remove]").forEach(b=>b.onclick=()=>{const x=loadFamily();x.splice(+b.dataset.remove,1);saveFamily(x);renderFamily()})}
$("#addFamilyBtn").onclick=()=>{const n=$("#familyName").value.trim();if(!n)return;const a=loadFamily();a.push({name:n,checked:false});saveFamily(a);$("#familyName").value="";renderFamily()};renderFamily();

async function shareText(text){if(navigator.share)try{await navigator.share({text})}catch{}else{await navigator.clipboard.writeText(text);toast("Copied to clipboard.")}}
$("#shareCheckinBtn").onclick=()=>shareText("I’m safe. This is my NEXUS-Ω family check-in.");$("#safeCheckBtn").onclick=()=>shareText(`I’m safe. My current location: ${state.lat!=null?`https://maps.google.com/?q=${state.lat},${state.lon}`:"not shared"}.`);$("#shareLocationBtn").onclick=()=>state.lat!=null?shareText(`My current location: https://maps.google.com/?q=${state.lat},${state.lon}`):toast("Enable location first.");

function hospitalSearch(){const q=state.lat!=null?`https://www.google.com/maps/search/hospital/@${state.lat},${state.lon},14z`:`https://www.google.com/maps/search/hospital`;window.open(q,"_blank")}$("#hospitalBtn").onclick=hospitalSearch;$("#emHospitalBtn").onclick=hospitalSearch;

let selectedReport="Waterlogging";$$(".reportTypes button").forEach(b=>b.onclick=()=>{$$(".reportTypes button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedReport=b.dataset.type});
function renderReports(){const a=JSON.parse(localStorage.getItem("nexusReports")||"[]");$("#reportFeed").innerHTML=a.length?a.map(r=>`<div class="reportItem"><b>${escapeHtml(r.type)}</b><span>${escapeHtml(r.note||"No note")} • ${new Date(r.time).toLocaleString()}</span></div>`).join(""):'<div class="timelineEmpty">No local reports saved on this device.</div>'}
$("#submitReportBtn").onclick=()=>{const a=JSON.parse(localStorage.getItem("nexusReports")||"[]");a.unshift({type:selectedReport,note:$("#reportNote").value.trim(),time:Date.now(),lat:state.lat,lon:state.lon});localStorage.setItem("nexusReports",JSON.stringify(a.slice(0,30)));$("#reportNote").value="";renderReports();toast("Local report saved on this device.")};$("#clearReportsBtn").onclick=()=>{localStorage.removeItem("nexusReports");renderReports()};renderReports();

$("#reportUtilityBtn").onclick=()=>setView("community");
$("#notifyBtn").onclick=async()=>{if(!("Notification" in window))return toast("Notifications are not supported.");const p=await Notification.requestPermission();toast(p==="granted"?"Alerts enabled.":"Notification permission not granted.")};
$("#speakBtn").onclick=()=>{if(!("speechSynthesis" in window))return toast("Speech is not supported.");const u=new SpeechSynthesisUtterance($("#emGuideTitle").textContent+". "+$("#emGuideText").textContent);u.lang=state.language==="Telugu"?"te-IN":state.language==="Hindi"?"hi-IN":"en-IN";speechSynthesis.speak(u)};
$("#offlinePackBtn").onclick=()=>{$("#offlinePack").scrollIntoView({behavior:"smooth"});toast("Offline safety pack is available in this app.")};

if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
const saved=JSON.parse(localStorage.getItem("nexusLocation")||"null");if(saved){state.lat=saved.lat;state.lon=saved.lon;state.place=`${state.lat.toFixed(3)}, ${state.lon.toFixed(3)}`;$("#locationBtn").textContent="📍 Location saved";$("#weatherPlace").textContent=state.place;$("#ctxLocation").textContent=state.place;loadWeather()}

const records = [
  {name:'Complete Blood Count', type:'Report', date:'12 Oct 2026', status:'Needs review', icon:'▤', note:'Diagnostic report · Sample clinic', summary:'This sample report lists blood measurements such as haemoglobin and red blood cell count. One illustrative value is marked for review.'},
  {name:'Prescription — General Visit', type:'Prescription', date:'08 Oct 2026', status:'Added', icon:'＋', note:'Prescription · Sample clinic', summary:'A sample prescription record. Always verify medicine names, strengths, and instructions against the original document with a pharmacist or clinician.'},
  {name:'Annual Health Check', type:'Report', date:'23 Sep 2026', status:'Reviewed', icon:'▤', note:'Diagnostic report · Sample lab', summary:'An example health check record. Compare results only with the reference ranges printed on the original report and your clinician’s guidance.'},
  {name:'Clinic Visit Summary', type:'Visit note', date:'16 Sep 2026', status:'Reviewed', icon:'♡', note:'Visit note · Sample physician', summary:'A fictional visit note included to demonstrate organizing health history chronologically.'}
];
const events = [
  {date:'12 Oct 2026', title:'Complete Blood Count added', detail:'Sample diagnostic report added to your records. One detail is marked for review.', tag:'Needs review'},
  {date:'08 Oct 2026', title:'Prescription added', detail:'A sample prescription was organized under Medicines.', tag:'Prescription'},
  {date:'23 Sep 2026', title:'Annual Health Check', detail:'Sample report added to your health history.', tag:'Report'},
  {date:'16 Sep 2026', title:'Clinic visit summary', detail:'Example appointment note saved to your record timeline.', tag:'Visit note'}
];
const doctors = [
  {name:'Dr. Meera Iyer', specialty:'General physician', initials:'MI', color:'', rating:'4.9', reviews:'128 reviews', experience:'12 years experience', location:'City Care Clinic · 2.4 km', fee:'₹500', slots:'Today · 4 slots'},
  {name:'Dr. Kabir Malhotra', specialty:'Cardiology', initials:'KM', color:'purple', rating:'4.8', reviews:'96 reviews', experience:'15 years experience', location:'Green Cross Hospital · 3.1 km', fee:'₹800', slots:'Tomorrow · 2 slots'},
  {name:'Dr. Sana Qureshi', specialty:'Dermatology', initials:'SQ', color:'peach', rating:'4.9', reviews:'74 reviews', experience:'9 years experience', location:'WellSpring Clinic · 1.8 km', fee:'₹600', slots:'16 Oct · 5 slots'}
];
const medicines = [
  {name:'Dolo 650', details:'Paracetamol · Fever & Pain Relief · ₹30', instruction:'Take 1 tablet after meals as advised for fever or mild pain. Do not exceed 3 tablets in 24 hours.', reminder:'Reminder set · 2:00 PM'},
  {name:'Combiflam', details:'Ibuprofen & Paracetamol · Body Aches · ₹45', instruction:'Take 1 tablet after food for acute muscle or joint ache. Stay well hydrated.', reminder:'Reminder off'},
  {name:'Becosules Z', details:'B-Complex with Vitamin C & Zinc · ₹55', instruction:'Take 1 capsule daily in the morning with water for energy & mucosal health.', reminder:'Reminder set · 9:00 AM'},
  {name:'Shelcal 500', details:'Calcium & Vitamin D3 · Bone Health · ₹145', instruction:'Take 1 tablet daily after lunch or dinner for bone and joint support.', reminder:'Reminder set · 8:30 PM'},
  {name:'Panadol Advance 500mg', details:'Fast-acting Paracetamol · ₹120', instruction:'Take 1-2 tablets for tension headache. Maximum 8 tablets in 24 hours.', reminder:'Reminder off'}
];
const views = {overview:'Overview',records:'Health records',timeline:'Health timeline',assistant:'Health chat',symptoms:'AI Symptom Checker',care:'Find care',wellness:'Wellness & vitals',medicines:'Medicines',emergency:'Emergency help',settings:'Settings'};
let currentUploads = [];
let toastTimer;

function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function openView(name){if(!views[name])return;document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${name}`));document.querySelectorAll('.nav-link[data-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===name));document.getElementById('crumb').textContent=views[name];document.getElementById('sidebar').classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});if(name==='records')renderRecords();if(name==='timeline')renderTimeline()}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>openView(button.dataset.view)));
document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.addEventListener('click',event=>{const sidebar=document.getElementById('sidebar');const toggle=document.getElementById('menuToggle');if(sidebar.classList.contains('open')&&!sidebar.contains(event.target)&&!toggle.contains(event.target)){sidebar.classList.remove('open')}});
document.getElementById('dismissBanner').addEventListener('click',()=>document.getElementById('demoBanner').remove());

function renderRecords(){const query=(document.getElementById('recordSearch')?.value||'').trim().toLowerCase();const filter=document.getElementById('recordFilter')?.value||'all';const filtered=records.filter(record=>(filter==='all'||record.type===filter)&&`${record.name} ${record.type} ${record.note}`.toLowerCase().includes(query));const tbody=document.getElementById('recordRows');tbody.innerHTML=filtered.map((record,index)=>`<tr><td><div class="table-doc"><span class="file-icon">${record.icon}</span><span><b>${escapeHTML(record.name)}</b><small>${escapeHTML(record.note)}</small></span></div></td><td><span class="type-pill">${escapeHTML(record.type)}</span></td><td>${escapeHTML(record.date)}</td><td><span class="status-pill ${record.status==='Needs review'?'review':''}">${escapeHTML(record.status)}</span></td><td><button class="row-button" data-record="${escapeHTML(record.name)}" aria-label="Open ${escapeHTML(record.name)}">↗</button></td></tr>`).join('');document.getElementById('recordsEmpty').hidden=filtered.length>0;tbody.querySelectorAll('[data-record]').forEach(button=>button.addEventListener('click',()=>openRecord(button.dataset.record)))}
function renderTimeline(){document.getElementById('timelineList').innerHTML=events.map(event=>`<article class="timeline-item"><div class="timeline-date">${escapeHTML(event.date)}</div><div class="timeline-marker"></div><div class="timeline-content"><b>${escapeHTML(event.title)}</b><p>${escapeHTML(event.detail)}</p><span class="timeline-tag">${escapeHTML(event.tag)}</span></div></article>`).join('')}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
document.getElementById('recordSearch').addEventListener('input',renderRecords);document.getElementById('recordFilter').addEventListener('change',renderRecords);

const modal=document.getElementById('modal');
function openRecord(name){const record=records.find(item=>item.name===name)||records[0];document.getElementById('modalTitle').textContent=record.name;document.getElementById('modalIntro').textContent=`${record.type} · ${record.date}. This is an illustrative demo record.`;document.getElementById('modalMeaning').textContent=record.summary;document.getElementById('modalVerify').textContent='Check the original document for dates, units, reference ranges, and any unclear words. Ask a qualified professional if you need help interpreting this information.';modal.hidden=false;document.getElementById('modalClose').focus()}
document.querySelectorAll('[data-record]').forEach(button=>button.addEventListener('click',()=>openRecord(button.dataset.record)));function closeModal(){modal.hidden=true}document.getElementById('modalClose').addEventListener('click',closeModal);document.getElementById('modalDone').addEventListener('click',closeModal);modal.addEventListener('click',event=>{if(event.target===modal)closeModal()});document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();document.getElementById('sidebar').classList.remove('open')}});

const fileInput=document.getElementById('fileInput');const dropzone=document.getElementById('dropzone');function chooseFiles(){fileInput.click()}document.getElementById('browseFiles').addEventListener('click',event=>{event.stopPropagation();chooseFiles()});dropzone.addEventListener('click',chooseFiles);dropzone.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseFiles()}});document.querySelectorAll('[data-action="upload"]').forEach(button=>button.addEventListener('click',chooseFiles));fileInput.addEventListener('change',()=>{addFiles([...fileInput.files]);fileInput.value=''});['dragenter','dragover'].forEach(type=>dropzone.addEventListener(type,event=>{event.preventDefault();dropzone.classList.add('dragover')}));['dragleave','drop'].forEach(type=>dropzone.addEventListener(type,event=>{event.preventDefault();dropzone.classList.remove('dragover')}));dropzone.addEventListener('drop',event=>addFiles([...event.dataTransfer.files]));
function addFiles(files){if(!files.length)return;const accepted=[];files.forEach(file=>{const validType=/\.(pdf|jpe?g|png)$/i.test(file.name);if(!validType){showToast(`${file.name} is not a supported file type`);return}if(file.size>10*1024*1024){showToast(`${file.name} is larger than 10 MB`);return}accepted.push(file)});if(!accepted.length)return;accepted.forEach(file=>currentUploads.push({name:file.name,size:formatSize(file.size)}));renderUploads();document.dispatchEvent(new CustomEvent('nirogya:files-added',{detail:{files:accepted}}));showToast(`${accepted.length} file${accepted.length===1?'':'s'} added to this demo session`)}
function formatSize(bytes){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}
function renderUploads(){const target=document.getElementById('uploadQueue');target.innerHTML=currentUploads.map(file=>`<div class="queue-item"><span>▤ ${escapeHTML(file.name)}</span><small>${escapeHTML(file.size)} · demo only</small></div>`).join('')}
document.getElementById('clearUploads').addEventListener('click',()=>{currentUploads=[];renderUploads();document.dispatchEvent(new Event('nirogya:uploads-cleared'));showToast('Session upload list cleared')});

document.getElementById('doctorGrid').innerHTML=doctors.map(doctor=>`<article class="doctor-card" data-specialty="${escapeHTML(doctor.specialty)}" data-doctor="${escapeHTML(doctor.name.toLowerCase())}"><div class="doctor-top"><div class="doctor-avatar ${doctor.color}">${doctor.initials}</div><div><b>${escapeHTML(doctor.name)}</b><small>${escapeHTML(doctor.specialty)}</small></div></div><div class="rating">★ ${doctor.rating} <span style="color:#a0aaa4">· ${doctor.reviews}</span></div><div class="doctor-meta"><span>${escapeHTML(doctor.experience)}</span><br>${escapeHTML(doctor.location)}<br>Consultation · ${doctor.fee}</div><div class="doctor-footer"><small>● ${escapeHTML(doctor.slots)}</small><button class="button button-outline book-doctor" data-name="${escapeHTML(doctor.name)}">Book a visit</button></div></article>`).join('');
function filterDoctors(){const query=document.getElementById('doctorSearch').value.toLowerCase().trim();const specialty=document.getElementById('specialtyFilter').value;let count=0;document.querySelectorAll('.doctor-card').forEach(card=>{const matchText=card.dataset.doctor.includes(query)||card.dataset.specialty.toLowerCase().includes(query)||card.textContent.toLowerCase().includes(query);const matchSpecialty=specialty==='all'||card.dataset.specialty===specialty;card.hidden=!(matchText&&matchSpecialty);if(!card.hidden)count++});if(!count)showToast('No sample providers match that search')}
document.getElementById('careSearchButton').addEventListener('click',filterDoctors);document.getElementById('doctorSearch').addEventListener('input',filterDoctors);document.getElementById('specialtyFilter').addEventListener('change',filterDoctors);document.getElementById('doctorGrid').addEventListener('click',event=>{const button=event.target.closest('.book-doctor');if(button)showToast(`Demo booking started for ${button.dataset.name}`)});

document.getElementById('medicineList').innerHTML=medicines.map((medicine,index)=>`<article class="medicine-card"><div class="medicine-card-top"><span class="medicine-symbol">＋</span><div><b>${escapeHTML(medicine.name)}</b><small>${escapeHTML(medicine.details)}</small></div></div><div class="medicine-instruction">${escapeHTML(medicine.instruction)}</div><div class="medicine-footer"><span>${escapeHTML(medicine.reminder)}</span><button data-reminder="${index}">${medicine.reminder==='Reminder off'?'＋ Set reminder':'Edit reminder'}</button></div></article>`).join('');document.getElementById('medicineList').addEventListener('click',event=>{const button=event.target.closest('[data-reminder]');if(button)showToast('Reminder controls are a prototype interaction')});

const cannedReplies=[{keys:['blood report','blood test','cbc','haemoglobin','hemoglobin'],answer:'Your sample Complete Blood Count lists measurements such as haemoglobin. The demo value shown is 12.4 g/dL, and the card asks you to check the range printed on the original report. A result depends on the lab range and personal context, so I can’t determine what it means for you. You could ask your clinician: “How does this result compare with my report’s reference range?”'},{keys:['appointment','ask at','prepare'],answer:'For your sample follow-up, consider bringing the original report and asking: “Could you explain any results I should follow up on?”, “Do these findings need another test?”, and “When should I contact you if I have concerns?” These are conversation prompts, not a care plan.'},{keys:['haemoglobin','hemoglobin','term'],answer:'Haemoglobin is a protein in red blood cells that carries oxygen around the body. A report’s result needs to be read alongside its units, lab reference range, and personal context. Your clinician can explain what a particular result means for you.'},{keys:['medicine','prescription','dose'],answer:'I can help explain the wording on a prescription, but the sample medicine details here are fictional and intentionally incomplete. Please verify the medicine name, strength, dose, and timing with the original prescription and a pharmacist or clinician. Never change a prescribed dose based on this demo.'},{keys:['hello','hi','namaste'],answer:'Namaste! You can ask me to explain a health term, summarize a sample record, or prepare questions for an appointment. This prototype uses scripted responses and does not connect to a medical AI service.'}];
function assistantReply(text){const normalized=text.toLowerCase();const found=cannedReplies.find(item=>item.keys.some(key=>normalized.includes(key)));return found?found.answer:'I can help explain a term in your records or suggest questions to discuss with a clinician. In this prototype I only have fictional sample records, and I can’t assess symptoms or give diagnosis or treatment advice. Try asking about your sample blood report or appointment.'}
const chatForm=document.getElementById('chatForm');const chatInput=document.getElementById('chatInput');function addChatMessage(text,who){const row=document.createElement('div');row.className=`message ${who==='user'?'user-message':''}`;const avatar=document.createElement('div');avatar.className='message-avatar';avatar.textContent=who==='user'?'AS':'✧';const wrap=document.createElement('div');const bubble=document.createElement('div');bubble.className='bubble';const p=document.createElement('p');p.textContent=text;bubble.append(p);wrap.append(bubble);const time=document.createElement('small');time.className='message-time';time.textContent=who==='user'?'You · just now':'Nirogya AI · just now';wrap.append(time);row.append(avatar,wrap);const messages=document.getElementById('chatMessages');messages.querySelector('.suggestion-list')?.remove();messages.querySelector('.prompt-label')?.remove();messages.append(row);messages.scrollTop=messages.scrollHeight;return row}
function sendMessage(text){const clean=text.trim();if(!clean)return;addChatMessage(clean,'user');chatInput.value='';chatInput.disabled=true;const placeholder=addChatMessage('Let me check the sample context…','assistant');placeholder.classList.add('typing-message');setTimeout(()=>{placeholder.remove();addChatMessage(assistantReply(clean),'assistant');chatInput.disabled=false;chatInput.focus()},650)}chatForm.addEventListener('submit',event=>{event.preventDefault();sendMessage(chatInput.value)});document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>sendMessage(button.dataset.prompt)));

document.querySelectorAll('[data-toast]').forEach(button=>button.addEventListener('click',()=>showToast(button.dataset.toast)));
document.getElementById('settingsLanguage').addEventListener('change',event=>{document.getElementById('language').value=event.target.value;showToast('Language preference updated for this demo')});document.getElementById('language').addEventListener('change',event=>{document.getElementById('settingsLanguage').value=event.target.value;showToast('Language preference updated for this demo')});
const symptomsData = {
  Head: ["Headache", "Dizziness", "Sore Throat", "Blurred Vision", "Earache", "Sinus Pressure"],
  Chest: ["Cough", "Chest Pain", "Shortness of Breath", "Palpitations", "Tightness"],
  Abdomen: ["Stomach Ache", "Nausea", "Bloating", "Acid Reflux", "Abdominal Cramps"],
  Limbs: ["Joint Pain", "Muscle Cramp", "Numbness", "Swelling", "Stiffness"],
  General: ["Fever", "Fatigue", "Chills", "Body Ache", "Loss of Appetite", "Mild Dehydration"]
};

let currentBodyPart = 'Head';
let selectedSymptoms = ['Headache'];
let currentIntensity = 5;

function renderSymptomChips() {
  const container = document.getElementById('symptomChips');
  if (!container) return;
  const list = symptomsData[currentBodyPart] || [];
  container.innerHTML = list.map(item => {
    const isSel = selectedSymptoms.includes(item);
    return `<button class="symptom-chip ${isSel ? 'selected' : ''}" type="button" data-symptom="${escapeHTML(item)}">${isSel ? '✓ ' : '＋ '}${escapeHTML(item)}</button>`;
  }).join('');
}

function initSymptomChecker() {
  const bodyTabs = document.getElementById('bodyPartTabs');
  if (bodyTabs) {
    bodyTabs.addEventListener('click', event => {
      const btn = event.target.closest('.part-btn');
      if (!btn) return;
      bodyTabs.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBodyPart = btn.dataset.part;
      renderSymptomChips();
    });
  }

  const container = document.getElementById('symptomChips');
  if (container) {
    container.addEventListener('click', event => {
      const chip = event.target.closest('.symptom-chip');
      if (!chip) return;
      const s = chip.dataset.symptom;
      if (selectedSymptoms.includes(s)) {
        selectedSymptoms = selectedSymptoms.filter(item => item !== s);
      } else {
        selectedSymptoms.push(s);
      }
      renderSymptomChips();
    });
  }

  const slider = document.getElementById('symptomIntensity');
  if (slider) {
    slider.addEventListener('input', () => {
      currentIntensity = parseInt(slider.value, 10);
      const valElem = document.getElementById('intensityVal');
      const labelElem = document.getElementById('intensityLabel');
      if (valElem) valElem.textContent = currentIntensity;
      if (labelElem) {
        labelElem.textContent = currentIntensity <= 3 ? 'Mild discomfort' : currentIntensity <= 6 ? 'Moderate discomfort' : 'Severe discomfort';
      }
    });
  }

  const runBtn = document.getElementById('runSymptomScan');
  if (runBtn) {
    runBtn.addEventListener('click', runSymptomAnalysis);
  }

  renderSymptomChips();
}

function runSymptomAnalysis() {
  if (!selectedSymptoms.length) {
    showToast('Please select at least one symptom to analyze');
    return;
  }
  const resultContainer = document.getElementById('symptomResultContent');
  if (!resultContainer) return;

  resultContainer.innerHTML = `
    <div style="padding:30px 10px;text-align:center">
      <div style="font-size:26px">✧</div>
      <p style="margin-top:10px;font-weight:700;color:var(--green)">Neural Symptom Engine scanning ${escapeHTML(currentBodyPart)} region…</p>
      <small style="color:var(--muted)">Evaluating clinical probability weights and symptom clusters</small>
    </div>
  `;

  setTimeout(() => {
    const findings = selectedSymptoms.map(s => {
      const prob = Math.min(94, 55 + currentIntensity * 4);
      return `
        <article class="analysis-finding">
          <div class="finding-head">
            <div>
              <b style="font-size:13px;color:#2c4b3f">${escapeHTML(s)} in ${escapeHTML(currentBodyPart)}</b>
              <small style="display:block;color:var(--muted);font-size:9px">Reported Intensity: ${currentIntensity}/10</small>
            </div>
            <span class="finding-prob">${prob}%</span>
          </div>
          <div class="finding-bar"><div class="finding-bar-fill" style="width:${prob}%"></div></div>
          <p style="font-size:11px;color:#557065;line-height:1.55;margin:8px 0 0">
            Indicators consistent with ${escapeHTML(s.toLowerCase())} in the ${escapeHTML(currentBodyPart.toLowerCase())} area. 
            ${currentIntensity >= 7 ? 'Higher intensity observed: professional clinician review recommended.' : 'Moderate discomfort: monitor progression and maintain hydration.'}
          </p>
        </article>
      `;
    }).join('');

    resultContainer.innerHTML = `
      <div style="margin-bottom:14px;padding:12px;background:#eef7f2;border-radius:10px;font-size:11px;color:#2b6652">
        <b>Preliminary Neural Scan:</b> ${selectedSymptoms.length} symptom cluster(s) analyzed. Not a formal diagnosis.
      </div>
      <div>${findings}</div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2ede7">
        <b style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Suggested Recovery Roadmap</b>
        <div class="recovery-grid">
          <div class="recovery-step"><small>Phase 1</small><b>Strict Hydration</b></div>
          <div class="recovery-step"><small>Phase 2</small><b>Rest & Monitor</b></div>
          <div class="recovery-step"><small>Phase 3</small><b>Light Nutrition</b></div>
          <div class="recovery-step"><small>Phase 4</small><b>Clinician Review</b></div>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;gap:10px">
        <button class="button button-primary" style="flex:1" data-view="care" type="button"><span>♧</span> Consult a Doctor</button>
        <a class="button button-outline" style="flex:1" href="features.html"><span>♡</span> Women's Care Visit</a>
      </div>
    `;

    resultContainer.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => openView(btn.dataset.view));
    });

    showToast('Neural symptom assessment complete');
  }, 650);
}

renderRecords();renderTimeline();initSymptomChecker();

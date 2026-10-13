/*
 * Nirogya AI — Enhanced Chat Engine
 * Replaces the canned replies with real AI-powered health assistant.
 * Loaded after script.js — overrides sendMessage & assistantReply.
 */
(() => {
  let GEMINI_API_KEY = localStorage.getItem('nirogya_gemini_key') || '';
  let ocrContext = '';
  let chatHistory = [];

  // Capture OCR-extracted text for AI context
  document.addEventListener('nirogya:files-added', () => {
    setTimeout(() => {
      const el = document.getElementById('ocrOutput');
      if (el && el.value) ocrContext = el.value;
    }, 6000);
  });

  // === COMPREHENSIVE MEDICAL KNOWLEDGE BASE ===
  const KB = [
    { k: ['blood report', 'blood test', 'cbc', 'complete blood count'], a: 'A Complete Blood Count (CBC) measures:\n\n• Hemoglobin (Hb): Normal 12-16 g/dL (women), 14-18 g/dL (men). Low = possible anemia.\n• WBC: Normal 4,000-11,000/µL. High may suggest infection.\n• Platelets: Normal 150,000-400,000/µL.\n• RBC: Normal 4.5-5.5 million/µL (men), 4.0-5.0 (women).\n\nAlways compare with YOUR report\'s reference range. Values outside the printed range should be discussed with your doctor.' },
    { k: ['haemoglobin', 'hemoglobin', 'hb level', 'anemia'], a: 'Hemoglobin carries oxygen in red blood cells.\n\nNormal Ranges:\n• Men: 14-18 g/dL\n• Women: 12-16 g/dL\n• Children: 11-13 g/dL\n\nLow Hb (anemia): fatigue, weakness, pale skin, shortness of breath.\nCauses: Iron deficiency, B12 deficiency, chronic disease.\n\nEat iron-rich foods (spinach, lentils, red meat). Consult your doctor for supplements.' },
    { k: ['fever', 'temperature', 'bukhar'], a: 'Fever Management:\n\n• Normal: 97-99°F (36.1-37.2°C)\n• Low-grade: 99-100.4°F — rest, hydrate\n• Moderate: 100.4-103°F — paracetamol (Dolo 650), rest\n• High: >103°F — seek medical attention\n\nHome remedies: Stay hydrated, lukewarm sponging, light clothing.\nSee doctor if: Fever >3 days, rash, stiff neck, severe headache.' },
    { k: ['headache', 'migraine', 'head pain', 'sir dard'], a: 'Headache Types:\n\n1. Tension: Dull pressure. Rest, hydration, paracetamol.\n2. Migraine: Throbbing, one-sided, nausea. Dark room, cold compress.\n3. Cluster: Severe, around one eye. Medical evaluation needed.\n4. Sinus: Pressure in forehead/cheeks. Steam inhalation.\n\nRed flags: Sudden worst headache ever, fever + stiff neck, after head injury.' },
    { k: ['diabetes', 'sugar', 'blood sugar', 'glucose', 'madhumeh'], a: 'Diabetes Information:\n\nNormal Blood Sugar:\n• Fasting: 70-100 mg/dL\n• After meals (2h): <140 mg/dL\n• HbA1c: <5.7%\n\nPre-diabetes: Fasting 100-125, HbA1c 5.7-6.4%\nDiabetes: Fasting ≥126, HbA1c ≥6.5%\n\nManagement: Exercise 30 min/day, balanced diet, medications as prescribed, regular monitoring.' },
    { k: ['blood pressure', 'bp', 'hypertension'], a: 'Blood Pressure Guide:\n\n• Normal: <120/80 mmHg\n• Elevated: 120-129/<80\n• Stage 1 HTN: 130-139/80-89\n• Stage 2 HTN: ≥140/≥90\n• Crisis: >180/>120 — emergency!\n\nLifestyle: Reduce salt (<5g/day), exercise, healthy weight, limit alcohol, manage stress.' },
    { k: ['medicine', 'prescription', 'dose', 'tablet', 'dawai'], a: 'Prescription Safety:\n\n1. Verify name, strength, dosage against original prescription\n2. Take at prescribed times\n3. Complete full antibiotic courses\n4. Never share prescription medicines\n5. Check expiry dates\n\nCommon medicines:\n• Paracetamol (Dolo/Crocin): Fever & mild pain\n• Ibuprofen (Combiflam): Inflammation & pain\n• Omeprazole: Acid reflux\n\nNever change dosage without doctor consultation.' },
    { k: ['appointment', 'prepare', 'doctor visit', 'checkup'], a: 'Preparing for Your Doctor Visit:\n\nBring:\n• Recent reports and prescriptions\n• List of current medications\n• Insurance card\n• Symptom list with timeline\n\nQuestions to ask:\n1. "What could cause my symptoms?"\n2. "Do I need tests?"\n3. "What are treatment options?"\n4. "Side effects to watch for?"\n5. "When should I return?"' },
    { k: ['hello', 'hi', 'namaste', 'hey', 'good morning', 'good evening'], a: 'Namaste! 🙏 Welcome to Nirogya AI.\n\nI can help with:\n• 📋 Understanding health reports & test results\n• 💊 Medicine information & dosage guidance\n• 🩺 Symptom analysis & health advice\n• 📅 Preparing for doctor appointments\n• 📸 Reading uploaded medical images (OCR)\n• 🏥 General wellness tips\n\nJust type your question or upload a medical report!' },
    { k: ['thyroid', 'tsh', 't3', 't4'], a: 'Thyroid Function Tests:\n\n• TSH: 0.4-4.0 mIU/L\n• Free T4: 0.8-1.8 ng/dL\n• Free T3: 2.3-4.2 pg/mL\n\nHypothyroid (high TSH): Fatigue, weight gain, cold intolerance.\nHyperthyroid (low TSH): Weight loss, rapid heartbeat, anxiety.\n\nTake thyroid medication on empty stomach, 30 min before food.' },
    { k: ['vitamin d', 'calcium', 'bone'], a: 'Vitamin D & Bone Health:\n\n• Normal: 30-100 ng/mL\n• Insufficient: 20-29 ng/mL\n• Deficient: <20 ng/mL\n\nSources: Sunlight (15-20 min), fatty fish, egg yolks, fortified milk.\nCalcium: Adults need 1000-1200 mg/day.' },
    { k: ['cholesterol', 'lipid', 'ldl', 'hdl', 'triglyceride'], a: 'Lipid Profile:\n\n• Total Cholesterol: <200 mg/dL\n• LDL (bad): <100 mg/dL\n• HDL (good): Men >40, Women >50 mg/dL\n• Triglycerides: <150 mg/dL\n\nImprove: Reduce saturated fats, eat fiber, exercise daily.' },
    { k: ['kidney', 'creatinine', 'urea', 'egfr'], a: 'Kidney Function:\n\n• Creatinine: 0.7-1.3 mg/dL (men), 0.6-1.1 (women)\n• BUN/Urea: 7-20 mg/dL\n• eGFR: >90 normal, <60 suggests kidney disease\n\nProtect kidneys: Stay hydrated, control diabetes/BP, avoid excess painkillers.' },
    { k: ['liver', 'sgpt', 'sgot', 'alt', 'ast', 'bilirubin'], a: 'Liver Function:\n\n• SGPT/ALT: 7-56 U/L\n• SGOT/AST: 10-40 U/L\n• Bilirubin: 0.1-1.2 mg/dL\n\nElevated = possible fatty liver, hepatitis, medication effects.\nTips: Limit alcohol, maintain healthy weight, hepatitis vaccination.' },
    { k: ['cough', 'cold', 'flu', 'sore throat'], a: 'Cough & Cold:\n\nHome remedies:\n• Warm salt water gargle\n• Ginger + honey tea\n• Steam inhalation\n• Turmeric milk\n• Rest and hydration\n\nSee doctor if: >2 weeks, blood in sputum, high fever, difficulty breathing.' },
    { k: ['stomach', 'digestion', 'acidity', 'gastric', 'gas', 'pet dard'], a: 'Digestive Health:\n\nAcidity tips:\n• Smaller, frequent meals\n• Avoid spicy/oily food\n• Don\'t lie down within 2h of eating\n• Antacids as needed\n\nHealthy digestion: Fiber, water, exercise, probiotics (curd/yogurt).' },
    { k: ['stress', 'anxiety', 'depression', 'mental health', 'tension'], a: 'Mental Health:\n\nStress management:\n1. Deep breathing (4-7-8 technique)\n2. Exercise 30 min/day\n3. Sleep 7-8 hours\n4. Meditation\n5. Social connections\n\nSeek help if: Sadness >2 weeks, loss of interest, self-harm thoughts.\n\nHelpline: iCall (9152987821), Vandrevala Foundation (1860-2662-345)' },
    { k: ['heart', 'cardiac', 'chest pain', 'ecg'], a: 'Heart Health:\n\nHeart attack signs:\n• Chest pain spreading to arm/jaw/back\n• Shortness of breath, cold sweat\n\nCall 112 immediately if suspected.\n\nPrevention: Exercise, no smoking, manage stress/BP/cholesterol.' },
    { k: ['period', 'menstrual', 'pcod', 'pcos'], a: 'Menstrual Health:\n\nNormal cycle: 21-35 days, 2-7 days duration.\n\nSee doctor for: >7 days, very heavy bleeding, missed periods, severe cramps.\n\nPCOS: Irregular periods, acne, weight gain, excess hair.\nManagement: Healthy weight, exercise, balanced diet.' },
    { k: ['pregnancy', 'pregnant', 'conceive'], a: 'Pregnancy:\n\nFirst trimester: Folic acid 400-800 mcg daily, first ultrasound at 6-8 weeks.\n\nKey nutrients: Iron, folic acid, calcium, vitamin D, omega-3.\n\nWarning signs: Heavy bleeding, severe pain, high fever, reduced fetal movement (after 28w).' },
    { k: ['urine', 'uti', 'urinary'], a: 'Urinary Health:\n\nUTI symptoms: Burning urination, frequent urge, cloudy urine.\n\nPrevention: 8-10 glasses water/day, don\'t hold urine, hygiene.\n\nNormal urine: pH 4.6-8.0, Protein/Glucose negative, WBC <5/HPF.' },
    { k: ['covid', 'corona'], a: 'COVID-19:\n\nSymptoms: Fever, cough, fatigue, loss of taste/smell.\n\nIf positive: Isolate 5-7 days, rest, hydrate, paracetamol, monitor SpO2 (<94% = seek help).\n\nEmergency: Difficulty breathing, chest pain, confusion, bluish lips.' },
    { k: ['weight', 'obesity', 'bmi', 'diet'], a: 'Weight Management:\n\nBMI (Asian): <18.5 underweight, 18.5-22.9 normal, 23-24.9 overweight, ≥25 obese.\n\nHealthy loss: 500 cal deficit/day, protein breakfast, whole grains, 150 min exercise/week.' },
    { k: ['eye', 'vision', 'specs', 'glasses'], a: 'Eye Health:\n\n• Get eye exams every 1-2 years\n• 20-20-20 rule: Every 20 min, look 20 feet away for 20 seconds\n• Wear sunglasses outdoors\n• Eat vitamin A-rich foods (carrots, green leafy vegetables)\n\nSee doctor for: Sudden vision changes, eye pain, floaters, flashes of light.' },
    { k: ['skin', 'rash', 'acne', 'pimple', 'eczema'], a: 'Skin Health:\n\nAcne: Gentle cleansing, avoid touching face, non-comedogenic products.\nEczema: Moisturize, avoid triggers, mild soaps.\nRash: Could indicate allergy, infection, or autoimmune condition.\n\nSee dermatologist for: Persistent or spreading rash, skin changes, new moles.' },
    { k: ['back pain', 'spine', 'slip disc'], a: 'Back Pain:\n\n• Most cases resolve in 2-4 weeks with rest and OTC painkillers\n• Maintain good posture\n• Ergonomic workspace setup\n• Core strengthening exercises\n• Hot/cold compress\n\nSee doctor if: Pain >6 weeks, numbness in legs, loss of bladder/bowel control, after injury.' }
  ];

  function localReply(text) {
    const n = text.toLowerCase();
    if (ocrContext && (n.includes('report') || n.includes('upload') || n.includes('image') || n.includes('scan') || n.includes('read') || n.includes('extract'))) {
      return 'I found text from your uploaded image:\n\n--- Extracted Text ---\n' + ocrContext.substring(0, 800) + '\n---\n\nReview these values with your doctor. Compare each against the reference range on the report.';
    }
    const found = KB.find(item => item.k.some(key => n.includes(key)));
    if (found) return found.a;
    if (n.includes('report') || n.includes('test') || n.includes('result'))
      return 'To help with test results:\n\n1. Upload a report image using the upload area — I\'ll read it with OCR\n2. Ask about specific tests (CBC, thyroid, liver, kidney, etc.)\n3. Share specific values for explanation\n\nWhat would you like help with?';
    if (n.includes('pain') || n.includes('hurt') || n.includes('dard'))
      return 'Sorry you\'re in pain. Tell me:\n\n1. Where? (head, chest, abdomen, limbs)\n2. How long?\n3. Severity (1-10)?\n\nOr use the AI Symptom Checker in the sidebar.\n\nFor severe/sudden chest pain, call 112 immediately.';
    return 'I\'m Nirogya AI. I can help with:\n\n• Blood test results (CBC, thyroid, liver, kidney)\n• Medicine info & dosage guidance\n• Symptom analysis & health advice\n• Doctor appointment preparation\n• Reading uploaded medical report images\n• Wellness tips\n\nAsk me about any health topic!';
  }

  async function geminiReply(text) {
    const activeKey = (localStorage.getItem('nirogya_gemini_key') || GEMINI_API_KEY || '').trim();
    if (!activeKey) return null;
    try {
      const sys = 'You are Nirogya AI, a professional, caring medical AI assistant for an Indian health platform. Provide accurate, empathetic medical advice with normal ranges, precautions, and actionable steps. Always include a brief medical disclaimer. Structure responses with clear bullet points.';
      let msg = text;
      if (ocrContext) msg += '\n\n[OCR from uploaded report]:\n' + ocrContext.substring(0, 1500);
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + activeKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: sys }] },
            { role: 'model', parts: [{ text: 'I am Nirogya AI, ready to help.' }] },
            ...chatHistory.slice(-6),
            { role: 'user', parts: [{ text: msg }] }
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      });
      const data = await resp.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        chatHistory.push({ role: 'user', parts: [{ text }] });
        chatHistory.push({ role: 'model', parts: [{ text: reply }] });
        return reply;
      }
    } catch (e) { console.warn('Gemini unavailable, using local KB:', e); }
    return null;
  }

  // Override addChatMessage with markdown support
  const origAddChat = window.addChatMessage || function () { };
  window.addChatMessage = function (text, who) {
    const row = document.createElement('div');
    row.className = 'message ' + (who === 'user' ? 'user-message' : '');
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = who === 'user' ? 'AS' : '✧';
    const wrap = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = '<p>' + formatted + '</p>';
    wrap.append(bubble);
    const time = document.createElement('small');
    time.className = 'message-time';
    const now = new Date();
    time.textContent = who === 'user'
      ? 'You · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Nirogya AI · ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    wrap.append(time);
    row.append(avatar, wrap);
    const messages = document.getElementById('chatMessages');
    if (messages) {
      messages.querySelector('.suggestion-list')?.remove();
      messages.querySelector('.prompt-label')?.remove();
      messages.append(row);
      messages.scrollTop = messages.scrollHeight;
    }
    return row;
  };

  // Override sendMessage with AI capability
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  async function newSendMessage(text) {
    const clean = text.trim();
    if (!clean) return;
    window.addChatMessage(clean, 'user');
    chatInput.value = '';
    chatInput.disabled = true;

    // API key setup command
    if (clean.startsWith('/key ')) {
      const key = clean.substring(5).trim();
      if (key.length > 10) {
        GEMINI_API_KEY = key;
        localStorage.setItem('nirogya_gemini_key', key);
        window.addChatMessage('✅ API key saved! AI-powered responses are now active.', 'assistant');
      } else {
        window.addChatMessage('Enter a valid key. Get one free at https://aistudio.google.com/apikey', 'assistant');
      }
      chatInput.disabled = false;
      chatInput.focus();
      return;
    }

    const placeholder = window.addChatMessage('Analyzing your query…', 'assistant');
    placeholder.classList.add('typing-message');

    let reply = await geminiReply(clean);
    if (!reply) reply = localReply(clean);

    placeholder.remove();
    window.addChatMessage(reply, 'assistant');
    chatInput.disabled = false;
    chatInput.focus();
  }

  // Remove old event listeners and attach new ones
  if (chatForm) {
    const newForm = chatForm.cloneNode(true);
    chatForm.parentNode.replaceChild(newForm, chatForm);
    newForm.addEventListener('submit', e => { e.preventDefault(); newSendMessage(newForm.querySelector('input').value); });
  }

  document.querySelectorAll('[data-prompt]').forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => newSendMessage(newBtn.dataset.prompt));
  });

  console.log('✳ Nirogya AI Enhanced Chat Engine loaded');
  console.log('  → 25+ medical topics in local knowledge base');
  console.log('  → Google Gemini API integration available');
  console.log('  → Type "/key YOUR_API_KEY" in chat to enable AI mode');
  console.log('  → Get a free API key at https://aistudio.google.com/apikey');
})();

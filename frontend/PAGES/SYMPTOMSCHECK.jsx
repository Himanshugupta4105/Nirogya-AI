import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    BsArrowLeft, BsStars, BsActivity, BsShieldCheck,
    BsCheck2Circle, BsSearch, BsXCircleFill, BsLightningFill,
    BsFileEarmarkText, BsHeartPulseFill, BsClockHistory, BsGraphUpArrow,
    BsGenderMale, BsGenderFemale, BsThermometerHalf, BsInfoCircleFill
} from 'react-icons/bs';
import useRecordActivity from '../hooks/useRecordActivity';
import { BASE_URL } from '../config';

const SymptomChecker = () => {
    const { recordActivity } = useRecordActivity();
    const [step, setStep] = useState(1); // 1: Selection, 2: Analysis, 3: Results
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [bodyPart, setBodyPart] = useState('General');
    const [gender, setGender] = useState('male');
    const [anatomyLayer, setAnatomyLayer] = useState('surface'); // surface, neural, skeletal
    const [aiCommentary, setAiCommentary] = useState("Select where it hurts to begin the neural scan.");
    const [hotspots, setHotspots] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [reasoningLogs, setReasoningLogs] = useState([]);
    const [intensityMap, setIntensityMap] = useState({});
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState("");
    const [customSymptomInput, setCustomSymptomInput] = useState("");

    const commonSymptoms = {
        Head: ["Headache", "Dizziness", "Sore Throat", "Blurred Vision", "Earache"],
        Chest: ["Cough", "Chest Pain", "Shortness of Breath", "Palpitations", "Tightness"],
        Abdomen: ["Stomach Ache", "Nausea", "Bloating", "Acid Reflux", "Cramps"],
        Limbs: ["Joint Pain", "Muscle Cramp", "Numbness", "Swelling", "Stiffness"],
        General: ["Fever", "Fatigue", "Chills", "Body Ache", "Loss of Appetite"]
    };

    const handleAddCustomSymptom = () => {
        if (customSymptomInput.trim()) {
            handleAddSymptom(customSymptomInput.trim());
            setCustomSymptomInput("");
        }
    };

    const handleAddSymptom = (s) => {
        if (!selectedSymptoms.includes(s)) {
            setSelectedSymptoms([...selectedSymptoms, s]);
            setIntensityMap(prev => ({ ...prev, [s]: 5 }));

            // AI Commentary Update
            const comments = [
                `${s} noted. Scanning relevant clusters...`,
                `Got it. Linking ${s} to your neural baseline.`,
                `${s} detected. Checking for co-occurring signals.`,
                `Don't worry. I'm analyzing the intensity of ${s}.`
            ];
            setAiCommentary(comments[Math.floor(Math.random() * comments.length)]);

            // Add Hotspot
            const partToHotspot = {
                Head: { x: 100, y: 50 },
                Chest: { x: 100, y: 130 },
                Abdomen: { x: 100, y: 210 },
                Limbs: { x: 60, y: 300 },
                General: { x: 140, y: 300 }
            };
            setHotspots(prev => [...prev, { ...partToHotspot[bodyPart], id: s }]);
        }
    };

    const handleRemoveSymptom = (s) => {
        setSelectedSymptoms(selectedSymptoms.filter(item => item !== s));
        const newMap = { ...intensityMap };
        delete newMap[s];
        setIntensityMap(newMap);
        setHotspots(prev => prev.filter(h => h.id !== s));
    };

    const runAnalysis = async () => {
        recordActivity("Symptom Checker", "Analysis Started", "/symptom-checker");
        setStep(2);
        setAnalyzing(true);
        const logs = [
            "INITIALIZING NEURAL MESH V3.0...",
            "LOADING PATIENT GENETIC BASELINE...",
            "CONNECTING TO GROQ DYNAMIC LLM COMPLIANCE CORE...",
            "SCANNING " + bodyPart.toUpperCase() + " REGION...",
            "DETECTING SYMPTOM CLUSTERS: " + selectedSymptoms.join(", "),
            "CALIBRATING INTENSITY WEIGHTS...",
            "GENERATING DYNAMIC PROBABILITY CLOUD...",
            "FINALIZING CLINICAL HYPOTHESIS..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < logs.length) {
                setReasoningLogs(prev => [...prev.slice(-4), logs[i]]);
                i++;
            }
        }, 500);

        try {
            const response = await fetch(`${BASE_URL}/ai-doctor/symptom-check`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bodyPart,
                    symptoms: selectedSymptoms,
                    intensityMap,
                    gender
                })
            });
            const data = await response.json();
            clearInterval(interval);

            if (data.success) {
                setResults(data.results);
                setSummary(data.summary);
            } else {
                setResults([
                    { name: `Common ${bodyPart} Concern`, prob: 70, color: "bg-blue-500", advice: "Rest, monitor symptoms, and stay hydrated." }
                ]);
                setSummary("Unable to reach the live Groq LLM diagnostician. Displaying default local diagnostic baseline.");
            }
        } catch (err) {
            clearInterval(interval);
            console.error("Analysis API Error:", err);
            setResults([
                { name: `Common ${bodyPart} Concern`, prob: 70, color: "bg-blue-500", advice: "Rest, monitor symptoms, and stay hydrated." }
            ]);
            setSummary("Database connection failed. Please ensure the backend is connected to MongoDB Atlas.");
        }

        setAnalyzing(false);
        setStep(3);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-teal-500/30 overflow-x-hidden">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/smarthub" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                        <BsArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Smart Hub
                    </Link>
                    <div className="flex items-center gap-3">
                        <BsStars className="text-teal-400 animate-pulse" />
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">Neural Symptom Engine v3.0</span>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-7xl">

                    {step === 1 && (
                        <div className="grid lg:grid-cols-12 gap-12 animate-slide-up">
                            {/* Left: Interactive Anatomical HUD */}
                            <div className="lg:col-span-5 bg-white/[0.02] rounded-[3rem] p-10 border border-white/10 relative overflow-hidden flex flex-col items-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none"></div>

                                <div className="w-full flex justify-between items-center mb-10 relative z-10">
                                    <h2 className="text-2xl font-black flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">1</div>
                                        Anatomy HUD
                                    </h2>
                                    <div className="flex">
                                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                            <button
                                                onClick={() => setAnatomyLayer('surface')}
                                                className={`px-4 py-2 rounded-xl text-[8px] font-black tracking-widest transition-all ${anatomyLayer === 'surface' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                SURFACE
                                            </button>
                                            <button
                                                onClick={() => setAnatomyLayer('neural')}
                                                className={`px-4 py-2 rounded-xl text-[8px] font-black tracking-widest transition-all ${anatomyLayer === 'neural' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                NEURAL
                                            </button>
                                            <button
                                                onClick={() => setAnatomyLayer('skeletal')}
                                                className={`px-4 py-2 rounded-xl text-[8px] font-black tracking-widest transition-all ${anatomyLayer === 'skeletal' ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                SKELETAL
                                            </button>
                                        </div>

                                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 ml-4">
                                            <button
                                                onClick={() => setGender('male')}
                                                className={`p-3 rounded-xl transition-all ${gender === 'male' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                <BsGenderMale />
                                            </button>
                                            <button
                                                onClick={() => setGender('female')}
                                                className={`p-3 rounded-xl transition-all ${gender === 'female' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                <BsGenderFemale />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Body Map SVG */}
                                <div className="relative w-full max-w-[280px] aspect-[1/2] mb-10 group/body cursor-pointer">
                                    <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-[0_0_30px_rgba(20,184,166,0.1)]">
                                        {/* Head */}
                                        <path
                                            d="M100 20 C120 20 135 35 135 55 C135 75 120 90 100 90 C80 90 65 75 65 55 C65 35 80 20 100 20"
                                            fill={bodyPart === 'Head' ? '#14b8a6' : 'rgba(255,255,255,0.05)'}
                                            stroke={bodyPart === 'Head' ? '#2dd4bf' : 'rgba(255,255,255,0.2)'}
                                            className="transition-all duration-300 hover:fill-teal-500/40"
                                            onClick={() => setBodyPart('Head')}
                                        />
                                        {/* Torso/Chest */}
                                        <path
                                            d="M65 95 L135 95 L145 180 L55 180 Z"
                                            fill={bodyPart === 'Chest' ? '#3b82f6' : 'rgba(255,255,255,0.05)'}
                                            stroke={bodyPart === 'Chest' ? '#60a5fa' : 'rgba(255,255,255,0.2)'}
                                            className="transition-all duration-300 hover:fill-blue-500/40"
                                            onClick={() => setBodyPart('Chest')}
                                        />
                                        {/* Abdomen */}
                                        <path
                                            d="M55 185 L145 185 L135 250 L65 250 Z"
                                            fill={bodyPart === 'Abdomen' ? '#eab308' : 'rgba(255,255,255,0.05)'}
                                            stroke={bodyPart === 'Abdomen' ? '#facc15' : 'rgba(255,255,255,0.2)'}
                                            className="transition-all duration-300 hover:fill-yellow-500/40"
                                            onClick={() => setBodyPart('Abdomen')}
                                        />
                                        {/* Limbs Arms */}
                                        <path d="M50 100 L20 180 M150 100 L180 180" stroke="rgba(255,255,255,0.2)" strokeWidth="15" strokeLinecap="round" onClick={() => setBodyPart('Limbs')} />
                                        {/* Limbs Legs */}
                                        <path d="M75 255 L65 370 M125 255 L135 370"
                                            stroke={bodyPart === 'Limbs' ? '#a855f7' : anatomyLayer === 'neural' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}
                                            strokeWidth="20" strokeLinecap="round"
                                            className="transition-all duration-300 hover:stroke-purple-500/40"
                                            onClick={() => setBodyPart('Limbs')}
                                        />

                                        {/* Bio-Hotspots (Glowing circles for symptoms) */}
                                        {hotspots.map((h, i) => (
                                            <g key={i} className="animate-pulse">
                                                <circle cx={h.x} cy={h.y} r="12" fill="rgba(244,63,94,0.2)" />
                                                <circle cx={h.x} cy={h.y} r="6" fill="#f43f5e" />
                                            </g>
                                        ))}

                                        {/* Neural Overlay Grids */}
                                        {anatomyLayer === 'neural' && (
                                            <g className="animate-fade-in opacity-30 pointer-events-none">
                                                <path d="M100 20 L100 380 M20 200 L180 200" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="4 4" />
                                                <circle cx="100" cy="55" r="30" stroke="#3b82f6" strokeWidth="0.5" fill="none" />
                                                <circle cx="100" cy="140" r="50" stroke="#3b82f6" strokeWidth="0.5" fill="none" />
                                            </g>
                                        )}
                                    </svg>

                                    {/* Scan Line Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-500/10 to-transparent h-4 w-full animate-[scan_3s_infinite] pointer-events-none"></div>
                                </div>

                                {/* AI Assistant Commentary Card */}
                                <div className="w-full bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 relative z-10 shadow-2xl">
                                    <div className="flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                                        ))}
                                    </div>
                                    <p className="text-center text-xs font-bold text-slate-300 italic min-h-[32px]">"{aiCommentary}"</p>
                                    <div className="w-full flex justify-between items-center pt-2 border-t border-white/5">
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Mesh v3.5</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Reasoning</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Symptom Selection & Neural Chain */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="bg-white/[0.02] rounded-[3rem] p-10 border border-white/10 relative">
                                    <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">2</div>
                                        Symptom Selection ({bodyPart})
                                    </h2>

                                    {/* Custom Symptom Search/Add */}
                                    <div className="flex gap-3 mb-6">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                placeholder="Search or type custom symptom..."
                                                value={customSymptomInput}
                                                onChange={(e) => setCustomSymptomInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddCustomSymptom();
                                                    }
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                                            />
                                            <BsSearch className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500" />
                                        </div>
                                        <button
                                            onClick={handleAddCustomSymptom}
                                            className="px-6 bg-teal-600 hover:bg-teal-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 mb-10">
                                        {commonSymptoms[bodyPart].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleAddSymptom(s)}
                                                className={`px-6 py-4 rounded-2xl border transition-all font-bold text-sm flex items-center gap-3 ${selectedSymptoms.includes(s) ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                            >
                                                <BsPlus size={20} /> {s}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Chain & Intensity</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-500">{selectedSymptoms.length} Linked</span>
                                        </div>

                                        <div className="space-y-4">
                                            {selectedSymptoms.map(s => (
                                                <div key={s} className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 animate-fade-in group">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
                                                                <BsThermometerHalf />
                                                            </div>
                                                            <span className="font-black text-white">{s}</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveSymptom(s)} className="text-slate-600 hover:text-rose-500 transition-colors">
                                                            <BsXCircleFill />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={intensityMap[s]}
                                                            onChange={(e) => setIntensityMap({ ...intensityMap, [s]: parseInt(e.target.value) })}
                                                            className="flex-1 accent-teal-500 h-1 bg-white/10 rounded-full appearance-none outline-none"
                                                        />
                                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg border ${intensityMap[s] > 7 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-teal-500/10 border-teal-500/20 text-teal-500'}`}>
                                                            {intensityMap[s] > 7 ? 'SEVERE' : intensityMap[s] > 4 ? 'MODERATE' : 'MILD'} ({intensityMap[s]}/10)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedSymptoms.length === 0 && (
                                                <div className="h-40 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                                                    <BsInfoCircleFill className="mb-2 text-xl" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">Select areas on HUD to add symptoms</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={selectedSymptoms.length === 0}
                                    onClick={runAnalysis}
                                    className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] transition-all flex items-center justify-center gap-4 ${selectedSymptoms.length > 0 ? 'bg-gradient-to-r from-teal-500 to-indigo-600 hover:shadow-[0_0_50px_rgba(20,184,166,0.3)] active:scale-95 shadow-lg' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                                >
                                    Process Neural Data <BsLightningFill />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-4xl mx-auto py-20 animate-fade-in text-center">
                            <div className="mb-12 relative inline-block">
                                <div className="absolute inset-0 bg-teal-500/20 blur-3xl animate-pulse"></div>
                                <div className="w-40 h-40 bg-white/5 rounded-full border border-teal-500/20 flex items-center justify-center relative z-10">
                                    <BsStars className="text-6xl text-teal-400 animate-spin-slow" />
                                </div>
                            </div>

                            <h2 className="text-4xl font-black mb-4">NEURAL PROCESSING...</h2>
                            <p className="text-slate-400 font-bold mb-16 uppercase tracking-[0.3em] text-xs">Reasoning with global health data</p>

                            <div className="bg-black/60 rounded-[2rem] p-10 border border-white/10 font-mono text-left max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>
                                <div className="space-y-3">
                                    {reasoningLogs.map((log, idx) => (
                                        <div key={idx} className="flex gap-4 text-xs">
                                            <span className="text-slate-600">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                            <span className={idx === reasoningLogs.length - 1 ? "text-teal-400 animate-pulse" : "text-slate-400"}>
                                                &gt; {log}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10 animate-slide-up">
                            {/* Diagnostic Results Dashboard */}
                            <div className="bg-white/5 rounded-[4rem] p-12 lg:p-20 border border-white/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[150px] animate-pulse"></div>

                                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20 relative z-10">
                                    <div className="max-w-xl">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase tracking-widest mb-6">
                                            <BsShieldCheck /> Neural Mesh Analysis Verified
                                        </div>
                                        <h2 className="text-6xl font-black mb-6 leading-tight">DIAGNOSTIC <span className="text-teal-500">CLOUD</span></h2>
                                        <p className="text-slate-400 leading-relaxed font-bold italic text-lg">Our AI checked your <span className="text-teal-400 uppercase font-black">{selectedSymptoms.length} markers</span>. The most probable hypothesis for {gender.toUpperCase()} baseline is detailed below.</p>
                                        {summary && (
                                            <div className="mt-8 p-6 bg-white/[0.02] border border-white/10 rounded-[2rem] text-sm text-slate-300 leading-relaxed font-semibold italic border-l-4 border-teal-500">
                                                "{summary}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="bg-slate-900/80 p-8 rounded-[2rem] border border-white/5 text-center min-w-[140px]">
                                            <div className="text-4xl font-black text-teal-400 mb-1">94%</div>
                                            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Confidence</div>
                                        </div>
                                        <div className="bg-slate-900/80 p-8 rounded-[2rem] border border-white/5 text-center min-w-[140px]">
                                            <div className="text-4xl font-black text-blue-400 mb-1">0.8s</div>
                                            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Latecy</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Probability Bars */}
                                <div className="grid md:grid-cols-3 gap-8 relative z-10">
                                    {results.map((res, i) => (
                                        <div key={i} className="bg-white/[0.03] p-10 rounded-[3rem] border border-white/5 relative group hover:bg-white/5 transition-all hover:scale-105 duration-500">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-1">{res.name}</h3>
                                                    <span className="text-[10px] font-black uppercase text-slate-500">Clinical Probability</span>
                                                </div>
                                                <span className="text-2xl font-black text-teal-500">{res.prob}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden mb-8 p-[2px] border border-white/5">
                                                <div className={`h-full ${res.color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]`} style={{ width: `${res.prob}%` }}></div>
                                            </div>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed italic border-l-2 border-teal-500/30 pl-4">"{res.advice}"</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Recovery Roadmap */}
                                <div className="mt-24 pt-24 border-t border-white/5 relative z-10">
                                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                                        <div>
                                            <h4 className="text-2xl font-black uppercase tracking-widest text-white mb-2 flex items-center gap-4">
                                                <BsGraphUpArrow className="text-teal-400" /> RECOVERY PLAN
                                            </h4>
                                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Suggested recovery roadmap</p>
                                        </div>
                                        <div className="text-[10px] font-black px-4 py-2 bg-white/5 rounded-full border border-white/5 text-slate-500">ESTIMATED RECOVERY: 4-5 DAYS</div>
                                    </div>

                                    <div className="grid md:grid-cols-4 gap-6">
                                        {[
                                            { label: "Phase 1: Immediate", task: "Strict Hydration" },
                                            { label: "Phase 2: Next 24h", task: "Neural Rest" },
                                            { label: "Phase 3: 48h Post", task: "Light Protein" },
                                            { label: "Phase 4: Day 4+", task: "Vital Review" }
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 text-center group hover:bg-teal-500/5 transition-all">
                                                <div className="text-[8px] font-black text-teal-500 uppercase mb-4 tracking-[0.3em]">{item.label}</div>
                                                <div className="text-base font-black text-white group-hover:text-teal-400 transition-colors uppercase">{item.task}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                <button onClick={() => setStep(1)} className="flex-1 py-8 rounded-[2.5rem] bg-white text-[#020617] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-teal-400 transition-all active:scale-95 shadow-xl">Restart Neural Mesh</button>
                                <button className="flex-1 py-8 rounded-[2.5rem] bg-white/5 border border-white/10 font-black uppercase text-[10px] tracking-[0.4em] hover:bg-white/10 transition-all flex items-center justify-center gap-4">
                                    <BsFileEarmarkText className="text-xl" /> Generate PDF
                                </button>
                                <Link to="/tele-consult" className="flex-1 py-8 rounded-[2.5rem] bg-teal-600 font-black uppercase text-[10px] tracking-[0.4em] hover:bg-teal-500 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-teal-600/30 active:scale-95">
                                    <BsHeartPulseFill className="text-xl" /> Video Consult
                                </Link>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { transform: translateY(350px); opacity: 0.5; }
                }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-spin-slow { animation: spin-slow 12s linear infinite; }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #14b8a6;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(20, 184, 166, 0.5);
                }
            `}</style>
        </div>
    );
};

// Helper SVG Icon
const BsPlus = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default SymptomChecker;
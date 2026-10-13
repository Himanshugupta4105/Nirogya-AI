require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT') && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Nirogya AI Backend API',
        configured: Boolean(supabase),
        timestamp: new Date().toISOString()
    });
});

app.post('/api/auth/username-login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (!supabase) {
        return res.status(503).json({
            error: 'Backend is running in mock mode. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'
        });
    }

    try {
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id, email')
            .eq('username', username.toLowerCase().trim())
            .single();

        if (profileError || !profile || !profile.email) {
            return res.status(404).json({ error: 'No account found with this username.' });
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password
        });

        if (authError) {
            return res.status(401).json({ error: authError.message });
        }

        res.json({
            session: authData.session,
            user: authData.user
        });
    } catch (err) {
        console.error('Username login error:', err);
        res.status(500).json({ error: 'Authentication service error.' });
    }
});

app.post('/api/ai-doctor/symptom-check', (req, res) => {
    const { bodyPart, symptoms = [], intensityMap = {}, gender = 'general' } = req.body;

    if (!symptoms.length) {
        return res.status(400).json({ error: 'Please provide at least one symptom.' });
    }

    const results = symptoms.map((symptom, idx) => {
        const prob = Math.min(95, 60 + (intensityMap[symptom] || 5) * 4);
        const color = prob > 80 ? 'bg-red-500' : prob > 65 ? 'bg-amber-500' : 'bg-teal-500';
        return {
            id: idx + 1,
            name: `Observed ${symptom} Indicator`,
            prob,
            color,
            advice: `Indicators consistent with reported ${symptom.toLowerCase()} in the ${bodyPart} region. Monitor symptoms and consult a healthcare clinician.`,
            condition: `Observed ${symptom} Indicator`,
            likelihood: `${prob}%`,
            urgency: prob > 80 ? 'Moderate Priority' : 'Standard Routine',
            description: `Observable indicators aligned with reported ${symptom.toLowerCase()} in the ${bodyPart} area.`,
            action: 'Discuss observed progression with a physician or clinic provider.'
        };
    });

    const summary = `Preliminary analysis for ${symptoms.length} observed indicator(s) in the ${bodyPart} region (${gender}). No confirmed diagnosis is formed; consult a healthcare professional.`;

    res.json({
        success: true,
        summary,
        results
    });
});

app.listen(PORT, () => {
    console.log(`Nirogya AI backend listening on http://localhost:${PORT}`);
});

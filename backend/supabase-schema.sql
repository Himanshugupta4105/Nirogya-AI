-- Nirogya AI Database Schema (PostgreSQL / Supabase)

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doctor Profiles
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    clinic_name TEXT,
    years_experience INT DEFAULT 0,
    is_female BOOLEAN DEFAULT false,
    accepting_patients BOOLEAN DEFAULT true,
    consultation_fee INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments & Video Calls
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    consultation_type TEXT NOT NULL DEFAULT 'general',
    mode TEXT NOT NULL DEFAULT 'video',
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, scheduled, completed, cancelled
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Basic Public Read for Doctor Profiles
CREATE POLICY "Public doctors viewable" ON public.doctor_profiles
    FOR SELECT USING (accepting_patients = true);

-- Appointments access for participants
CREATE POLICY "Participants can view appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "Patients can insert appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors and patients can update appointments" ON public.appointments
    FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

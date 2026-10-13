# Nirogya AI Backend API

This backend provides optional backend authentication, username resolution, and clinical symptom checking services for Nirogya AI.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and set:
   ```env
   PORT=4000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Database Setup**:
   Execute `supabase-schema.sql` in your Supabase SQL Editor.

4. **Run the Server**:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The server will run on `http://localhost:4000`.

# Ryan & Hannah Wedding Planner

A shared Progressive Web App for wedding planning with real-time sync.

## Setup Instructions

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration: `supabase/migrations/001_init.sql`
3. Go to Authentication > Users and create two users (ryan@example.com, hannah@example.com) with passwords

### 2. Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Development
```bash
npm install
npm run dev
```

### 4. Deployment to Vercel
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### 5. Add to iPhone Home Screen
1. Open the app in Safari
2. Tap share button
3. "Add to Home Screen"
4. The app will appear as "R&H Planner" with custom icon

## Features
- Shared task list across devices
- Real-time sync
- Progress tracking
- Phase-based organization
- Category filtering
- PWA for native app feel

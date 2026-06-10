# e-Matica

Samostalna React/Vite aplikacija za sustav ŠkoleHR.

## Vercel environment variables

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_MODULE=ematica
```

## Supabase Auth

U Supabase Dashboardu pod Authentication > URL Configuration dodati:

```text
https://e-matica.skolehr.xyz
http://127.0.0.1:5173
```

## Local development

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

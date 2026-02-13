# Configuring Supabase with Vite

This app uses **Vite**, not Next.js. Supabase’s “Connect” modal often shows **Next.js** variable names. Use the **same values**, but with the names below so Vite exposes them to the client.

## What to put in `.env`

| Supabase dashboard / Next.js name | Use in this app (.env)        | Example / note |
|-----------------------------------|-------------------------------|----------------|
| **Project URL** (or `NEXT_PUBLIC_SUPABASE_URL`) | `VITE_SUPABASE_URL`           | `https://xxxx.supabase.co` |
| **anon public** key or **publishable** key (browser-safe) | `VITE_SUPABASE_ANON_KEY`     | Long JWT or `sb_publishable_...` |

- **URL:** Copy the Project URL exactly (e.g. `https://jweovmefiiekvcvhyayb.supabase.co`) and set it as `VITE_SUPABASE_URL`.
- **Key:** Use the key that is safe for the browser:
  - If you see **anon** / **anon public** on the API settings page, use that for `VITE_SUPABASE_ANON_KEY`.
  - If you only see **publishable** (e.g. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` / `sb_publishable_...`), use that value for `VITE_SUPABASE_ANON_KEY`.

Do **not** use the **secret** / **service_role** key in `.env` for this app; that key must never be exposed in the browser.

## Example `.env` (Vite)

```env
VITE_SUPABASE_URL=https://jweovmefiiekvcvhyayb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_ZIz7S66-JwLyg8xCellrlg_12mj-MJT
```

(Use your real Project URL and anon/publishable key from the dashboard.)

## Why the names differ

- **Next.js** exposes env vars that start with `NEXT_PUBLIC_` to the client.
- **Vite** only exposes vars that start with `VITE_`. So this app expects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The values from the Supabase dashboard are the same; only the variable names change.

After editing `.env`, restart the dev server (`npm run dev`) or rebuild for production (`npm run build`).

// Verifies the Supabase connection using credentials from .env.local.
// Run with: npm run verify:supabase
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key || url === 'YOUR_SUPABASE_URL' || key === 'YOUR_PUBLISHABLE_KEY') {
  console.error(
    'Missing/placeholder Supabase credentials. Fill in NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local first.'
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// auth.getSession() doesn't require any table to exist — it just confirms
// the URL/key pair is valid and the project is reachable.
const { error } = await supabase.auth.getSession();

if (error) {
  console.error('Supabase connection failed:', error.message);
  process.exit(1);
}

console.log('Supabase connection OK —', url);

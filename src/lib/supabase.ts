import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://howpsgxcctnuehnhfywc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvd3BzZ3hjY3RudWVobmhmeXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MjY1NDcsImV4cCI6MjA4MzAwMjU0N30.22Uv2Z49OGLM-BYiLe9p_q-UIKNk2Rvpevu5fxCGmvU'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

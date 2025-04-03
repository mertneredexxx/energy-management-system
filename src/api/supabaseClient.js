import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mzkiitfuodwasxnybpac.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16a2lpdGZ1b2R3YXN4bnlicGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2ODk3MzMsImV4cCI6MjA1OTI2NTczM30.IVY1eZY_wofMK2LRFJQDlgdvIvgof2HXZ0ldMRhOf70';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

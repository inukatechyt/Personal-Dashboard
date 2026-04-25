import { createClient } from '@supabase/supabase-js'

// කෙලින්ම ඔයාගේ ලින්ක් එකයි Key එකයි මෙතනට දාන්න
const supabaseUrl = 'https://ysbdxhyqjwfhqppcycgr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYmR4aHlxandmaHFwcGN5Y2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDUyMTgsImV4cCI6MjA5MjYyMTIxOH0.-jLBlEv3gQr2-0nK7UetRlEuRLHt8S_mihPTDpLG_FM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
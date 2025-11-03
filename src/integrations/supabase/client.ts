import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validação mais robusta
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY')
  
  console.error(`❌ Supabase credentials missing: ${missingVars.join(', ')}`)
  console.warn('⚠️ Configure these variables in Netlify Dashboard → Environment Variables')
}

// Validação de formato da URL
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('❌ VITE_SUPABASE_URL deve começar com https://')
}

// Validação de formato da chave (deve começar com sb_publishable_ ou eyJ)
if (supabaseAnonKey && !supabaseAnonKey.startsWith('sb_publishable_') && !supabaseAnonKey.startsWith('eyJ')) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY formato inválido. Deve ser uma publishable key ou anon key do Supabase')
}

// Criar cliente (mesmo sem credenciais para não quebrar o app)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Log em desenvolvimento para debug
if (import.meta.env.DEV && supabaseUrl && supabaseAnonKey) {
  console.log('✅ Supabase configurado:', {
    url: supabaseUrl.substring(0, 30) + '...',
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
  })
}


import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function getAdminRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')

  console.log('All Profiles:', data)
  if (error) {
    console.error('Error:', error)
  }
}
getAdminRoles()

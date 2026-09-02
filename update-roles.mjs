import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function updateRoles() {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'Staff' })
    .eq('role', 'Admin')
    .select()

  console.log('Updated Rows:', data)
  if (error) {
    console.error('Error:', error)
  }
}
updateRoles()

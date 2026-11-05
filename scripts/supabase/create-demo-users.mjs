// Node.js only. Never import this file into the browser application.
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_USERS_PASSWORD } = process.env
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !DEMO_USERS_PASSWORD || DEMO_USERS_PASSWORD.length < 12) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SECRET_KEY and DEMO_USERS_PASSWORD (at least 12 characters) in .env.supabase.')
}
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const users = [
  { email: 'manager@demo.ru', name: 'Александр Волков' },
  { email: 'ivan@demo.ru', name: 'Иван Петров' },
  { email: 'alexey@demo.ru', name: 'Алексей Смирнов' },
]
const existing = new Set()
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
  if (error) throw new Error(`Cannot list Auth users: ${error.message}`)
  for (const user of data.users) if (user.email) existing.add(user.email.toLowerCase())
  if (data.users.length < 100) break
}
for (const user of users) {
  if (existing.has(user.email)) { console.log(`Already exists, unchanged: ${user.email}`); continue }
  const { error } = await admin.auth.admin.createUser({ email: user.email, password: DEMO_USERS_PASSWORD, email_confirm: true, user_metadata: { full_name: user.name } })
  if (error) throw new Error(`Cannot create ${user.email}: ${error.message}`)
  console.log(`Created: ${user.email}`)
}
console.log('Auth users ready. Run supabase/seeds/demo.sql in SQL Editor to assign roles and load CRM data.')

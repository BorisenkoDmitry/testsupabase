// Exports the actual fixture source; no demo passwords are written to SQL or JSON.
// Optional: --snapshot path.json --out tmp/import.sql for a browser-local snapshot.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const source = readFileSync('src/shared/api/mock/seed.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { createSeed, demoUsers } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const option = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : null }
const snapshot = option('--snapshot')
const db = snapshot ? JSON.parse(readFileSync(snapshot, 'utf8')) : createSeed()
if (db.version !== 1 || !Array.isArray(db.objects) || !Array.isArray(db.tasks) || !Array.isArray(db.history)) throw new Error('Invalid mock database snapshot.')
const uuid = id => {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id
  const chars = createHash('sha256').update(`kontur-demo:${id}`).digest('hex').slice(0,32).split('')
  chars[12] = '4'; chars[16] = '8'
  const h = chars.join(''); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}
const quote = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const people = new Map(demoUsers.map(user => [user.id, user.email]))
const profile = id => { const email = people.get(id); if (!email) throw new Error(`Unknown mock user: ${id}`); return `(select id from public.profiles where email = ${quote(email)})` }
const objectIds = new Set(db.objects.map(row => row.id))
const taskIds = new Set(db.tasks.map(row => row.id))
for (const task of db.tasks) if (!objectIds.has(task.objectId)) throw new Error(`Missing object for ${task.id}`)
for (const event of db.history) if (!taskIds.has(event.taskId)) throw new Error(`Missing task for ${event.id}`)
const manager = demoUsers.find(user => user.role === 'manager')
const rows = []
rows.push(`-- Generated from ${snapshot ? 'an explicit browser snapshot' : 'src/shared/api/mock/seed.ts'}. Trusted SQL Editor only.
-- Preserves source timestamps, statuses and all history. Does not overwrite existing rows.
-- Run AFTER migrations 001/002 and create-demo-users.mjs. Demo data only, not production.
begin;
do $$ begin
  if (select count(*) from auth.users where lower(email) in (${demoUsers.map(user => quote(user.email)).join(', ')})) <> ${demoUsers.length} then
    raise exception 'Create the three Auth users first (scripts/supabase/create-demo-users.mjs).';
  end if;
end; $$;`)
for (const user of demoUsers) rows.push(`insert into public.profiles(id,full_name,email,role)
select id,${quote(user.name)},${quote(user.email)},${quote(user.role)} from auth.users where lower(email)=${quote(user.email)} on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from public.profiles where email=${quote(user.email)} and role=${quote(user.role)} and is_active) then
    raise exception 'Existing profile differs from expected demo role. Check profiles before importing.';
  end if;
end; $$;`)
for (const obj of db.objects) rows.push(`insert into public.objects(id,name,address,created_by,created_at,updated_at)
values(${quote(uuid(obj.id))},${quote(obj.name)},${quote(obj.address)},${profile(manager.id)},${quote(obj.createdAt)},${quote(obj.createdAt)}) on conflict(id) do nothing;`)
for (const task of db.tasks) {
  const events = db.history.filter(event => event.taskId === task.id)
  const lastTime = events.map(event => event.createdAt).sort().at(-1) ?? task.createdAt
  rows.push(`insert into public.tasks(id,title,description,object_id,assignee_id,status,author_id,created_at,updated_at,version)
values(${quote(uuid(task.id))},${quote(task.title)},${quote(task.description)},${quote(uuid(task.objectId))},${profile(task.assigneeId)},${quote(task.status)},${profile(task.authorId)},${quote(task.createdAt)},${quote(lastTime)},${Math.max(events.length,1)}) on conflict(id) do nothing;`)
  // Import history only if the existing task still matches the exported state. Never mix versions.
  rows.push(`do $$ begin
if not exists(select 1 from public.tasks where id=${quote(uuid(task.id))} and title=${quote(task.title)} and description=${quote(task.description)} and object_id=${quote(uuid(task.objectId))} and assignee_id=${profile(task.assigneeId)} and author_id=${profile(task.authorId)} and status=${quote(task.status)} and version=${Math.max(events.length,1)} and deleted_at is null) then
  raise exception 'Existing task differs from the snapshot. Import into a fresh database or reconcile explicitly.';
end if; end; $$;`)
}
for (const event of db.history) rows.push(`insert into public.task_history(id,task_id,actor_id,from_status,to_status,comment,created_at)
values(${quote(uuid(event.id))},${quote(uuid(event.taskId))},${profile(event.actorId)},${quote(event.fromStatus)},${quote(event.toStatus)},${quote(event.comment)},${quote(event.createdAt)}) on conflict(id) do nothing;`)
rows.push('commit;')
const output = option('--out') ?? 'supabase/seeds/demo.sql'
mkdirSync(dirname(output), { recursive:true }); writeFileSync(output, rows.join('\n\n')+'\n')
if (!snapshot) {
  mkdirSync('supabase/fixtures', {recursive:true})
  writeFileSync('supabase/fixtures/demo.json', JSON.stringify({ users: demoUsers, database: db, ids: Object.fromEntries([...db.objects,...db.tasks,...db.history].map(row => [row.id,uuid(row.id)])) },null,2)+'\n')
}
console.log(`Exported ${db.objects.length} objects, ${db.tasks.length} tasks, ${db.history.length} history entries to ${output}`)

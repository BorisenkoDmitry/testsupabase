import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const destination = 'tmp/supabase-bundle'
const files = [
  ...readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql')).map(file=>`supabase/migrations/${file}`),
  'supabase/seeds/demo.sql', 'supabase/fixtures/demo.json', 'supabase/checks/setup-check.sql',
  'supabase/README.md', 'supabase/demo.env.example',
  'scripts/supabase/create-demo-users.mjs', 'scripts/supabase/export-mock-seed.mjs', 'tests/database/validate-local.mjs',
  'src/shared/api/mock/seed.ts', 'src/shared/api/contracts.ts',
  ...['output/pdf/kontur-supabase-plan.pdf', 'output/qa/database.json'].filter(existsSync),
]
for (const path of files) { const target = join(destination,path); mkdirSync(dirname(target),{recursive:true}); copyFileSync(path,target) }
const lock = JSON.parse(readFileSync('package-lock.json','utf8'))
const manifest = { name:'kontur-supabase-setup', version:'1.0.0', private:true, type:'module',
  scripts: { 'create-users':'node --env-file=.env.supabase scripts/supabase/create-demo-users.mjs', 'export-seed':'node scripts/supabase/export-mock-seed.mjs' },
  dependencies: { '@supabase/supabase-js':lock.packages['node_modules/@supabase/supabase-js'].version, typescript:lock.packages['node_modules/typescript'].version, '@electric-sql/pglite':lock.packages['node_modules/@electric-sql/pglite'].version },
}
writeFileSync(join(destination,'package.json'),JSON.stringify(manifest,null,2)+'\n')
writeFileSync(join(destination,'.gitignore'),'node_modules/\ntmp/\n.env\n.env.*\n!.env.example\n')
writeFileSync(join(destination,'README.md'),`# Контур: Supabase setup\n\nПолный план: output/pdf/kontur-supabase-plan.pdf.\n\nВ архиве только настройка БД и служебные Node-скрипты; фронтенд CRM сюда не включён. Можно распаковать отдельно и выполнить npm ci, затем следовать supabase/README.md. Или использовать SQL и скрипты из существующей папки проекта.\n\nПорядок: схема → безопасность/RPC → Auth-пользователи → seed → проверки. Секреты задаются только в локальном .env.supabase.\n\nЛокальная проверка PostgreSQL/WASM описана в supabase/README.md. Настоящий облачный Supabase этим пакетом ещё не проверен.\n`)
console.log(`Prepared ${files.length} source files and a standalone Node manifest.`)

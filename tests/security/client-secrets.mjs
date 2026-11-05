import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
let checked = 0;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(js|ts|tsx|json|html|css|map)$/.test(entry.name)) {
      const source = fs.readFileSync(file, "utf8");
      checked++;
      assert(
        !/sb_secret_[A-Za-z0-9_-]{15,}/.test(source),
        `Secret key in ${file}`,
      );
      for (const match of source.matchAll(
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      )) {
        let payload;
        try {
          payload = JSON.parse(
            Buffer.from(match[0].split(".")[1], "base64url").toString(),
          );
        } catch {
          continue;
        }
        assert(payload.role !== "service_role", `service_role JWT in ${file}`);
      }
    }
  }
}
scan("src");
scan("dist");
for (const file of [".env.supabase", ".env.local"]) {
  execFileSync("git", ["check-ignore", "--quiet", file]);
  const tracked = execFileSync("git", ["ls-files", "--", file], {
    encoding: "utf8",
  });
  assert(!tracked.trim(), `${file} is tracked`);
}
console.log(
  JSON.stringify({
    checkedFiles: checked,
    secretsInClient: false,
    localEnvIgnored: true,
  }),
);

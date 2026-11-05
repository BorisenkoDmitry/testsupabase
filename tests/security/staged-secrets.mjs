import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const files = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
for (const file of files) {
  assert(
    !/(^|\/)(database\.txt|basedata\.txt|\.env(?:\..*)?)$/i.test(file) ||
      file === ".env.example",
    `Private file staged: ${file}`,
  );
  assert(
    !/\.(pem|key|p12|pfx)$/i.test(file),
    `Private key file staged: ${file}`,
  );
  const content = execFileSync("git", ["show", `:${file}`], {
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8",
  });
  assert(
    !/sb_secret_[A-Za-z0-9_-]{15,}/.test(content),
    `Server key staged: ${file}`,
  );
  assert(
    !/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/.test(content),
    `Private key staged: ${file}`,
  );
  for (const match of content.matchAll(
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
    assert(payload.role !== "service_role", `Privileged JWT staged: ${file}`);
  }
}
console.log(
  JSON.stringify({ stagedFiles: files.length, secretCheck: "passed" }),
);

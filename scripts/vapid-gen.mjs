import webpush from "web-push";
import { writeFileSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const keys = webpush.generateVAPIDKeys();
const envPath = join(process.cwd(), ".env");
const lines = `\nVAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"\nVAPID_SUBJECT="mailto:hello@coderender.in"\n`;
if (existsSync(envPath)) {
  const cur = readFileSync(envPath, "utf8");
  if (!cur.includes("VAPID_PUBLIC_KEY")) appendFileSync(envPath, lines);
} else {
  writeFileSync(envPath, lines);
}
console.log("VAPID public key (safe to expose in client code):");
console.log(keys.publicKey);
console.log("Private key written to .env (gitignored — never commit).");

// Cloudflare R2 via S3-compatible REST (zero deps — hand-rolled SigV4).
// Vault-first (`media` provider), never env-only: without keys every entry
// reports unconfigured and local /uploads stays the path (offline-first).
import { createHash, createHmac } from "node:crypto";
import { getProvider } from "./providers";

export interface R2Config {
  account: string; key: string; secret: string; bucket: string; publicUrl: string;
}

export function r2Config(): (R2Config & { source: string }) | null {
  const v = getProvider("media");
  if (v.R2_ACCOUNT_ID && v.R2_ACCESS_KEY_ID && v.R2_SECRET_ACCESS_KEY && v.R2_BUCKET)
    return {
      account: v.R2_ACCOUNT_ID, key: v.R2_ACCESS_KEY_ID, secret: v.R2_SECRET_ACCESS_KEY,
      bucket: v.R2_BUCKET, publicUrl: (v.R2_PUBLIC_URL || "").replace(/\/$/, ""), source: "dashboard",
    };
  return null;
}

function sha256hex(s: string | Buffer): string {
  return createHash("sha256").update(s).digest("hex");
}

function hmac(key: Buffer | string, s: string): Buffer {
  return createHmac("sha256", key).update(s).digest();
}

// PUT object, returns the public URL. Throws honest errors (bad keys, 403s).
export async function r2Put(bytes: Buffer, key: string, mime: string): Promise<{ url: string; via: string }> {
  const cfg = r2Config();
  if (!cfg) throw new Error("R2 not configured — add keys in Notify → Providers → media");
  const host = `${cfg.account}.r2.cloudflarestorage.com`;
  const path = `/${cfg.bucket}/${key.replace(/^\/+/, "")}`;
  const now = new Date();
  const amz = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const date = amz.slice(0, 8);
  const payloadHash = sha256hex(bytes);
  const headers: Record<string, string> = {
    host, "content-type": mime, "x-amz-content-sha256": payloadHash, "x-amz-date": amz,
  };
  const signed = Object.keys(headers).sort();
  const canonical = ["PUT", path, "", ...signed.map((k) => `${k}:${headers[k]}`), "", signed.join(";"), payloadHash].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, sha256hex(canonical)].join("\n");
  const kDate = hmac(`AWS4${cfg.secret}`, date);
  const kSigning = hmac(hmac(hmac(kDate, "auto"), "s3"), "aws4_request");
  const sig = hmac(kSigning, toSign).toString("hex");
  const auth = `AWS4-HMAC-SHA256 Credential=${cfg.key}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${sig}`;
  const res = await fetch(`https://${host}${path}`, {
    method: "PUT",
    headers: { ...headers, Authorization: auth },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`R2 upload failed (http ${res.status}) — check keys/bucket`);
  const url = cfg.publicUrl ? `${cfg.publicUrl}/${key.replace(/^\/+/, "")}` : `https://${host}${path}`;
  return { url, via: "r2" };
}

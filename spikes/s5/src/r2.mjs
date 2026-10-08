import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { testPrefix } from "./offsite.mjs";

export function r2Config(env = process.env) {
  if (
    !/^[a-f0-9]{32}$/.test(env.S5_R2_ACCOUNT_ID ?? "") ||
    !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.S5_R2_BUCKET ?? "")
  )
    throw Error("s5_r2_target_required");
  if (!env.S5_R2_ACCESS_KEY_ID || !env.S5_R2_SECRET_ACCESS_KEY)
    throw Error("s5_r2_credentials_required");
  return {
    account: env.S5_R2_ACCOUNT_ID,
    bucket: env.S5_R2_BUCKET,
    prefix: testPrefix(env.S5_R2_PREFIX),
    credentials: {
      accessKeyId: env.S5_R2_ACCESS_KEY_ID,
      secretAccessKey: env.S5_R2_SECRET_ACCESS_KEY,
    },
  };
}
export function createR2Store(config) {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.account}.r2.cloudflarestorage.com`,
    credentials: config.credentials,
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const scope = (key) => {
    if (!key.startsWith(config.prefix) || key.includes(".."))
      throw Error("s5_r2_scope_violation");
    return { Bucket: config.bucket, Key: key };
  };
  const send = (command) =>
    client.send(command, { abortSignal: AbortSignal.timeout(15000) });
  return {
    async put(key, body) {
      await send(
        new PutObjectCommand({
          ...scope(key),
          Body: body,
          ContentType: key.endsWith(".json")
            ? "application/json"
            : "application/octet-stream",
        }),
      );
    },
    async get(key) {
      const response = await send(new GetObjectCommand(scope(key)));
      const chunks = [];
      let length = 0;
      const timer = setTimeout(
        () => response.Body?.destroy?.(Error("s5_download_timeout")),
        15000,
      );
      try {
        for await (const chunk of response.Body) {
          length += chunk.length;
          if (length > 16 * 1024 * 1024) throw Error("s5_object_size_invalid");
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } finally {
        clearTimeout(timer);
        response.Body?.destroy?.();
      }
    },
    async list(prefix) {
      scope(prefix);
      const response = await send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
        }),
      );
      if (response.IsTruncated) throw Error("s5_inventory_limit");
      return (response.Contents ?? []).map((o) => o.Key);
    },
    async delete(key) {
      await send(new DeleteObjectCommand(scope(key)));
    },
    close() {
      client.destroy();
    },
  };
}

import { createHmac, createHash } from "node:crypto";

type SignInput = {
  method: string;
  url: URL;
  region: string;
  service: string;
  body: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

/** Minimal AWS SigV4 signer for MediaConvert CreateJob (no SDK dependency). */
export const SignAWS4 = {
  sign(input: SignInput): Record<string, string> {
    const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash("sha256").update(input.body, "utf8").digest("hex");
    const canonicalHeaders =
      `content-type:application/json\n` +
      `host:${input.url.host}\n` +
      `x-amz-date:${amzDate}\n` +
      (input.sessionToken ? `x-amz-security-token:${input.sessionToken}\n` : "");
    const signedHeaders =
      "content-type;host;x-amz-date" + (input.sessionToken ? ";x-amz-security-token" : "");
    const canonicalRequest = [
      input.method,
      input.url.pathname,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ].join("\n");
    const kDate = createHmac("sha256", `AWS4${input.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(input.region).digest();
    const kService = createHmac("sha256", kRegion).update(input.service).digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Host: input.url.host,
      "X-Amz-Date": amzDate,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
    if (input.sessionToken) headers["X-Amz-Security-Token"] = input.sessionToken;
    return headers;
  },
};

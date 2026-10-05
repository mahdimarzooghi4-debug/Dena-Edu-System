import { afterEach, describe, expect, it } from "vitest";
import {
  createSupportAttachmentScanSignature, MAX_SUPPORT_ATTACHMENT_BYTES,
  secureSupportAttachmentScannerToken, supportAttachmentUploadAvailable,
  validateSupportAttachment, verifySupportAttachmentScanSignature,
} from "./attachments";

const initialEnv = { ...process.env };
const configKeys = [
  "DENA_SUPPORT_ATTACHMENTS_ENABLED", "DENA_SUPPORT_ATTACHMENT_SCANNER_ENABLED",
  "DENA_SUPPORT_ATTACHMENT_SCANNER_TOKEN", "DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY",
  "DENA_MEDIA_ENABLED", "DENA_PRIVATE_MEDIA_ORIGIN_URL",
  "DENA_PRIVATE_MEDIA_ORIGIN_TOKEN",
];

afterEach(() => {
  for (const key of configKeys) {
    if (initialEnv[key] === undefined) delete process.env[key];
    else process.env[key] = initialEnv[key];
  }
});

function enableScanner() {
  process.env.DENA_SUPPORT_ATTACHMENTS_ENABLED = "1";
  process.env.DENA_SUPPORT_ATTACHMENT_SCANNER_ENABLED = "1";
  process.env.DENA_SUPPORT_ATTACHMENT_SCANNER_TOKEN = "scanner-".repeat(6);
  process.env.DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY = "hmac-key-".repeat(5);
  process.env.DENA_MEDIA_ENABLED = "1";
  process.env.DENA_PRIVATE_MEDIA_ORIGIN_URL = "https://storage.example.com/";
  process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN = "origin-".repeat(6);
}

describe("support attachment quarantine contract", () => {
  it("validates PDF, JPEG and PNG from bytes and sanitizes file names", () => {
    const pdf = validateSupportAttachment({
      fileName: "../private/report.pdf",
      contentType: "application/pdf",
      bytes: Buffer.from("%PDF-1.7\nreport"),
    });
    expect(pdf?.fileName).not.toContain("/");
    expect(pdf?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(validateSupportAttachment({
      fileName: "image.jpg", contentType: "image/jpeg",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    })?.contentType).toBe("image/jpeg");
    expect(validateSupportAttachment({
      fileName: "image.png", contentType: "image/png",
      bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
    })?.contentType).toBe("image/png");
  });

  it("rejects MIME spoofing and files larger than the approved 10 MiB cap", () => {
    expect(validateSupportAttachment({
      fileName: "fake.pdf", contentType: "application/pdf", bytes: Buffer.from("not a pdf"),
    })).toBeNull();
    expect(validateSupportAttachment({
      fileName: "too-big.pdf", contentType: "application/pdf",
      bytes: Buffer.alloc(MAX_SUPPORT_ATTACHMENT_BYTES + 1),
    })).toBeNull();
  });

  it("keeps upload disabled unless private storage and an isolated scanner are configured", () => {
    expect(supportAttachmentUploadAvailable()).toBe(false);
    enableScanner();
    expect(supportAttachmentUploadAvailable()).toBe(true);
    expect(secureSupportAttachmentScannerToken(`Bearer ${process.env.DENA_SUPPORT_ATTACHMENT_SCANNER_TOKEN}`)).toBe(true);
    expect(secureSupportAttachmentScannerToken("Bearer wrong")).toBe(false);
    process.env.DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY = process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN;
    expect(supportAttachmentUploadAvailable()).toBe(false);
  });

  it("verifies a fresh signature tied to attachment, digest, time and verdict", () => {
    enableScanner();
    const report = {
      attachmentId: "00000000-0000-4000-8000-000000000001",
      sha256: "a".repeat(64),
      scannedAt: new Date().toISOString(),
      clean: true,
    };
    const signature = createSupportAttachmentScanSignature(
      report, process.env.DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY,
    );
    expect(verifySupportAttachmentScanSignature({ ...report, signature })).toBe(true);
    expect(verifySupportAttachmentScanSignature({
      ...report, sha256: "b".repeat(64), signature,
    })).toBe(false);
    expect(verifySupportAttachmentScanSignature({
      ...report, scannedAt: new Date(Date.now() - 10 * 60_000).toISOString(), signature,
    })).toBe(false);
  });
});

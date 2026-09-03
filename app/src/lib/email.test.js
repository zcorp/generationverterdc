import test from "node:test";
import assert from "node:assert/strict";

import { buildReplyEmail, resolveSmtpConfig } from "./email.js";

test("reply email content keeps recipient name and subject", () => {
  const email = buildReplyEmail({
    name: "Alice",
    email: "alice@example.com",
    submissionType: "volunteer",
    replyText: "Merci pour votre candidature.",
  });

  assert.equal(email.to, "alice@example.com");
  assert.match(email.subject, /GV-RDC/);
  assert.match(email.text, /Alice/);
  assert.match(email.text, /Merci pour votre candidature/);
});

test("missing SMTP config resolves to disabled mode", () => {
  const config = resolveSmtpConfig({
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "",
  });

  assert.equal(config.mode, "disabled");
});

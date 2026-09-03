import test from "node:test";
import assert from "node:assert/strict";

import { normalizeEmail, isLikelySpamSubmission, upsertUserProfile, sanitizeUserPayload } from "./userManagement.js";
import { buildCampaignAudience, normalizePhoneForSms, normalizePhoneForWhatsApp, buildWhatsAppUrl } from "./campaigns.js";

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail(" Alice@Example.com "), "alice@example.com");
});

test("honeypot and suspicious payload are marked as spam", () => {
  const result = isLikelySpamSubmission({
    website: "https://example.com",
    message: "test",
    email: "alice@example.com",
    phone: "",
  });

  assert.equal(result, true);
});

test("upsertUserProfile preserves subscription consent and contact details", () => {
  const user = upsertUserProfile({
    email: "  Alice@example.com ",
    name: "Alice",
    phone: "+123",
    submissionType: "volunteer",
    consent: true,
    sourcePage: "rejoignez-nous",
  });

  assert.equal(user.email, "alice@example.com");
  assert.equal(user.role, "volunteer");
  assert.equal(user.consent_email, true);
  assert.equal(user.status, "active");
});

test("buildCampaignAudience respects role, status and consent filters", () => {
  const users = [
    { id: 1, email: "active@example.com", role: "volunteer", status: "active", consent_email: true },
    { id: 2, email: "pending@example.com", role: "volunteer", status: "pending", consent_email: true },
    { id: 3, email: "unsub@example.com", role: "contact", status: "active", consent_email: false, consent_communication: false },
    { id: 4, email: "partner@example.com", role: "partnership", status: "active", consent_communication: true },
  ];

  const result = buildCampaignAudience(users, {
    role: "volunteer",
    status: "active",
    onlyConsent: true,
  });

  assert.deepEqual(result.map((user) => user.id), [1]);
});

test("sanitizeUserPayload creates a valid volunteer record", () => {
  const payload = sanitizeUserPayload({
    first_name: "  Marie ",
    last_name: "Ngoma",
    email: " MARIE@EXAMPLE.COM ",
    phone: "099 123 4567",
    role: "volunteer",
    source_type: "volunteer",
    status: "active",
    consent_email: true,
    consent_sms: true,
    consent_communication: true,
    source_page: "rejoignez-nous",
  });

  assert.equal(payload.email, "marie@example.com");
  assert.equal(payload.role, "volunteer");
  assert.equal(payload.first_name, "Marie");
  assert.equal(payload.phone, "099 123 4567");
  assert.equal(payload.status, "active");
  assert.equal(payload.consent_email, true);
});

test("sanitizeUserPayload rejects invalid role and defaults to a safe value", () => {
  const payload = sanitizeUserPayload({ email: "admin@example.com", first_name: "Test", role: "invalid-role", status: "unknown" });

  assert.equal(payload.role, "contact");
  assert.equal(payload.status, "pending");
});

test("normalizePhoneForWhatsApp and buildWhatsAppUrl create a valid wa.me link", () => {
  assert.equal(normalizePhoneForWhatsApp("099 123 4567"), "243991234567");
  assert.equal(buildWhatsAppUrl("0991234567", "Bonjour"), "https://wa.me/243991234567?text=Bonjour");
});

test("normalizePhoneForSms creates the documented international format", () => {
  assert.equal(normalizePhoneForSms("099 123 4567"), "+243991234567");
  assert.equal(normalizePhoneForSms("+243 991 234 567"), "+243991234567");
});

test("buildCampaignAudience uses the channel-specific consent", () => {
  const users = [
    { id: 1, email: "email@example.com", phone: "0991234567", consent_email: true, consent_sms: false },
    { id: 2, email: "sms@example.com", phone: "0991234568", consent_email: false, consent_sms: true },
  ];

  assert.deepEqual(buildCampaignAudience(users, { channel: "sms", onlyConsent: true }).map((user) => user.id), [2]);
});

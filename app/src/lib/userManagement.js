export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function sanitizeUserPayload(payload = {}) {
  const normalizedEmail = normalizeEmail(payload.email);
  const roleOptions = ["volunteer", "contact", "partnership", "newsletter"];
  const statusOptions = ["pending", "active", "unsubscribed", "banned"];
  const requestedRole = String(payload.role || payload.source_type || "contact").trim().toLowerCase();
  const requestedStatus = String(payload.status || "pending").trim().toLowerCase();
  const nextRole = roleOptions.includes(requestedRole) ? requestedRole : "contact";
  const nextStatus = statusOptions.includes(requestedStatus) ? requestedStatus : "pending";

  return {
    email: normalizedEmail,
    first_name: String(payload.first_name || payload.firstName || "").trim(),
    last_name: String(payload.last_name || payload.lastName || "").trim(),
    phone: String(payload.phone || "").trim(),
    role: nextRole,
    source_type: String(payload.source_type || nextRole || "contact").trim().toLowerCase() || nextRole,
    source_page: String(payload.source_page || payload.sourcePage || "admin-panel").trim() || "admin-panel",
    consent_email: Boolean(payload.consent_email ?? payload.consent ?? false),
    consent_sms: Boolean(payload.consent_sms ?? payload.consent ?? false),
    consent_communication: Boolean(payload.consent_communication ?? payload.consent ?? false),
    status: nextStatus,
  };
}

export function isLikelySpamSubmission(payload = {}) {
  const suspiciousFields = [
    payload.website,
    payload.company,
    payload.url,
    payload.homepage,
    payload.subject,
  ];

  const hasHoneypot = suspiciousFields.some((field) => typeof field === "string" && field.trim().length > 0);
  const shortMessage = typeof payload.message === "string" ? payload.message.trim().length : 0;
  const email = normalizeEmail(payload.email);
  const hasFakeEmail = Boolean(email) && (email.includes("test") || email.includes("example.com") || email.includes("fake") || email.includes("noreply"));
  const samePhone = typeof payload.phone === "string" ? payload.phone.trim() : "";

  return hasHoneypot || (shortMessage > 0 && shortMessage < 25) || (Boolean(email) && hasFakeEmail && samePhone === "");
}

export function upsertUserProfile({
  email,
  name,
  phone,
  submissionType,
  consent,
  sourcePage,
}) {
  const normalizedEmail = normalizeEmail(email);
  const safeName = typeof name === "string" ? name.trim() : "";
  const source = submissionType || "contact";

  return {
    email: normalizedEmail,
    first_name: safeName.split(" ")[0] || "",
    last_name: safeName.split(" ").slice(1).join(" ") || "",
    phone: typeof phone === "string" ? phone.trim() : "",
    role: source,
    source_type: source,
    consent_email: Boolean(consent),
    consent_sms: Boolean(consent),
    consent_communication: Boolean(consent),
    status: Boolean(consent) ? "active" : "pending",
    source_page: sourcePage || "unknown",
  };
}

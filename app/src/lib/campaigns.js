export function normalizePhoneForWhatsApp(phone = "") {
  if (typeof phone !== "string") return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("243")) return digits;
  if (digits.startsWith("0")) return `243${digits.slice(1)}`;
  return digits.length >= 9 ? digits : "";
}

export function normalizePhoneForSms(phone = "") {
  if (typeof phone !== "string") return "";

  const value = phone.trim();
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("243")) return `+${digits}`;
  if (digits.startsWith("0")) return `+243${digits.slice(1)}`;
  return "";
}

export function buildWhatsAppUrl(phone, message = "") {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  if (!normalizedPhone) return "";

  const safeMessage = typeof message === "string" ? encodeURIComponent(message.trim()) : "";
  return safeMessage ? `https://wa.me/${normalizedPhone}?text=${safeMessage}` : `https://wa.me/${normalizedPhone}`;
}

export function buildCampaignAudience(users = [], filters = {}) {
  const targetRole = filters.role || "all";
  const targetStatus = filters.status || "all";
  const onlyConsent = Boolean(filters.onlyConsent);
  const channel = filters.channel || "email";

  return users.filter((user) => {
    const roleOk = targetRole === "all" || (user.role || "contact") === targetRole;
    const statusOk = targetStatus === "all" || (user.status || "pending") === targetStatus;
    const emailConsent = Boolean(user.consent_email || user.consent_communication);
    const smsConsent = Boolean(user.consent_sms || user.consent_communication);
    const consentOk = !onlyConsent || (channel === "email"
      ? emailConsent
      : channel === "sms" || channel === "whatsapp"
        ? smsConsent
        : emailConsent || smsConsent);
    return roleOk && statusOk && consentOk;
  });
}

export function createCampaignSummary(users = [], filters = {}) {
  const recipients = buildCampaignAudience(users, filters);

  return {
    totalRecipients: recipients.length,
    recipients: recipients.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      whatsapp: buildWhatsAppUrl(user.phone, ""),
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      role: user.role || "contact",
      status: user.status || "pending",
    })),
  };
}

import { normalizePhoneForSms } from "./campaigns";

const defaultMlinziUrl = "https://api.mlinzi.tech/messages/send";

export function resolveMlinziConfig() {
  return {
    url: process.env.MLINZI_SMS_URL || defaultMlinziUrl,
    token: process.env.MLINZI_SMS_TOKEN || "",
    senderName: process.env.MLINZI_SMS_SENDER_NAME || "GV-RDC",
  };
}

export async function sendCampaignSms({ to, message }) {
  const config = resolveMlinziConfig();
  const phone = normalizePhoneForSms(to);

  if (!phone) return { ok: false, mode: "disabled", reason: "Numéro de téléphone invalide" };
  if (!config.token) return { ok: false, mode: "disabled", reason: "MLINZI_SMS_TOKEN non configuré" };
  if (!config.senderName || config.senderName.length > 11) {
    return { ok: false, mode: "disabled", reason: "MLINZI_SMS_SENDER_NAME doit contenir 11 caractères maximum" };
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_name: config.senderName,
        token: config.token,
        to: phone,
        message: String(message),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.data?.status !== "sent") {
      return {
        ok: false,
        mode: "mlinzi",
        statusCode: result?.statusCode || response.status,
        reason: result?.message || `Mlinzi a refusé l'envoi (HTTP ${response.status})`,
      };
    }

    return {
      ok: true,
      mode: "mlinzi",
      messageId: result.data.messageId,
      status: result.data.status,
      to: result.data.to || phone,
      responseMessage: result.message || "SMS envoyé avec succès",
    };
  } catch (error) {
    return { ok: false, mode: "mlinzi", reason: error.message || "Mlinzi est indisponible" };
  }
}
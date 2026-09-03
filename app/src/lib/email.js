import nodemailer from "nodemailer";

function normalizeReplyText(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export function buildReplyEmail({ name, email, submissionType, replyText }) {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "Madame, Monsieur";
  const safeEmail = typeof email === "string" && email.trim() ? email.trim() : "contact@gv-rdc.org";
  const typeLabel = {
    volunteer: "Votre candidature",
    partnership: "Votre demande de partenariat",
    contact: "Votre message",
    newsletter: "Votre inscription à la newsletter",
  }[submissionType] || "Votre demande";

  const defaultBody = `Bonjour ${safeName},\n\nMerci pour votre message. Nous avons bien reçu votre demande et l’équipe GV-RDC la traite avec attention.\n\nNous reviendrons vers vous dans les meilleurs délais.\n\nCordialement,\nL’équipe GV-RDC`;
  const content = normalizeReplyText(replyText, defaultBody);
  const body = content.toLowerCase().startsWith(`bonjour ${safeName.toLowerCase()}`)
    ? content
    : `Bonjour ${safeName},\n\n${content}`;

  return {
    to: safeEmail,
    from: process.env.SMTP_FROM || "noreply@gv-rdc.org",
    subject: `GV-RDC - ${typeLabel}`,
    text: body,
    html: `<p>${body.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p>`,
  };
}

export function resolveSmtpConfig(env = process.env) {
  const host = (env.SMTP_HOST || "").trim();
  const port = Number(env.SMTP_PORT || "") || 587;
  const user = (env.SMTP_USER || "").trim();
  const pass = (env.SMTP_PASS || "").trim();
  const from = (env.SMTP_FROM || "").trim() || "noreply@gv-rdc.org";

  if (!host || !user || !pass) {
    return { mode: "disabled", host, port, user, pass, from };
  }

  return { mode: "smtp", host, port, user, pass, from };
}

export async function sendReplyEmail({ name, email, submissionType, replyText }) {
  const config = resolveSmtpConfig();
  if (config.mode === "disabled") {
    return { ok: false, mode: "disabled", reason: "SMTP is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const message = buildReplyEmail({ name, email, submissionType, replyText });
  await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { ok: true, mode: "smtp" };
}

export async function sendCampaignEmail({ to, subject, body, fromName = "GV-RDC" }) {
  const config = resolveSmtpConfig();
  if (config.mode === "disabled") {
    return { ok: false, mode: "disabled", reason: "SMTP is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const safeTo = typeof to === "string" && to.trim() ? to.trim() : null;
  if (!safeTo) {
    return { ok: false, mode: "smtp", reason: "Missing recipient" };
  }

  const cleanBody = typeof body === "string" && body.trim() ? body.trim() : "Merci pour votre intérêt pour GV-RDC.";
  const cleanSubject = typeof subject === "string" && subject.trim() ? subject.trim() : "Message GV-RDC";
  const html = `<p>${cleanBody.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;

  await transporter.sendMail({
    from: `${fromName} <${config.from}>`,
    to: safeTo,
    subject: cleanSubject,
    text: cleanBody,
    html,
  });

  return { ok: true, mode: "smtp" };
}

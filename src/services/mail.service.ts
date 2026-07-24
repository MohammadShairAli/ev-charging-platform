import nodemailer from "nodemailer";
import { appConfig } from "@/src/lib/config";

function requireSmtpConfig() {
  const { host, port, user, pass, fromEmail } = appConfig.smtp;

  if (!host || !port || !user || !pass || !fromEmail) {
    throw new Error("SMTP configuration is missing. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL in .env.");
  }
}

function transporter() {
  requireSmtpConfig();

  return nodemailer.createTransport({
    host: appConfig.smtp.host,
    port: appConfig.smtp.port,
    secure: appConfig.smtp.port === 465,
    auth: {
      user: appConfig.smtp.user,
      pass: appConfig.smtp.pass,
    },
  });
}

function emailShell({
  title,
  intro,
  buttonLabel,
  buttonUrl,
  securityNote,
}: {
  title: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  securityNote: string;
}) {
  const themeColour = appConfig.theme.colour;

  return `
    <div style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;color:#000000">
      <div style="max-width:620px;margin:0 auto;padding:28px 16px">
        <div style="background:${themeColour};color:#ffffff;border-radius:14px 14px 0 0;padding:22px 24px">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">EV Network</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25">${title}</h1>
        </div>
        <div style="background:#ffffff;border:1px solid ${themeColour};border-top:0;border-radius:0 0 14px 14px;padding:24px">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7">${intro}</p>
          <p style="margin:24px 0">
            <a href="${buttonUrl}" style="background:${themeColour};color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:9px;font-weight:700;display:inline-block">
              ${buttonLabel}
            </a>
          </p>
          <div style="margin:22px 0;padding:16px;border-radius:12px;background:#ffffff;border:1px solid ${themeColour}">
            <p style="margin:0;font-size:14px;line-height:1.7">
              EV Network helps drivers find nearby EV chargers, compare running costs, plan safer trips, and keep emergency charging support close when the route gets stressful.
            </p>
          </div>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#000000">${securityNote}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#000000">If the button does not work, open this link:<br/><a href="${buttonUrl}" style="color:${themeColour}">${buttonUrl}</a></p>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6">
            Drive safe,<br/>
            <strong>Team EV Network</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name?: string;
  verifyUrl: string;
}) {
  const displayName = name?.trim() || "there";
  const from = `"${appConfig.smtp.fromName}" <${appConfig.smtp.fromEmail}>`;

  await transporter().sendMail({
    from,
    to,
    subject: "Verify your EV Network account",
    text: [
      `Hi ${displayName},`,
      "",
      "Welcome to EV Network. Verify your account using this link:",
      verifyUrl,
      "",
      "EV Network helps you find nearby EV chargers, compare running costs, plan safer trips, and keep emergency charging support close.",
      "",
      "Drive safe,",
      "Team EV Network",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: emailShell({
      title: "Welcome to EV Network",
      intro: `Hi ${displayName}, thanks for joining EV Network. Verify your account to start using your driver profile, trip tools, and charging support.`,
      buttonLabel: "Verify it's me",
      buttonUrl: verifyUrl,
      securityNote: "If you did not create an EV Network account, you can safely ignore this email.",
    }),
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  const from = `"${appConfig.smtp.fromName}" <${appConfig.smtp.fromEmail}>`;

  await transporter().sendMail({
    from,
    to,
    subject: "Reset your EV Network password",
    text: [
      "Reset your EV Network password using this link:",
      resetUrl,
      "",
      "EV Network helps you find nearby EV chargers, compare running costs, plan safer trips, and keep emergency charging support close.",
      "",
      "Drive safe,",
      "Team EV Network",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: emailShell({
      title: "Reset your password",
      intro: "We received a request to reset your EV Network password. Use the button below to set a new one and get back to your charging tools.",
      buttonLabel: "Reset password",
      buttonUrl: resetUrl,
      securityNote: "If you did not request a password reset, you can safely ignore this email and your password will stay unchanged.",
    }),
  });
}

"use server";

import { Resend } from "resend";

interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

type SendResult = { ok: true } | { ok: false; message: string };

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(payload: ContactPayload): Promise<SendResult> {
  try {
    const { error } = await resend.emails.send({
      from: "Arcade Vault <onboarding@resend.dev>",
      to: ["ing.trujilloge@gmail.com"],
      subject: `[Arcade Vault] Nuevo mensaje de ${payload.name}`,
      html: `
        <div style="font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:24px;border:1px solid #00f5ff">
          <p style="color:#00f5ff;margin:0 0 16px">ARCADE VAULT // CONTACTO</p>
          <p><strong>Nombre:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space:pre-wrap;border-left:2px solid #00f5ff;padding-left:12px">${payload.msg}</p>
        </div>
      `,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, message };
  }
}

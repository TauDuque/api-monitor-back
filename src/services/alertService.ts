// src/services/alertService.ts
import { MonitoredURL, Incident } from "@prisma/client";
import { sendEmail } from "./emailService";
import { sendWebhook } from "./webhookService";

export const sendAlertNotification = async (
  url: MonitoredURL & {
    alertConfigurations: {
      emailRecipient: string | null;
      webhookUrl: string | null;
      notifyOnDown: boolean;
      notifyOnUp: boolean;
    } | null;
  },
  incident: Incident,
  isResolution: boolean = false
) => {
  const config = url.alertConfigurations;
  if (!config) {
    console.log(
      `No alert configuration found for URL ${url.name}. Skipping alert.`
    );
    return;
  }

  let subject = "";
  let htmlBody = "";
  let webhookPayload: any = {
    incidentId: incident.id,
    monitoredUrlId: url.id,
    urlName: url.name,
    urlAddress: url.url,
    incidentType: incident.type,
    description: incident.description,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt,
    isResolution: isResolution,
  };

  if (isResolution) {
    if (!config.notifyOnUp) {
      console.log(`Notification on UP is disabled for ${url.name}.`);
      return;
    }
    subject = `✅ URL ${url.name} está ONLINE novamente!`;
    htmlBody = `
      <h1>URL ${url.name} está ONLINE novamente!</h1>
      <p>A URL ${url.url} que estava offline, voltou a responder.</p>
      <p>Incidente iniciado em: ${new Date(
        incident.startedAt
      ).toLocaleString()}</p>
      <p>Resolvido em: ${new Date(incident.resolvedAt!).toLocaleString()}</p>
      <p>Duração do incidente: ${
        incident.resolvedAt
          ? (
              (new Date(incident.resolvedAt).getTime() -
                new Date(incident.startedAt).getTime()) /
              (1000 * 60)
            ).toFixed(2)
          : "N/A"
      } minutos</p>
      <p>Detalhes do incidente: ${incident.description}</p>
    `;
  } else {
    if (!config.notifyOnDown) {
      console.log(`Notification on DOWN is disabled for ${url.name}.`);
      return;
    }
    subject = `🚨 ALERTA: URL ${url.name} está OFFLINE!`;
    htmlBody = `
      <h1>ALERTA: URL ${url.name} está OFFLINE!</h1>
      <p>A URL ${url.url} parou de responder ou está com problemas.</p>
      <p>Tipo de incidente: ${incident.type}</p>
      <p>Descrição: ${incident.description}</p>
      <p>Início do incidente: ${new Date(
        incident.startedAt
      ).toLocaleString()}</p>
    `;
  }

  // Enviar e-mail
  if (config.emailRecipient) {
    await sendEmail(config.emailRecipient, subject, htmlBody);
  }

  // Enviar webhook
  if (config.webhookUrl) {
    await sendWebhook(config.webhookUrl, webhookPayload);
  }
};

// src/services/webhookService.ts
import axios from "axios";

export const sendWebhook = async (webhookUrl: string, payload: any) => {
  try {
    await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(`Webhook sent to ${webhookUrl}`);
  } catch (error: any) {
    console.error(`Error sending webhook to ${webhookUrl}:`, error.message);
  }
};

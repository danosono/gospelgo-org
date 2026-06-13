import { Resend } from "resend";

const SUPABASE_URL = "https://akajfgobhzkadiigydkh.supabase.co";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!process.env.RESEND_WEBHOOK_SECRET || !process.env.RESEND_API_KEY) {
      return { statusCode: 200, body: "OK" };
    }

    const id = event.headers["svix-id"];
    const timestamp = event.headers["svix-timestamp"];
    const signature = event.headers["svix-signature"];

    if (!id || !timestamp || !signature) {
      return { statusCode: 400, body: "Missing webhook headers" };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let evt;
    try {
      evt = resend.webhooks.verify({
        payload: event.body,
        headers: { id, timestamp, signature },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      });
    } catch (err) {
      return { statusCode: 400, body: "Invalid signature" };
    }

    const isUnsubscribe =
      (evt.type === "contact.updated" && evt.data?.unsubscribed === true) ||
      evt.type === "contact.deleted";

    if (
      isUnsubscribe &&
      evt.data?.email &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(evt.data.email)}`,
        {
          method: "DELETE",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}

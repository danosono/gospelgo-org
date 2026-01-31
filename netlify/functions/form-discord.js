import fetch from "node-fetch";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const params = new URLSearchParams(event.body);

    const message = params.get("msg")?.trim();
    const honeypot = params.get("company"); // hidden field
    const turnstileToken = params.get("cf-turnstile-response");

    // 1️⃣ Honeypot check
    if (honeypot) {
      // Optional: log spam here
      return { statusCode: 200, body: "OK" };
    }

    if (!message) {
      return { statusCode: 400, body: "Missing message" };
    }

    // 2️⃣ Enforce maximum length
    const MAX_LENGTH = 1000;
    if (message.length > MAX_LENGTH) {
      return { statusCode: 400, body: `Message too long (max ${MAX_LENGTH} characters)` };
    }

    // 3️⃣ Moderate filter with normalized banned words
    const normalized = message.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "");
    const bannedWords = ["fuck", "fck", "shit", "sh1t", "bitch", "cunt", "retard"];
    const isFlagged = bannedWords.some(word => normalized.includes(word));

    // 4️⃣ Turnstile verification
    if (!turnstileToken || !process.env.TURNSTILE_SECRET_KEY) {
      return { statusCode: 400, body: "Turnstile token missing" };
    }

    const turnstileRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken
        })
      }
    ).then(res => res.json());

    if (!turnstileRes.success) {
      return { statusCode: 403, body: "Bot detected" };
    }

    // 5️⃣ Prepare Discord message
    const timestamp = new Date().toISOString();
    const ip = event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

    const webhookUrl = isFlagged
      ? process.env.DISCORD_SPAM_WEBHOOK_URL
      : process.env.DISCORD_FORM_WEBHOOK_URL;

    const content = isFlagged
      ? `⚠️ **Flagged Feedback**\n\n${message}\n\n🕒 ${timestamp}\n🌐 IP: ${ip}`
      : `💬 **New Feedback**\n\n${message}\n\n🕒 ${timestamp}`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });

    // 6️⃣ Redirect to thank-you page
    return {
      statusCode: 302,
      headers: { Location: "/thanks-feedback.html" } // change if needed
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
};
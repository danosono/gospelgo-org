export async function handler(event) {
  try {
    const params = new URLSearchParams(event.body);

    const message = params.get("msg")?.trim();
    const honeypot = params.get("company");
    const turnstileToken = params.get("cf-turnstile-response");

    // Honeypot check
    if (honeypot) {
      return { statusCode: 200, body: "OK" };
    }

    if (!message) {
      return { statusCode: 400, body: "Missing message" };
    }

    // Verify Turnstile
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

    // Moderate filter
    const bannedWords = [
      "fuck",
      "shit",
      "bitch",
      "cunt",
      "retard"
    ];

    const lower = message.toLowerCase();
    const isFlagged = bannedWords.some(word => lower.includes(word));

    const timestamp = new Date().toISOString();
    const ip =
      event.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

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

    return {
      statusCode: 302,
      headers: { Location: "/thanks.html" }
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}

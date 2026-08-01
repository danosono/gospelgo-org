const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10000;

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const params = new URLSearchParams(event.body);

    // Honeypot
    const honeypot = params.get("company");
    if (honeypot) {
      return { statusCode: 200, body: "OK" };
    }

    const interval = params.get("interval") === "month" ? "month" : "once";
    const amount = Number(params.get("amount"));

    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return {
        statusCode: 400,
        body: `Enter a donation amount between $${MIN_AMOUNT} and $${MAX_AMOUNT}.`,
      };
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return {
        statusCode: 503,
        body: "Donations are being set up, check back soon.",
      };
    }

    const mode = interval === "month" ? "subscription" : "payment";
    const unitAmount = Math.round(amount * 100);
    const origin = `https://${event.headers.host || "gospelgo.org"}`;

    const body = new URLSearchParams();
    body.append("mode", mode);
    body.append("line_items[0][quantity]", "1");
    body.append("line_items[0][price_data][currency]", "usd");
    body.append("line_items[0][price_data][unit_amount]", String(unitAmount));
    body.append(
      "line_items[0][price_data][product_data][name]",
      interval === "month" ? "Gospelgo monthly donation" : "Gospelgo donation",
    );
    if (mode === "subscription") {
      body.append("line_items[0][price_data][recurring][interval]", "month");
    } else {
      // "donate" submit-type button text is only applied here; subscription
      // mode is left on the default submit type to avoid API version risk.
      body.append("submit_type", "donate");
    }
    body.append("success_url", `${origin}/thanks-donate/`);
    body.append("cancel_url", `${origin}/donate/`);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!stripeRes.ok) {
      console.error("Stripe session create failed", await stripeRes.text());
      return { statusCode: 502, body: "Could not start checkout right now." };
    }

    const session = await stripeRes.json();

    return {
      statusCode: 303,
      headers: { Location: session.url },
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}

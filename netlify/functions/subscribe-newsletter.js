const SUPABASE_URL = "https://akajfgobhzkadiigydkh.supabase.co";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const params = new URLSearchParams(event.body);

    const email = params.get("email")?.trim().toLowerCase();
    const honeypot = params.get("company"); // hidden field
    const turnstileToken = params.get("cf-turnstile-response");

    // 1️⃣ Honeypot check
    if (honeypot) {
      return { statusCode: 200, body: "OK" };
    }

    // 2️⃣ Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, body: "Invalid email address" };
    }

    // 3️⃣ Turnstile verification
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
          response: turnstileToken,
        }),
      }
    ).then((res) => res.json());

    if (!turnstileRes.success) {
      return { statusCode: 403, body: "Bot detected" };
    }

    // 4️⃣ Add contact to Resend (global Contacts + Segments model)
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendSegmentId = process.env.RESEND_SEGMENT_ID;

    if (!resendApiKey || !resendSegmentId) {
      return {
        statusCode: 503,
        body: "Mailing list signup is being set up, check back soon.",
      };
    }

    let resendRes = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        segments: [{ id: resendSegmentId }],
      }),
    });

    // Contact already exists: resubscribe + (re)add to the segment instead.
    if (resendRes.status === 409) {
      resendRes = await fetch(
        `https://api.resend.com/contacts/${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({ unsubscribed: false }),
        }
      );

      if (resendRes.ok) {
        await fetch(
          `https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${resendSegmentId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${resendApiKey}` },
          }
        );
      }
    }

    if (!resendRes.ok) {
      console.error("Resend contact create failed", await resendRes.text());
      return { statusCode: 502, body: "Could not subscribe right now" };
    }

    const resendData = await resendRes.json();

    // 5️⃣ Mirror into Supabase (non-fatal if it fails)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            email,
            resend_contact_id: resendData.id,
            source: "website",
          }),
        });
      } catch (err) {
        console.error("Supabase mirror failed", err);
      }
    }

    // 6️⃣ Redirect to thank-you page
    return {
      statusCode: 302,
      headers: { Location: "/thanks-subscribe/" },
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}

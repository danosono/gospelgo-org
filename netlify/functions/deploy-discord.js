export async function handler(event) {
  try {
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    // Extract deploy info from Netlify event body (if available)
    let body = {};
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }

    const siteName = "gospelgo.org"; // fixed site name
    const branch = body.branch || body.commit_ref || "main";
    const deployUrl = body.deploy_ssl_url || body.url || "https://gospelgo.org";

    const discordPayload = {
      content: `🚀 **Deploy succeeded**\n\n` +
               `**Site:** ${siteName}\n` +
               `**Branch:** ${branch}\n` +
               `**URL:** ${deployUrl}\n\n` +
               `See dev notes channel for details (commit messages).\n\n` +
               `🙏 Please pray for gospelgo to glorify Jesus!`
    };

    await fetch(discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload)
    });

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: "Webhook failed" };
  }
}

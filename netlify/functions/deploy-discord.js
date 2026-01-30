export async function handler(event) {
  try {
    const body = JSON.parse(event.body);

    const commitMessage = body.commit_title || body.commit_body || "No commit message";
    const branch = body.branch || body.commit_ref || "unknown";
    const siteName = body.site_name || "Netlify Site";
    const deployUrl = body.links?.permalink || body.deploy_ssl_url;

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    const discordPayload = {
      content: `🚀 **Deploy succeeded**\n\n` +
               `**Site:** ${siteName}\n` +
               `**Branch:** ${branch}\n` +
               `**Commit:** ${commitMessage}\n` +
               (deployUrl ? `🔗 ${deployUrl}` : "")
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


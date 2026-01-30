exports.handler = async (event) => {
  const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL
  const data = new URLSearchParams(event.body)
  const msg = data.get('msg')

  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `🗣️ Feedback: ${msg}` })
  })

  return { statusCode: 302, headers: { Location: '/' } }
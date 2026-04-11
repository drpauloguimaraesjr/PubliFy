const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/master');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

async function generateCarouselScript(rawInput, options = {}) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(rawInput, options) },
    ],
  });

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const extractJson = (raw) => {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) return fenceMatch[1].trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return raw.slice(firstBrace, lastBrace + 1).trim();
    }
    return raw.trim();
  };

  const cleaned = extractJson(text);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('[claude] invalid JSON response. First 500 chars:\n', text.slice(0, 500));
    const error = new Error('Claude returned invalid JSON');
    error.status = 502;
    error.raw = text;
    throw error;
  }

  return {
    script: parsed,
    usage: message.usage,
    model: message.model,
  };
}

module.exports = { generateCarouselScript };

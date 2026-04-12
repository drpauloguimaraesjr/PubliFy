const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/master');
const {
  CLASSIFY_PROMPT,
  SCRIPT_PROMPT,
  CAPTION_PROMPT,
  buildClassifyUser,
  buildScriptUser,
  buildCaptionUser,
} = require('../prompts/granular');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

function extractJson(raw) {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }
  return raw.trim();
}

async function callClaudeJson(systemPrompt, userMessage, maxTokens = 4096) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const cleaned = extractJson(text);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('[claude] invalid JSON. First 500 chars:\n', text.slice(0, 500));
    const error = new Error('Claude returned invalid JSON');
    error.status = 502;
    error.raw = text;
    throw error;
  }

  return {
    data: parsed,
    usage: message.usage,
    model: message.model,
  };
}

async function generateCarouselScript(rawInput, options = {}) {
  const { data, usage, model } = await callClaudeJson(
    SYSTEM_PROMPT,
    buildUserPrompt(rawInput, options),
    4096
  );
  return { script: data, usage, model };
}

async function classifyInput(rawInput, contentType) {
  return callClaudeJson(CLASSIFY_PROMPT, buildClassifyUser(rawInput, contentType), 1024);
}

async function generateScript(briefing, options = {}) {
  const systemPrompt = options.referencesContext
    ? SCRIPT_PROMPT + options.referencesContext
    : SCRIPT_PROMPT;
  return callClaudeJson(systemPrompt, buildScriptUser(briefing, options), 4096);
}

async function generateCaption(briefing, script, options = {}) {
  return callClaudeJson(CAPTION_PROMPT, buildCaptionUser(briefing, script, options), 2048);
}

module.exports = {
  generateCarouselScript,
  classifyInput,
  generateScript,
  generateCaption,
};

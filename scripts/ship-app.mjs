#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert web developer creating self-contained micro-tools. Generate only valid HTML, CSS, and JS. Respond with JSON: { "slug": "name", "name": "Display Name", "html": "...", "css": "...", "js": "..." }`;

async function readNextIdea() {
  const queuePath = path.join(__dirname, '../ideas/queue.md');
  const content = await fs.readFile(queuePath, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('- [ ]')) {
      return { text: lines[i].replace('- [ ] ', '').trim(), index: i, line: lines[i] };
    }
  }
  return null;
}

async function generateApp(idea) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Create a micro-tool for: ${idea}` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function writeAppFiles(appData) {
  const appDir = path.join(__dirname, '../apps', appData.slug);
  await fs.mkdir(appDir, { recursive: true });
  await fs.writeFile(path.join(appDir, 'index.html'), appData.html);
  await fs.writeFile(path.join(appDir, 'style.css'), appData.css);
  await fs.writeFile(path.join(appDir, 'script.js'), appData.js);
}

async function appendToSite(appData) {
  const sitePath = path.join(__dirname, '../site/index.html');
  let siteContent = await fs.readFile(sitePath, 'utf-8');
  const card = `  <a class="card" href="../apps/${appData.slug}/index.html">
    <h2>${appData.name}</h2>
    <p>${appData.description || 'A useful micro-tool.'}</p>
    <span class="tag">Static</span>
  </a>`;
  siteContent = siteContent.replace('</main>', `${card}\n</main>`);
  await fs.writeFile(sitePath, siteContent);
}

async function markIdeasDone(ideaIndex) {
  const queuePath = path.join(__dirname, '../ideas/queue.md');
  let content = await fs.readFile(queuePath, 'utf-8');
  const lines = content.split('\n');
  lines[ideaIndex] = lines[ideaIndex].replace('- [ ]', '- [x]');
  await fs.writeFile(queuePath, lines.join('\n'));
}

async function main() {
  const idea = await readNextIdea();
  if (!idea) {
    console.log('✓ No unchecked ideas. All done!');
    return;
  }

  console.log(`📋 Generating app for: ${idea.text}`);
  const appData = await generateApp(idea.text);
  if (!appData) {
    console.error('✗ Failed to generate app');
    process.exit(1);
  }

  console.log(`🚀 Created app: ${appData.name}`);
  await writeAppFiles(appData);
  console.log(`📁 Files written to apps/${appData.slug}/`);

  await appendToSite(appData);
  console.log(`🔗 Added card to site/index.html`);

  await markIdeasDone(idea.index);
  console.log(`✓ Marked idea as done`);
}

main().catch(err => { console.error('✗ Error:', err.message); process.exit(1); });

const input = document.getElementById('input');
const goBtn = document.getElementById('go');
const output = document.getElementById('output');
const summaryEl = document.getElementById('summary');
const copyBtn = document.getElementById('copy');

goBtn.addEventListener('click', async () => {
  const text = input.value.trim();
  if (!text) {
    alert('Paste some text first.');
    return;
  }
  goBtn.disabled = true;
  goBtn.textContent = 'Summarizing...';
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    summaryEl.textContent = data.summary || data.error || 'No summary returned.';
    output.classList.remove('hidden');
  } catch (e) {
    summaryEl.textContent = 'Network error. Is the server running?';
    output.classList.remove('hidden');
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = 'Summarize';
  }
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(summaryEl.textContent);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});

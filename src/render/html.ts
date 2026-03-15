import type { Report } from '../types.js';

/**
 * Escape HTML special characters to prevent XSS.
 */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render markdown-like text to HTML (lightweight, no external dependency).
 * Supports: code blocks (```), inline code (`), bold (**), newlines, numbered lists.
 * All text is HTML-escaped first for XSS safety.
 */
function md(str: string): string {
  // First split out code blocks to protect them from other transforms
  const parts: string[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(str)) !== null) {
    // Process the text before this code block
    if (match.index > lastIndex) {
      parts.push(inlineMd(str.slice(lastIndex, match.index)));
    }
    // Add the code block (already escaped)
    parts.push(`<pre><code>${esc(match[2].trim())}</code></pre>`);
    lastIndex = match.index + match[0].length;
  }

  // Process remaining text after last code block
  if (lastIndex < str.length) {
    parts.push(inlineMd(str.slice(lastIndex)));
  }

  return parts.join('');
}

/**
 * Process inline markdown (no code blocks).
 */
function inlineMd(str: string): string {
  let result = esc(str);

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text**
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Numbered lists: lines starting with "1. ", "2. ", etc.
  result = result.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>');
  // Wrap consecutive <li> in <ol>
  result = result.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ol>$1</ol>');

  // Newlines to <br> (but not inside tags we just created)
  result = result.replace(/\n(?!<)/g, '<br>\n');

  return result;
}

/**
 * Map category to a color for pill badges.
 * Handles both enum values and free-form Chinese/English category names.
 */
function categoryColor(category: string): string {
  const colors: Record<string, string> = {
    'language-feature': '#3b82f6',
    framework: '#8b5cf6',
    'design-pattern': '#ec4899',
    tool: '#f59e0b',
    algorithm: '#10b981',
    devops: '#6366f1',
    architecture: '#ef4444',
    testing: '#14b8a6',
    performance: '#f97316',
    other: '#6b7280',
  };

  // Direct match
  if (colors[category]) return colors[category];

  // Fuzzy match: check if category contains a keyword
  const lower = category.toLowerCase();
  const keywords: [string[], string][] = [
    [['语言', 'language', 'typescript', 'ts', 'js', 'python', 'rust', 'go'], '#3b82f6'],
    [['框架', 'framework', 'react', 'vue', 'electron', 'next', 'node'], '#8b5cf6'],
    [['模式', 'pattern', '设计'], '#ec4899'],
    [['工具', 'tool', 'cli', 'git', 'docker'], '#f59e0b'],
    [['算法', 'algorithm', 'data structure'], '#10b981'],
    [['devops', 'ci', 'cd', 'deploy', '部署', '运维'], '#6366f1'],
    [['架构', 'architecture', 'system'], '#ef4444'],
    [['测试', 'test', 'jest', 'vitest'], '#14b8a6'],
    [['性能', 'performance', 'optim', '优化', '缓存', 'cache'], '#f97316'],
    [['实践', 'practice', '最佳', 'best', '工程', 'engineering'], '#8b5cf6'],
    [['api', 'ipc', '通信', 'protocol'], '#6366f1'],
    [['工作流', 'workflow', 'claude'], '#f59e0b'],
  ];

  for (const [keys, color] of keywords) {
    if (keys.some((k) => lower.includes(k))) return color;
  }

  // Hash-based color for unknown categories (consistent color per category)
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6', '#f97316'];
  return palette[Math.abs(hash) % palette.length];
}

export function renderHTML(report: Report, dateStr: string): string {
  const knowledgeCards = report.knowledgeCards
    .map(
      (card) => `
      <div class="card">
        <div class="card-header">
          <h3>${esc(card.title)}</h3>
          <span class="pill" style="background:${categoryColor(card.category)}">${esc(card.category)}</span>
        </div>
        ${card.tags.length ? `<div class="tags">${card.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="card-body">${md(card.explanation)}</div>
        <div class="scenarios"><strong>适用场景 / Applicable Scenarios:</strong> ${md(card.applicableScenarios)}</div>
      </div>`,
    )
    .join('\n');

  const tips = report.practicalTips
    .map(
      (tip) => `
      <div class="tip">
        <p>${md(tip.tip)}</p>
        ${tip.snippet ? `<pre><code>${esc(tip.snippet)}</code></pre>` : ''}
        ${tip.sourceProject ? `<span class="source">from ${esc(tip.sourceProject)}</span>` : ''}
      </div>`,
    )
    .join('\n');

  const problems = report.problemsAndSolutions
    .map(
      (ps) => `
      <details class="problem">
        <summary>${esc(ps.problem)}</summary>
        <div class="problem-body">
          <p><strong>原因 / Cause:</strong> ${md(ps.cause)}</p>
          <p><strong>解法 / Solution:</strong> ${md(ps.solution)}</p>
        </div>
      </details>`,
    )
    .join('\n');

  const sessionSummaries = report.overview.sessionSummaries
    .map(
      (s) =>
        `<tr><td>${esc(s.project)}</td><td>${md(s.summary)}</td></tr>`,
    )
    .join('\n');

  const furtherLearning = report.furtherLearning
    .map(
      (fl) => `<li><strong>${esc(fl.topic)}</strong> — ${md(fl.reason)}</li>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(report.title)}</title>
<style>
:root {
  --bg: #ffffff;
  --text: #1a1a2e;
  --card-bg: #f8f9fa;
  --border: #e2e8f0;
  --accent: #3b82f6;
  --code-bg: #f1f5f9;
  --muted: #64748b;
}
html.dark {
  --bg: #0f172a;
  --text: #e2e8f0;
  --card-bg: #1e293b;
  --border: #334155;
  --accent: #60a5fa;
  --code-bg: #1e293b;
  --muted: #94a3b8;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 2rem 1rem;
}
.container {
  max-width: 900px;
  margin: 0 auto;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.theme-toggle {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--text);
  line-height: 1;
}
.theme-toggle:hover { border-color: var(--accent); }
h1 {
  font-size: 1.8rem;
  margin-bottom: 0.25rem;
}
.date {
  color: var(--muted);
  margin-bottom: 2rem;
}
h2 {
  font-size: 1.3rem;
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--accent);
}
.overview-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
.overview-table th, .overview-table td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.overview-table th { color: var(--muted); font-weight: 600; }
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.card-header h3 { font-size: 1.1rem; }
.pill {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.tags { margin-bottom: 0.5rem; }
.tag {
  display: inline-block;
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-right: 0.25rem;
  color: var(--muted);
}
.card-body ol { margin: 0.5rem 0 0.5rem 1.5rem; }
.card-body li { margin-bottom: 0.25rem; }
.scenarios {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--muted);
}
.tip {
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
  border-radius: 0 8px 8px 0;
}
.tip .source {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--muted);
}
pre {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}
code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
}
:not(pre) > code {
  background: var(--code-bg);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  font-size: 0.9em;
}
details.problem {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}
details.problem summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-weight: 500;
}
details.problem summary:hover { color: var(--accent); }
.problem-body {
  padding: 0 1rem 1rem;
}
.problem-body p { margin-bottom: 0.5rem; }
.further-learning {
  list-style: none;
  padding: 0;
}
.further-learning li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}
.further-learning li:last-child { border-bottom: none; }
.footer {
  margin-top: 3rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
}
@media print {
  body { padding: 0; }
  .container { max-width: 100%; }
  .theme-toggle { display: none; }
  details[open] summary ~ * { display: block; }
}
@media (max-width: 640px) {
  body { padding: 1rem 0.5rem; }
  h1 { font-size: 1.4rem; }
  .card { padding: 1rem; }
}
</style>
</head>
<body>
<div class="container">
  <div class="header-row">
    <div>
      <h1>${esc(report.title)}</h1>
      <p class="date">${esc(dateStr)} · ${report.overview.totalSessions} sessions · ${report.overview.projectsInvolved.length} projects</p>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">🌓</button>
  </div>

  <h2>📋 Overview</h2>
  <table class="overview-table">
    <thead><tr><th>Project</th><th>Summary</th></tr></thead>
    <tbody>${sessionSummaries}</tbody>
  </table>

  ${report.knowledgeCards.length ? `<h2>🧠 Knowledge Points</h2>\n${knowledgeCards}` : ''}

  ${report.practicalTips.length ? `<h2>💡 Practical Tips</h2>\n${tips}` : ''}

  ${report.problemsAndSolutions.length ? `<h2>🔧 Problems & Solutions</h2>\n${problems}` : ''}

  ${report.furtherLearning.length ? `<h2>📚 Further Learning</h2>\n<ul class="further-learning">${furtherLearning}</ul>` : ''}

  <p class="footer">Generated by OpenRecap</p>
</div>
<script>
(function() {
  const stored = localStorage.getItem('openrecap-theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
})();
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('openrecap-theme', isDark ? 'dark' : 'light');
}
</script>
</body>
</html>`;
}

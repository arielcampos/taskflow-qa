/* Local task parser. Explicit text only. Never invents steps, tests, evidence or context. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TaskFlowParse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const HEAD_ALIASES = {
    'the problem': 'problem', 'problem': 'problem', 'words used here': 'words', 'before you start': 'before',
    'what it touches': 'touches', 'done when': 'done', 'escalate if': 'escalate', 'break case': 'break',
    'break cases': 'break', 'what we\'re building': 'building', 'what you\'re building': 'building',
    'what we’re building': 'building', 'what you’re building': 'building', 'what is being built': 'building',
    'steps': 'steps', 'evidence': 'evidence', 'required evidence': 'evidence', 'testing': 'testing',
    'testing required': 'testing', 'reviewers': 'reviewers', 'notes': 'notes', 'acceptance criteria': 'done',
    'handoff': 'handoff', 'hand-off': 'handoff', 'hand off': 'handoff', 'handoff comment': 'handoff',
    'hand-off comment': 'handoff', 'what to post': 'handoff', 'how to escalate': 'notes'
  };
  const HEAD_KEYS = Object.keys(HEAD_ALIASES).sort((a, b) => b.length - a.length);
  const LABEL_RE = /^(module|view(?:\s*name)?|name|title|criteria|criterion|columns?|sort(?:\s*order)?|sharing|share with|count|filter count|view count|evidence|required evidence|testing|testing required|verification|notes?|description|fields?|existing|status|escalation|escalate(?:\s*if)?|when to escalate)\s*[:：]\s*(.*)$/i;
  const NOISE = /\b(hand[\s-]?off|reviewers?|post (it|this|them|the)|in the (task )?comment|how to escalate)\b/i;

  function headingOf(line) {
    const l = line.trim().replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '').replace(/^\*\*/, '');
    for (const k of HEAD_KEYS) {
      const re = new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])\\s*(?:\\*\\*)?\\s*[:：.]?\\s*(?:\\*\\*)?\\s*(.*)$', 'i');
      const m = l.match(re);
      if (!m) continue;
      const key = HEAD_ALIASES[k];
      const rest = (m[1] || '').trim();
      if (!rest) return { key, rest: '' };
      // "Evidence: …" / "Testing: …" inside a deliverable are labels, not new sections.
      if (key === 'evidence' || key === 'testing' || key === 'steps' || key === 'notes') continue;
      if (/[:：]/.test(l.slice(k.length, k.length + 4))) return { key, rest };
    }
    return null;
  }
  function sections(raw) {
    const out = {};
    if (!raw) return out;
    let cur = null, buf = [];
    const flush = () => {
      if (cur) {
        const txt = buf.join('\n').replace(/^\s*\n|\n\s*$/g, '');
        if (txt.trim()) out[cur] = (out[cur] ? out[cur] + '\n' : '') + txt;
      }
    };
    String(raw).split('\n').forEach(l => {
      const h = headingOf(l);
      if (h || /^#+\s/.test(l.trim())) {
        flush();
        cur = h ? h.key : null;
        buf = h && h.rest ? [h.rest] : [];
      } else if (cur) buf.push(l);
    });
    flush();
    return out;
  }
  function pointsOf(txt) {
    return String(txt || '').split('\n').map(l => l.replace(/^\s*(?:[-*•–]|\d+[.)]|\[[ xX]?\])\s*/, '').trim()).filter(Boolean);
  }
  function capLabel(s) {
    const k = String(s || '').trim().toLowerCase();
    const map = {
      module: 'Module', criteria: 'Criteria', criterion: 'Criteria', column: 'Columns', columns: 'Columns',
      sort: 'Sort', 'sort order': 'Sort', sharing: 'Sharing', 'share with': 'Sharing', count: 'Count',
      'filter count': 'Filter count', 'view count': 'View count', evidence: 'Evidence', 'required evidence': 'Evidence',
      testing: 'Testing', 'testing required': 'Testing', verification: 'Testing', notes: 'Notes', note: 'Notes',
      description: 'Description', fields: 'Fields', field: 'Fields', existing: 'Existing', status: 'Status',
      escalation: 'Escalation', 'escalate if': 'Escalation', escalate: 'Escalation', 'when to escalate': 'Escalation',
      view: 'View name', 'view name': 'View name', name: 'Name', title: 'Title'
    };
    return map[k] || s.trim();
  }
  function stripBullet(l) {
    return String(l || '').replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
  }
  function splitBlocks(section) {
    if (!section || !String(section).trim()) return [];
    const lines = String(section).split('\n');
    const blocks = [];
    let cur = [];
    let prevBlank = true;
    const isHeader = (raw) => {
      const t = stripBullet(raw);
      if (!t || LABEL_RE.test(t)) return false;
      if (/^\d+[.)]\s+\S/.test(raw.trim())) return true;
      if (prevBlank && t.length <= 90 && !/[:：]/.test(t)) return true;
      return false;
    };
    for (const l of lines) {
      if (isHeader(l) && cur.some(x => x.trim())) {
        blocks.push(cur.join('\n').trim());
        cur = [l];
      } else cur.push(l);
      prevBlank = !l.trim();
    }
    if (cur.some(x => x.trim())) blocks.push(cur.join('\n').trim());
    return blocks.filter(Boolean);
  }
  function extractFields(labeled) {
    const out = [];
    const add = s => {
      s = String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (!s || s.length > 60) return;
      if (/^(me|today|true|false|yes|no)$/i.test(s)) return;
      if (!out.some(x => x.toLowerCase() === s.toLowerCase())) out.push(s);
    };
    labeled.forEach(x => {
      if (/^columns?$|^fields?$/i.test(x.label)) x.text.split(/[,;]/).forEach(add);
      if (/^sort/i.test(x.label)) {
        x.text.split(/[,;]/).forEach(p => add(p.replace(/\b(asc|desc|ascending|descending|a to z|z to a)\b/ig, '')));
      }
      if (/^criteria$/i.test(x.label)) {
        x.text.split(/\s+and\s+|[,;]/i).forEach(p => {
          const m = p.match(/^([A-Za-z][^:=<>]{0,40}?)\s*(?:=|==|is\b|equals\b|contains\b|!=)/i);
          if (m) add(m[1]);
        });
      }
    });
    return out;
  }
  function firstSentences(text, n) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const parts = t.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [t];
    const keep = [];
    for (const s of parts) {
      const x = s.trim();
      if (!x) continue;
      if (/\b(criteria|columns?|sort order|api names?)\b/i.test(x)) continue;
      keep.push(x);
      if (keep.length >= n) break;
    }
    return keep.join(' ');
  }
  function rewriteDone(s) {
    let t = String(s || '').trim();
    if (!t) return t;
    t = t.replace(/\bexist and are available\b/i, 'have been created and are available');
    t = t.replace(/\bexists and is available\b/i, 'has been created and is available');
    t = t.replace(/\bexists\b/i, 'has been created');
    t = t.replace(/\bexist\b/i, 'have been created');
    t = t.replace(/\bare posted\b/i, 'have been posted');
    t = t.replace(/\bis posted\b/i, 'has been posted');
    t = t.replace(/\bhas the specified criteria, columns, and sort\b(?!\s+applied)/i, 'has the specified criteria, columns, and sort applied');
    t = t.replace(/\bhave the correct sharing settings\b(?!\s+in place)/i, 'have the correct sharing settings in place');
    t = t.replace(/\bhas the correct sharing settings\b(?!\s+in place)/i, 'has the correct sharing settings in place');
    if (!/[.!?]$/.test(t)) t += '.';
    return t;
  }
  function blockToItem(block, kind) {
    const rawLines = String(block).split('\n').map(l => l.trimEnd());
    const lines = rawLines.map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    let title = stripBullet(lines[0]);
    let module = '';
    const paren = title.match(/^(.+?)\s*[(\[]([^)\]]+)[)\]]\s*(?:[—–-]\s*(.+))?$/);
    if (paren && paren[2].split(/\s+/).length <= 5 && !/exist|verify|adjust/i.test(paren[2])) {
      title = paren[1].trim();
      module = paren[2].trim();
    }
    const dash = title.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    if (dash && !module && dash[2].split(/\s+/).length <= 5 && !/exist|verify|adjust|already/i.test(dash[2])) {
      title = dash[1].trim();
      module = dash[2].trim();
    } else if (dash && /exist|verify|adjust|already/i.test(dash[2])) {
      title = dash[1].trim();
    }
    title = title.replace(/\s*[—–-]\s*(already exists|existing|verify(?:\s+or\s+adjust)?(?:\s+only)?)\s*$/i, '').trim();
    if (!title || title.length > 140) return null;
    const labeled = [];
    const extra = [];
    lines.slice(1).forEach(l => {
      const clean = stripBullet(l);
      const m = clean.match(LABEL_RE);
      if (m) labeled.push({ label: capLabel(m[1]), rawLabel: m[1], text: m[2].trim(), source: l.trim() });
      else extra.push(l.trim());
    });
    const modRow = labeled.find(x => x.label === 'Module');
    if (modRow && modRow.text) module = modRow.text;
    const nameRow = labeled.find(x => x.label === 'View name' || x.label === 'Name' || x.label === 'Title');
    if (nameRow && nameRow.text && /^(view|deliverable|item)$/i.test(title)) title = nameRow.text;
    const existing = /\b(already exists|existing view|verify only|verify or adjust)\b/i.test(block);
    const build = [];
    if (module) build.push({ label: 'Module', text: module, source: modRow ? modRow.source : lines[0].trim() });
    labeled.forEach(x => {
      if (['Module', 'View name', 'Name', 'Title', 'Evidence', 'Testing', 'Notes', 'Description', 'Escalation', 'Existing'].includes(x.label)) return;
      if (!x.text) return;
      build.push({ label: x.label, text: x.text, source: x.source });
    });
    const fields = extractFields(labeled.map(x => ({ label: x.rawLabel, text: x.text })));
    const steps = [];
    const checks = [];
    if (kind === 'work') {
      const nameLine = lines[0].trim();
      steps.push({
        text: (existing ? 'Verify or adjust the existing view ' : 'Create the saved view ') + title,
        source: nameLine,
        tests: [],
        evidence: []
      });
      if (module && modRow) steps.push({ text: 'Set the module to ' + module, source: modRow.source, tests: [], evidence: [] });
      labeled.forEach(x => {
        if (['Module', 'View name', 'Name', 'Title', 'Evidence', 'Testing', 'Notes', 'Description', 'Escalation', 'Existing', 'Fields'].includes(x.label)) return;
        if (!x.text) return;
        steps.push({ text: 'Set ' + x.label.toLowerCase() + ' to ' + x.text, source: x.source, tests: [], evidence: [] });
      });
    }
    labeled.forEach(x => {
      if (!x.text) return;
      if (x.label === 'Evidence') checks.push({ type: 'evidence', text: x.text, source: x.source });
      if (x.label === 'Testing') checks.push({ type: 'verification', text: x.text, source: x.source });
    });
    extra.forEach(l => {
      const clean = stripBullet(l);
      if (/\b(screenshot|record id|record ids|record count)\b/i.test(clean) && /\b(post|required|provide|include|capture|attach|evidence|box)\b/i.test(clean)) {
        checks.push({ type: 'evidence', text: clean, source: l.trim() });
      } else if (/^(testing|test|verify)\b/i.test(clean)) {
        checks.push({ type: 'verification', text: clean.replace(/^(testing|test|verify)\s*[:：]?\s*/i, ''), source: l.trim() });
      }
    });
    let escalation = '';
    if (kind === 'break') {
      const esc = labeled.find(x => x.label === 'Escalation');
      if (esc && esc.text) escalation = esc.text;
      if (!escalation) {
        const el = lines.find(l => /^escalate\b/i.test(stripBullet(l)));
        if (el) escalation = stripBullet(el).replace(/^escalate(?:\s*if)?\s*[:：]?\s*/i, '').trim();
      }
    }
    const desc = labeled.find(x => x.label === 'Description');
    let sentence = desc ? firstSentences(desc.text, 1) : '';
    if (sentence && /\b(criteria|columns?|sort|api names?)\b/i.test(sentence)) sentence = '';
    return {
      kind,
      title,
      module,
      sentence,
      existing,
      fields,
      source: [block.trim()],
      build,
      steps,
      checks,
      escalation
    };
  }
  function numberAndTitle(text) {
    const lines = String(text || '').split('\n');
    let number = '', title = '';
    let seen = 0;
    for (const line of lines) {
      const l = line.trim().replace(/^#+\s*/, '');
      if (!l) continue;
      seen++;
      const m = l.match(/^(?:task\s+)?(\d+[a-z]?(?:\.\d+[a-z]?)*)\b[.\s:–—-]*(.*)$/i);
      if (m && (m[1].includes('.') || /^task\b/i.test(l))) {
        number = m[1];
        title = (m[2] || '').replace(/^[:.\-–—\s]+/, '').trim();
        break;
      }
      if (seen >= 6) break;
    }
    if (!title) {
      const first = lines.map(l => l.trim()).find(Boolean) || '';
      title = first.replace(/^task\s+\S+\s*/i, '').trim();
    }
    return { number, title };
  }

  function parseTaskLocal(raw) {
    const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const sec = sections(text);
    const id = numberAndTitle(text);
    const problem = sec.problem || '';
    const words = sec.words || '';
    const beforeStart = sec.before || '';
    const touches = sec.touches || '';
    const acceptance = sec.done ? pointsOf(sec.done) : [];
    const reviewers = sec.reviewers ? pointsOf(sec.reviewers) : [];
    const escalateIf = [];
    if (sec.escalate) {
      let started = false;
      for (const l of sec.escalate.split('\n')) {
        const txt = stripBullet(l);
        if (!txt) continue;
        if (/^\s*(?:[-*•–]|\d+[.)])\s+/.test(l)) {
          started = true;
          if (!NOISE.test(txt)) escalateIf.push(txt);
        } else if (started) break;
        else if (!NOISE.test(txt) && !/[:：]$/.test(txt)) escalateIf.push(txt);
      }
    }
    const items = [];
    const missing = [];
    splitBlocks(sec.building || '').forEach(b => {
      const item = blockToItem(b, 'work');
      if (item) items.push(item);
    });
    splitBlocks(sec.break || '').forEach(b => {
      const item = blockToItem(b, 'break');
      if (item) items.push(item);
    });
    items.forEach(it => {
      if (it.kind !== 'work') return;
      if (!it.module) missing.push('Module is missing for ' + it.title + '.');
      if (!it.title) missing.push('View name is missing.');
      const share = (it.build || []).find(b => /shar/i.test(b.label));
      if (!share) missing.push('Sharing target is missing for ' + it.title + '.');
      const count = (it.build || []).find(b => /count/i.test(b.label));
      const asksCount = /\b(filter count|view count|record count)\b/i.test([...(it.source || []), ...(it.checks || []).map(c => c.text)].join('\n'));
      if (asksCount && !count) missing.push('Count is missing for ' + it.title + '.');
    });
    if (!items.length) missing.push('No view or deliverable name was found in the task text.');
    const doneWhen = acceptance.map(rewriteDone);
    if (acceptance.length && !doneWhen.some(d => /all acceptance criteria have been met/i.test(d))) {
      doneWhen.push('All acceptance criteria have been met.');
    }
    return {
      number: id.number,
      title: id.title || 'Untitled task',
      overview: firstSentences(problem, 3),
      rawText: text,
      items,
      problem,
      words,
      beforeStart,
      touches,
      acceptance,
      escalateIf,
      reviewers,
      doneWhen,
      missing
    };
  }

  return { parseTaskLocal, sections, pointsOf, rewriteDone };
});

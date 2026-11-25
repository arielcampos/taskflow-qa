# TaskFlow QA

Windows desktop app for turning one Zoho CRM / Cloven Flex task into an implementation workspace, a paste-ready handoff, and an evidence document.

Version 1.1.

## What it does

Paste the JSON for one task. TaskFlow builds a checklist, context, an impact diagram, and a handoff from that JSON. It does not invent steps, tests, evidence, or escalation. Fields that must stay verbatim are kept as written.

The interface language is English or Spanish. Task content is not translated by the app. If a field is bilingual (`{ "en": "...", "es": "..." }`), the EN / SP buttons switch that text. A `source` field stays a single verbatim string.

## Screens

- **Implementation & Testing.** Checklist on the left, task summary on the right. KPIs sit next to the title: items, subtasks completed, subtasks pending, acceptance criteria, blocked items, and evidence collected (`done/total`).
- **Context.** Problem, words, before you start, what the task touches, acceptance, and escalation. Verbatim fields stay verbatim.
- **Impact diagram.** Modules, fields, and views the task touches.
- **Open questions.** Questions you still need answered before the work is done.
- **Evidence.** Requested evidence, screenshots, and text evidence (record IDs, URLs, and plain text).
- **Handoff.** Editable sections: What I did, Evidence, Done When - Completed, Anything I changed, Open questions, and Total time. Copy and PDF use those sections. **Restore original text** puts the generated wording back.

## Working a task

- Mark steps and required evidence as you go. A testing row can be Full, Partially, or Didn't work. Only Full counts as done.
- Attach screenshots and text evidence on each Required Evidence row. If a task has no Required Evidence row, the same buttons appear on the item.
- **Hours worked** is in the right panel, under Escalate If. That value fills **Total time** in the handoff unless you edit that section.
- **Reset task** clears checks, screenshots, evidence, hours, questions, notes, and handoff edits. The original task text stays. A warning appears before anything is deleted.
- Status starts as Pending. It becomes In progress when you record work. Done stays Done until you reset or change it.

## Task JSON

Create a task by pasting JSON, or import a JSON file. A bilingual field looks like this:

```json
{
  "number": "2a.6",
  "title": {
    "en": "Create and verify custom views",
    "es": "Crear y verificar vistas personalizadas"
  },
  "overview": { "en": "...", "es": "..." },
  "items": [],
  "problem": { "en": "...", "es": "..." },
  "source": "Verbatim passage from the original task."
}
```

Plain strings are also accepted. They stay in the language they were written in.

## Evidence file

**Download Evidence** writes `evidence.docx`. Each required evidence item is titled, then its screenshots, then its IDs, URLs, or text. The task or item title is placed immediately before each screenshot. Evidence from different subtasks is not mixed.

## Storage

Tasks and screenshots are saved on this PC, not in the cloud. The default folder is:

`%AppData%\TaskFlow QA`

You can change the folder from Settings in the sidebar. Settings also holds JSON backup export and import. Dark mode stays visible without opening Settings.

An empty save does not overwrite a workspace that already has tasks.

## Run

Requirements: Windows, and Node.js if you install dependencies yourself. Electron is a dev dependency.

```bat
cd TaskFlow-QA
npm install
npm start
```

Or double-click `Start TaskFlow QA.bat` after `npm install`.

## Project files

| File | Role |
| --- | --- |
| `main.js` | Electron window, storage, file dialogs |
| `preload.js` | Bridge between the window and Electron |
| `index.html` | Interface, checklist, handoff, and document export |
| `i18n.js` | English and Spanish interface strings |
| `parser.js` | Local parser when the paste is not already JSON |
| `vendor/` | JSZip and jsPDF used to build `.docx` and PDF files |

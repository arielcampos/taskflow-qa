# TaskFlow QA – Convert an Airtable Task into JSON

## 1. Copy the Airtable task and turn it into JSON with AI

Copy the full plain-text content of a task from Airtable (or any other source) and send it to an AI model together with the prompt below. The model returns a single JSON object that can be pasted directly into TaskFlow QA.

The prompt tells the AI to convert the task text into JSON. The model must follow these rules:

- Never invent information. Steps, tests, evidence, escalation points, modules, view names, counts and sharing targets come only from what the task text states explicitly. If something is missing, list it under `"missing"`.
- Copy context sections, Escalate If conditions and Done When points **verbatim** (do not paraphrase).
- Every work item and step must include a `"source"` array containing the exact passages from the original task that support it.
- The overview must be 1–3 plain sentences in simple language (no field-level detail).
- Create one work item per view, deliverable or distinct piece of work, and one break item per Break Case.
- Escalate If contains only the escalation conditions themselves (no instructions on how to escalate, no reviewers, no hand-off text).
- Rewrite Done When points in completed language for the handoff (“have been created”, “has been applied”, and so on) and end with “All acceptance criteria have been met.”

### Prompt to send to the AI

Send this prompt, then paste the full task text where indicated. Ask the model to return only the JSON.

```text
You convert a single plain-text development task into a structured JSON object for TaskFlow QA.

Rules:
- Never invent. Everything must come from the task text.
- Verbatim for context sections, Escalate If and Done When.
- Every item and step must have a "source" array with the exact supporting passages.
- Overview = 1–3 plain sentences, no field-level detail.
- One work item per view/deliverable; one break item per Break Case.
- Escalate If = only the escalation conditions.
- Done When points rewritten in completed language, ending with "All acceptance criteria have been met."

Return only this JSON:

{
  "number": "",
  "title": "",
  "overview": "",
  "items": [
    {
      "kind": "work",
      "title": "",
      "module": "",
      "sentence": "",
      "existing": false,
      "fields": [],
      "source": [],
      "build": [],
      "steps": [
        {
          "text": "",
          "source": "",
          "tests": [],
          "evidence": []
        }
      ],
      "checks": [],
      "escalation": ""
    }
  ],
  "problem": "",
  "words": "",
  "beforeStart": "",
  "touches": "",
  "escalateIf": [],
  "acceptance": [],
  "doneWhen": [],
  "reviewers": [],
  "missing": []
}

Convert the following task text into the TaskFlow QA JSON described above.

Task text:
[PASTE THE FULL AIRTABLE TASK TEXT HERE]
```

# TaskFlow QA

Windows desktop app for turning one Zoho CRM development task into an implementation workspace, a paste-ready handoff, and an evidence document.

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
  "number": "1.1",
  "title": {
    "en": "Create a saved view for today's tasks",
    "es": "Crear una vista guardada para las tareas de hoy"
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

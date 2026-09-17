# Idea 2 — Project Context

**Source:** FigJam board [*Capstone research*](https://www.figma.com/board/im0O0k4DLrdOmlk5NJjMaq/Capstone-research?node-id=143-559), section **“Idea 2 - project proposal”** (node `143:559`)  
**Reviewed:** 2026-09-17

## Project in one sentence

Mitwerk is a visual version-history workspace for vibe-coded projects: it records AI-assisted iterations, organizes them into navigable branches, and lets users replay or revisit the working result at any point in the project’s history.

## Problem being addressed

Long AI coding sessions produce many prompts, file changes, previews, and partial directions, but current tools make the process difficult to remember and retrace.

The proposal identifies several related problems:

- A user can spend the whole day prompting and later struggle to remember what they did.
- Past UI iterations are hard to locate and compare. The board notes that Cursor offers only a limited, one-step retrace experience.
- Existing workarounds are manual and disconnected from the coding environment: taking dated screenshots in Figma, compressing repositories into timestamped ZIP files, or manually retrieving an old Git commit.
- Git can recover code, but it does not give users a quick, visual account of how the product evolved or connect an iteration to the prompts and references that produced it.
- Token or usage limits are poorly communicated, and users must judge the relationship between tokens consumed and useful work produced themselves.

The central user need is therefore broader than rollback: users need a legible memory of the project’s evolution, with enough context to understand, compare, and resume earlier directions.

## Core product concept

The proposed experience combines two linked representations of project history:

1. A **Version Tree** records the procedural history and branches of the project.
2. A **Preview Panel** turns the outputs of that history into a visual sequence that can be browsed or played back.

The proposal uses a flipbook metaphor to connect them:

- **One frame = one prompt/output step**
- **One slide = one version**, which may group several prompt frames
- **A sequence of slides = the visible evolution of the project**
- **Branches = alternate plans or experiments** that diverge from a shared history

This makes version control understandable as both a tree of decisions and a time-based visual record.

## Product layout

The interface is divided into four visible areas:

| Area | Role |
|---|---|
| Side navigation | Project, file, or conversation navigation; the exact model is unresolved. |
| Preview Panel | Visual playback and inspection of past versions. |
| Version Tree | Branching map of versions, prompts, files, and project decisions. |
| Chat | The prompting conversation that produced the work. |

The **Preview Panel and Version Tree together form the main workspace and the primary design scope**. The side navigation and chat can borrow established interaction patterns from tools such as Cursor, Claude, or Codex.

The board imagines this workspace as a pinned tab inside an IDE-like shell. Other tabs could hold code files, image previews, or a live browser.

## Version Tree

The Version Tree is described as a form of procedural version mapping that combines aspects of a source-control graph, logic chart, and decision tree.

Each version node behaves like a human-readable Git commit. A version may be created:

- automatically after a long-running task;
- in response to a real Git commit;
- through a manual archive or save action.

Automatic capture matters because users may forget to commit or may be building locally outside a disciplined Git workflow.

Each version node may contain:

- version number;
- automatic or manual save label;
- count of associated prompts or frames;
- a link back to the corresponding messages in Chat;
- icons for the types of files changed;
- reference files and skills, with expandable details;
- a code archive or stored diff;
- an automatically generated summary;
- a compact, fixed list of all files used.

The tree should support branching so users can test different plans, return to an earlier state, and understand how alternatives relate.

## Preview Panel

The Preview Panel visualizes previous versions as a sequence. It is intended to help users recall the day’s work and revisit an earlier result without first reconstructing it from messages or commits.

The proposal explores three views with different purposes.

### 1. Isometric catalogue view

A three-dimensional catalogue of versions shown as slides with thickness, compared on the board to browsing vinyl records or CD cases. A version acts as a container that can hold several prompt frames.

Potential controls and visual cues:

- time ranges such as **Today**, **Last 7 days**, and **All time**;
- an isometric grid indicating the time axis;
- direct browsing across version objects.

### 2. Frontal playback view

A flat, interactive preview with video-like controls.

- Playing compiles the prompt frames into a regular or ping-pong loop.
- Pausing enables interaction with the prototype at the selected moment.
- The timeline can be scrolled to move between versions.
- The active preview highlights the matching node in the Version Tree.
- Labels can show version number, generated summary, and related files.
- The prototype can be resized to test responsive behavior.
- Device or container presets can change the preview viewport.
- Onion-skinning is suggested as a possible comparison aid.

The time-lapse model is partly inspired by Procreate’s recording and replay of a creative process.

### 3. Side usage view (optional)

A side-on version sequence doubles as a token-consumption visualization. Each version becomes a column, with color distinguishing existing usage from newly added usage. This view connects resource consumption to visible progress rather than showing a usage limit in isolation.

## Handling branches in playback

A branching project cannot be represented by one universal linear movie. The current proposal resolves this by generating the sequence from the **dominant branch relative to the selected version**. Selecting another node changes which path through the tree is shown in the Preview Panel.

This dependency is fundamental: the Version Tree defines the available histories, while the Preview Panel renders the currently selected history as a navigable sequence.

## Research signal behind the proposal

The section includes a participant quote that directly motivates the concept:

> “Sometimes you may sit at your desk prompting all day, and by the end you don’t really remember what you did.” — Participant #2

The proposal also records the author’s own workaround of keeping timestamped UI screenshots in Figma and separate timestamped repository archives. These behaviors suggest that users already create an external visual memory when the coding tool does not provide one.

The concept therefore targets two connected jobs:

- **Recovery:** return to an earlier implementation or alternate branch.
- **Reflection:** understand what happened, what changed, which inputs were involved, and whether the work justified its cost.

## Open product questions

The board leaves several decisions unresolved:

- Should Mitwerk be a plugin, a standalone app, or a native part of an IDE-like environment?
- Should side navigation organize work by files, as in an IDE, or by conversations, as in an AI chat tool?
- What event should define a version: every prompt, a cluster of prompts, a long-running task, a Git commit, or an explicit user save?
- Should stored code contain a full archive or only the changes from the preceding version?
- What visual grammar best combines branching version control with a decision or logic tree?
- How should the product determine the “dominant” branch used for playback?
- Is onion-skin comparison useful enough to justify its visual complexity?
- Is token-consumption analysis part of the core product or an optional analytical view?
- The usage-related sticky is unfinished on the board, so the intended efficacy metric still needs a precise definition.

## Current scope and likely MVP

The proposal gives the clearest priority to the linked **Version Tree + Preview Panel** workspace. A focused first prototype could validate the core relationship with:

1. a small branching history of captured versions;
2. version nodes containing prompt, file-change, and summary metadata;
3. selection synchronized between the tree and a live or recorded preview;
4. a linear timeline derived from the selected branch;
5. manual version capture first, with automatic capture added after the version boundary is understood.

The isometric catalogue, video playback, responsive preview controls, and token visualization are strong presentation directions, but they depend on the underlying version and capture model working first.

## Repository context

This repository is in the middle of the Idea 2 pivot:

- The earlier design-review/comment prototype has been moved under `archive/review-comment-spike/`.
- The active React surface is currently an empty shell, leaving the new product direction ready to implement.
- `docs/project-proposal.md` and the README still describe the earlier design-review concept and should be treated as historical context until the project-level documentation is updated.

The working product direction established by this FigJam section is visual iteration memory and branching for AI-assisted coding, rather than automated design review.

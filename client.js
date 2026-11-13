/**
 * @local/novel-studio — Client half.
 *
 * A card-based writing workspace registered as its own Conversation View:
 * chapter cards on the left, a distraction-free editor in the middle, and the
 * AI writing coach on the right. Selecting text in the editor raises a
 * floating action bar; every action turns the selection into a prompt that is
 * submitted to the current Session (with the composer as a fallback).
 *
 * Local state only: the draft lives in localStorage per Session. No Host data
 * is written, so the workspace cannot corrupt the session log.
 */
window.__ModuleLoader__.load({
  id: '@local/novel-studio',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    const NS = 'novel-studio';
    const STORE_PREFIX = 'dsh-novel-studio:v1:';
    const MATERIAL_KEY = 'dsh-novel-studio:material:v1';

    const readMaterial = () => {
      try {
        return window.localStorage.getItem(MATERIAL_KEY) === 'clear' ? 'clear' : 'frosted';
      } catch (error) {
        return 'frosted';
      }
    };

    const writeMaterial = (value) => {
      try {
        window.localStorage.setItem(MATERIAL_KEY, value);
      } catch (error) {
        /* preference stays in memory only */
      }
    };

    /* ------------------------------------------------------------------ */
    /* Copy                                                               */
    /* ------------------------------------------------------------------ */

    const STRINGS = {
      'view.label': { zh: '小说', en: 'Novel' },

      'ui.workspace': { zh: '小说工作台', en: 'Novel workspace' },
      'material.label': { zh: '卡片材质', en: 'Card finish' },
      'material.frosted': { zh: '磨砂', en: 'Frosted' },
      'material.clear': { zh: '透明', en: 'Clear' },
      'material.frosted.hint': { zh: '半透明磨砂玻璃，背景柔化', en: 'Frosted glass — background softened' },
      'material.clear.hint': { zh: '清透玻璃，透出背景细节', en: 'Clear glass — background stays visible' },

      'work.titlePlaceholder': { zh: '作品标题', en: 'Work title' },
      'work.goal': { zh: '日更目标', en: 'Daily goal' },

      'today.title': { zh: '今日写作', en: 'Today' },
      'today.of': { zh: '目标 {g} 字', en: 'Goal {g} chars' },
      'unit.chars': { zh: '字', en: 'chars' },
      'stat.total': { zh: '总字数', en: 'Total chars' },
      'stat.chapters': { zh: '章节', en: 'Chapters' },

      'chapters.title': { zh: '章节', en: 'Chapters' },
      'chapters.new': { zh: '+ 新建章节', en: '+ New chapter' },
      'chapters.defaultTitle': { zh: '第 {n} 章', en: 'Chapter {n}' },
      'chapters.delete': { zh: '删除', en: 'Delete' },
      'chapters.words': { zh: '{n} 字', en: '{n} chars' },
      'chapter.placeholder': { zh: '章节标题', en: 'Chapter title' },

      'editor.placeholder': {
        zh: '在这里开始写。写到一半卡住？选中任意一段，浮出的操作条可以直接让 AI 润色、续写，或者给你三个后续方向。',
        en: 'Start writing here. Stuck halfway? Select any passage — the floating bar lets AI polish it, continue it, or propose three directions.',
      },
      'editor.words': { zh: '本章 {n} 字', en: '{n} chars in this chapter' },
      'editor.saved': { zh: '草稿自动保存在本机', en: 'Draft saved locally' },

      'pill.selected': { zh: '已选 {n} 字', en: '{n} selected' },
      'pill.polish': { zh: '润色', en: 'Polish' },
      'pill.continue': { zh: '续写', en: 'Continue' },
      'pill.directions': { zh: '写作方向', en: 'Directions' },
      'pill.ask': { zh: '提问', en: 'Ask' },
      'pill.placeholder': { zh: '想问 AI 什么？', en: 'Ask about this passage…' },
      'pill.send': { zh: '发送', en: 'Send' },
      'pill.cancel': { zh: '取消', en: 'Cancel' },

      'ai.title': { zh: 'AI 写作助手', en: 'AI writing coach' },
      'ai.hint': {
        zh: '选中正文里的一段，或直接用下面的动作。回答会出现在对话里。',
        en: 'Select a passage, or use an action below. Replies arrive in the conversation.',
      },
      'ai.selPreview': { zh: '已选中 {n} 字，动作会作用在选段上', en: '{n} chars selected — actions apply to it' },

      'ai.action.polish': { zh: '润色选段', en: 'Polish the passage' },
      'ai.action.polish.sub': { zh: '去重复用词 · 调节奏', en: 'tightens wording' },
      'ai.action.continue': { zh: '接着写 300 字', en: 'Continue for 300 chars' },
      'ai.action.continue.sub': { zh: '承接最后一句', en: 'picks up the last line' },
      'ai.action.directions': { zh: '三个后续方向', en: 'Three directions' },
      'ai.action.directions.sub': { zh: '钩子 · 冲突 · 情绪落点', en: 'hook · conflict · payoff' },
      'ai.action.outline': { zh: '拆这一章的节拍', en: 'Break this chapter into beats' },
      'ai.action.outline.sub': { zh: '找出最松的一段', en: 'finds the slack' },
      'ai.action.dialogue': { zh: '只优化对话', en: 'Dialogue only' },
      'ai.action.dialogue.sub': { zh: '删解释性台词', en: 'drops on-the-nose lines' },

      'ai.question.placeholder': { zh: '关于这一段、这一章，你想问什么？', en: 'Ask about this passage or chapter…' },
      'ai.send': { zh: '发给 AI', en: 'Send to AI' },
      'ai.openChat': { zh: '去对话里看回答', en: 'Open the conversation' },
      'ai.sent': { zh: '已发到对话', en: 'Sent to the conversation' },
      'ai.filled': { zh: '已填入输入框，回车发送', en: 'Placed in the composer — press Enter to send' },
      'ai.needText': { zh: '先写一点正文，或在编辑器里选中一段', en: 'Write something first, or select a passage' },
      'ai.busy': { zh: '正在发送…', en: 'Sending…' },
      'ai.failed': { zh: '发送失败：{msg}', en: 'Send failed: {msg}' },

      'export.title': { zh: '导出', en: 'Export' },
      'export.txt': { zh: '导出 TXT', en: 'Export TXT' },
      'export.md': { zh: '导出 Markdown', en: 'Export Markdown' },

      'inspire.title': { zh: '灵感', en: 'Spark' },
      'inspire.refresh': { zh: '换一条', en: 'Another' },
      'inspire.a': { zh: '把主角最想守住的秘密，交给最不该知道的人。', en: 'Give the secret the hero guards to the one person who must never hear it.' },
      'inspire.b': { zh: '让一次善意的谎言，在后面变成要命的把柄。', en: 'Let one well-meant lie become the lever that ruins them later.' },
      'inspire.c': { zh: '这一场戏里，让两个人各有一次没说出口的话。', en: 'In this scene, give both people one thing they never say.' },
      'inspire.d': { zh: '给反派一个比主角更合理的理由。', en: 'Give the antagonist a reason that is more reasonable than the hero\u2019s.' },
      'inspire.e': { zh: '用一件旧物，把过去的伤口带回现场。', en: 'Bring an old wound back on stage with one ordinary object.' },
      'inspire.f': { zh: '章末留一个读者知道、角色不知道的危险。', en: 'End the chapter on a danger the reader knows and the character does not.' },

      'prompt.polish': {
        zh: '你是我的小说写作搭档。下面给出作品名、章节名和一段正文，请在不改变信息与情节的前提下润色这段文字：去掉重复用词，调整长短句节奏，保留原本的人称、语气和叙述视角。\n输出格式：\n1. 润色后的正文（只输出正文）\n2. 另起一行，用不超过 40 字说明最关键的一处改动。\n\n【作品】{work}\n【章节】{chapter}\n【选中正文】\n{text}',
        en: 'You are my fiction writing partner. Below are the work title, chapter title, and a passage. Polish the passage without changing its information or plot: cut repeated words, vary sentence rhythm, keep the original person, tone, and point of view.\nOutput:\n1. the polished passage only\n2. one new line, at most 40 words, naming the single most important change.\n\n[Work] {work}\n[Chapter] {chapter}\n[Passage]\n{text}',
      },
      'prompt.continue': {
        zh: '接着下面的正文继续写约 300 字。保持同一人称、时态和语言风格，承接最后一句的动作或情绪；不要总结、不要旁白点评、不要换章，只输出续写的正文。\n\n【作品】{work}\n【章节】{chapter}\n【已有正文（结尾部分）】\n{text}',
        en: 'Continue the passage below for roughly 300 characters. Keep the same person, tense, and voice, and pick up the action or feeling of the last sentence; no summary, no narrator commentary, no chapter break — output only the continuation.\n\n[Work] {work}\n[Chapter] {chapter}\n[Text so far (tail)]\n{text}',
      },
      'prompt.directions': {
        zh: '基于下面的正文，给出 3 个可行的后续写作方向。每个方向按这五行写：\n方向名（6 字以内）；一句话剧情钩子；核心冲突；读者情绪落点；可能的风险。\n不要写正文，三个方向之间要有明显差异（例如：推进主线 / 深挖人物 / 制造意外）。\n\n【作品】{work}\n【章节】{chapter}\n【正文】\n{text}',
        en: 'Based on the passage below, give 3 viable directions the story could take. For each: a name (max 4 words), a one-line hook, the core conflict, the emotional payoff for the reader, and the risk. No prose — make the three clearly different (advance the plot / deepen a character / spring a surprise).\n\n[Work] {work}\n[Chapter] {chapter}\n[Text]\n{text}',
      },
      'prompt.outline': {
        zh: '帮我把这一章拆成节拍：按场景列出 目标 / 阻碍 / 转折 / 收尾，然后指出哪一处节奏最松（可以删、并或提前），最后给一句这一章该留下的钩子。\n\n【作品】{work}\n【章节】{chapter}\n【正文】\n{text}',
        en: 'Break this chapter into beats: per scene, list goal / obstacle / turn / exit. Then point out where the pacing sags (what to cut, merge, or move earlier), and finish with the hook this chapter should leave behind.\n\n[Work] {work}\n[Chapter] {chapter}\n[Text]\n{text}',
      },
      'prompt.dialogue': {
        zh: '只优化下面这段里的对话：删掉解释性台词，让每个人说话方式可区分，冲突要露在字面上。输出改后的对话，并另起一行列出 2 条改动理由。\n\n【作品】{work}\n【章节】{chapter}\n【正文】\n{text}',
        en: 'Only improve the dialogue in the passage below: cut lines that explain, make each character sound distinguishable, keep the conflict on the surface. Output the rewritten dialogue, then list 2 reasons for the changes.\n\n[Work] {work}\n[Chapter] {chapter}\n[Text]\n{text}',
      },
      'prompt.ask': {
        zh: '关于下面的正文，我的问题是：{question}\n请先直接回答，再给一条可以马上落进正文的具体改法。\n\n【作品】{work}\n【章节】{chapter}\n【正文】\n{text}',
        en: 'My question about the text below: {question}\nAnswer it directly first, then give one concrete change I can apply to the prose right away.\n\n[Work] {work}\n[Chapter] {chapter}\n[Text]\n{text}',
      },
    };

    const INSPIRE_KEYS = ['inspire.a', 'inspire.b', 'inspire.c', 'inspire.d', 'inspire.e', 'inspire.f'];

    /* ------------------------------------------------------------------ */
    /* Styles                                                             */
    /* ------------------------------------------------------------------ */

    const CSS = `
.ns-root {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 20px 20px 40px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 1.6;
}
.ns-wrap {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr) 286px;
  gap: 14px;
  align-items: start;
}
@media (max-width: 1120px) {
  .ns-wrap { grid-template-columns: minmax(0, 1fr) 268px; }
  .ns-col-left { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; }
  .ns-col-left > .ns-card { flex: 1 1 200px; }
}
@media (max-width: 820px) {
  .ns-root { padding: 12px 12px 32px; }
  .ns-wrap { grid-template-columns: minmax(0, 1fr); }
  .ns-col-left { flex-direction: column; }
}
.ns-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ns-toolbar {
  max-width: 1180px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}
.ns-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .02em;
  color: var(--dsw-alias-label-secondary);
}
.ns-seg {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 82%, rgba(255, 255, 255, .45));
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 42%, transparent);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  backdrop-filter: blur(16px) saturate(150%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .18);
}
.ns-seg-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  letter-spacing: .02em;
  padding: 4px 13px;
  border-radius: 999px;
  cursor: pointer;
  transition: background .18s ease, color .18s ease, box-shadow .18s ease;
}
.ns-seg-btn:hover { color: var(--dsw-alias-label-primary); }
.ns-seg-btn[data-on="true"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .24), 0 1px 6px rgba(0, 0, 0, .16);
}
.ns-card {
  position: relative;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  background: linear-gradient(
    168deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-1) 58%, transparent) 0%,
    color-mix(in srgb, var(--dsw-alias-bg-layer-1) 34%, transparent) 100%
  );
  -webkit-backdrop-filter: blur(24px) saturate(172%) brightness(1.05);
  backdrop-filter: blur(24px) saturate(172%) brightness(1.05);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 92%, rgba(255, 255, 255, .55));
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .24),
    inset 0 -1px 0 rgba(255, 255, 255, .05),
    0 10px 28px rgba(0, 0, 0, .16);
  padding: 14px 16px;
  min-width: 0;
}
.ns-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(120% 78% at 0% 0%, rgba(255, 255, 255, .15), rgba(255, 255, 255, 0) 44%),
    radial-gradient(96% 64% at 100% 100%, rgba(255, 255, 255, .07), rgba(255, 255, 255, 0) 58%);
  opacity: .9;
}

/* ---- clear glass: thin tint, sharp background, edges carry the material ---- */
.ns-root[data-material="clear"] { text-shadow: 0 1px 2px rgba(0, 0, 0, .26); }
.ns-root[data-material="clear"] .ns-card {
  background:
    linear-gradient(
      168deg,
      color-mix(in srgb, var(--dsw-alias-bg-base) 42%, transparent) 0%,
      color-mix(in srgb, var(--dsw-alias-bg-base) 26%, transparent) 100%
    ),
    linear-gradient(
      168deg,
      color-mix(in srgb, var(--dsw-alias-bg-layer-1) 24%, transparent) 0%,
      color-mix(in srgb, var(--dsw-alias-bg-layer-1) 8%, transparent) 100%
    );
  -webkit-backdrop-filter: blur(2.5px) saturate(124%) brightness(1.04);
  backdrop-filter: blur(2.5px) saturate(124%) brightness(1.04);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l1) 58%, rgba(255, 255, 255, .74));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .4),
    inset 0 -1px 0 rgba(255, 255, 255, .1),
    inset 0 0 24px rgba(255, 255, 255, .05),
    0 14px 34px rgba(0, 0, 0, .26);
}
.ns-root[data-material="clear"] .ns-card::after {
  background:
    radial-gradient(112% 72% at 0% 0%, rgba(255, 255, 255, .24), rgba(255, 255, 255, 0) 42%),
    radial-gradient(92% 62% at 100% 100%, rgba(255, 255, 255, .11), rgba(255, 255, 255, 0) 56%);
}
.ns-root[data-material="clear"] .ns-pill {
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 40%, transparent);
  -webkit-backdrop-filter: blur(6px) saturate(132%) brightness(1.06);
  backdrop-filter: blur(6px) saturate(132%) brightness(1.06);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l2) 55%, rgba(255, 255, 255, .72));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .44),
    0 16px 38px rgba(0, 0, 0, .3);
}
.ns-root[data-material="clear"] .ns-input,
.ns-root[data-material="clear"] .ns-ask {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 30%, transparent);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.ns-root[data-material="clear"] .ns-btn {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 34%, transparent);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.ns-root[data-material="clear"] .ns-chapter[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 38%, transparent);
}
.ns-card-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .04em;
  color: var(--dsw-alias-label-secondary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ns-big {
  font-size: 30px;
  line-height: 1.15;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.01em;
}
.ns-sub { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.ns-bar {
  margin-top: 10px;
  height: 6px;
  border-radius: 99px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 62%, transparent);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .18);
  overflow: hidden;
}
.ns-bar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--dsw-alias-brand-primary);
  transition: width .25s ease;
}
.ns-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
.ns-row + .ns-row { border-top: 1px dashed var(--dsw-alias-border-l1); }
.ns-row-key { font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.ns-row-val { font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ns-chapters { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; max-height: 40vh; overflow: auto; }
.ns-chapter {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 7px 9px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.ns-chapter:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 55%, transparent); }
.ns-chapter[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 62%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l2) 85%, rgba(255, 255, 255, .4));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .14);
}
.ns-chapter-name { font-size: 13px; font-weight: 500; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ns-chapter-meta { font-size: 11px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.ns-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 92%, rgba(255, 255, 255, .35));
  background: var(--dsw-alias-bg-layer-2);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 58%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  color: inherit;
  font: inherit;
  font-size: 13px;
  padding: 7px 12px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .16);
  transition: border-color .15s ease, background .15s ease, opacity .15s ease;
}
.ns-btn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); }
.ns-btn:disabled { opacity: .5; cursor: default; }
.ns-btn.primary {
  background: var(--dsw-alias-brand-primary);
  border-color: transparent;
  color: #fff;
}
.ns-btn.ghost { background: transparent; }
.ns-full { width: 100%; box-sizing: border-box; margin-top: 8px; }
.ns-input, .ns-num-input, .ns-ask, .ns-title-input, .ns-chapter-title, .ns-editor {
  color: inherit;
  font-family: inherit;
  background: transparent;
  outline: none;
}
.ns-input, .ns-ask {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  resize: vertical;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 52%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.ns-input:focus, .ns-ask:focus { border-color: var(--dsw-alias-brand-primary); }
.ns-num-input {
  width: 76px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.ns-head { display: flex; flex-direction: column; gap: 8px; }
.ns-title-input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  padding: 0;
  font-size: 19px;
  font-weight: 620;
  letter-spacing: -.01em;
}
.ns-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ns-goal { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.ns-editor-card { position: relative; padding: 16px 20px 12px; }
.ns-chapter-title {
  width: 100%;
  box-sizing: border-box;
  border: none;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  padding: 0 0 8px;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
}
.ns-chapter-title:focus { border-color: var(--dsw-alias-brand-primary); }
.ns-editor {
  width: 100%;
  min-height: 46vh;
  box-sizing: border-box;
  border: none;
  resize: vertical;
  padding: 10px 2px;
  font-size: 15px;
  line-height: 1.95;
  letter-spacing: .01em;
}
.ns-editor::placeholder { color: var(--dsw-alias-label-secondary); opacity: .75; }
.ns-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  border-top: 1px dashed var(--dsw-alias-border-l1);
  padding-top: 8px;
}
.ns-pill {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  max-width: calc(100% - 28px);
  padding: 6px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-overlay);
  background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 72%, transparent);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 88%, rgba(255, 255, 255, .5));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .26),
    0 14px 34px rgba(0, 0, 0, .26);
  transform: translate(-50%, 0);
}
.ns-pill-chip {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  padding: 0 6px 0 4px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ns-pill-btn {
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  padding: 5px 9px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.ns-pill-btn:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 45%, transparent); }
.ns-pill-btn.primary { background: var(--dsw-alias-brand-primary); color: #fff; }
.ns-pill-input {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12.5px;
  padding: 5px 8px;
  width: 190px;
  outline: none;
}
.ns-hint { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-bottom: 10px; line-height: 1.55; }
.ns-action {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  padding: 8px 11px;
  margin-bottom: 7px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  font-size: 13px;
  transition: background .15s ease, border-color .15s ease;
}
.ns-action:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l2);
}
.ns-action:disabled { opacity: .55; cursor: default; }
.ns-action small { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.ns-flash { margin-top: 8px; font-size: 12px; color: var(--dsw-alias-state-success-primary); }
.ns-flash[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }
.ns-quote {
  font-size: 13px;
  line-height: 1.75;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.ns-link {
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
}
`;

    /* ------------------------------------------------------------------ */
    /* Local draft storage                                                */
    /* ------------------------------------------------------------------ */

    const uid = () => Math.random().toString(36).slice(2, 10);

    const todayKey = () => {
      const d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    };

    const countChars = (text) => String(text || '').replace(/\s+/gu, '').length;

    const totalChars = (chapters) => chapters.reduce((n, c) => n + countChars(c.text), 0);

    const newDoc = () => {
      const chapter = { id: uid(), title: '', text: '', updatedAt: Date.now() };
      return {
        title: '',
        goal: 3000,
        chapters: [chapter],
        activeId: chapter.id,
        daily: { date: todayKey(), base: 0 },
      };
    };

    const normalize = (raw) => {
      const doc = raw && typeof raw === 'object' ? raw : newDoc();
      if (!Array.isArray(doc.chapters) || doc.chapters.length === 0) return newDoc();
      doc.chapters = doc.chapters
        .filter((c) => c && typeof c.text === 'string')
        .map((c, i) => ({
          id: typeof c.id === 'string' && c.id ? c.id : uid(),
          title: typeof c.title === 'string' ? c.title : '',
          text: c.text,
          updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
        }));
      if (doc.chapters.length === 0) return newDoc();
      if (typeof doc.title !== 'string') doc.title = '';
      if (typeof doc.goal !== 'number' || !isFinite(doc.goal) || doc.goal < 0) doc.goal = 3000;
      const total = totalChars(doc.chapters);
      const today = todayKey();
      if (!doc.daily || doc.daily.date !== today || typeof doc.daily.base !== 'number') {
        doc.daily = { date: today, base: total };
      } else if (doc.daily.base > total) {
        doc.daily = { date: doc.daily.date, base: total };
      }
      if (!doc.chapters.some((c) => c.id === doc.activeId)) doc.activeId = doc.chapters[0].id;
      return doc;
    };

    const loadDoc = (sessionId) => {
      try {
        const raw = window.localStorage.getItem(STORE_PREFIX + sessionId);
        if (!raw) return null;
        return normalize(JSON.parse(raw));
      } catch (error) {
        return null;
      }
    };

    const saveDoc = (sessionId, doc) => {
      try {
        window.localStorage.setItem(STORE_PREFIX + sessionId, JSON.stringify(doc));
      } catch (error) {
        /* storage full or blocked: the workspace stays usable in memory */
      }
    };

    /* ------------------------------------------------------------------ */
    /* View                                                               */
    /* ------------------------------------------------------------------ */

    function NovelStudio(props) {
      const t = props.t;
      const sessionId = props.sessionId || 'draft';
      const inputActions = props.inputActions;

      const [doc, setDoc] = useState(() => loadDoc(sessionId) || newDoc());
      const [material, setMaterial] = useState(readMaterial);
      const [sel, setSel] = useState(null);
      const [question, setQuestion] = useState('');
      const [pillAsk, setPillAsk] = useState(false);
      const [busy, setBusy] = useState(false);
      const [flash, setFlash] = useState(null);
      const [spark, setSpark] = useState(0);
      const flashTimer = useRef(null);
      const cardRef = useRef(null);
      const askRef = useRef(null);
      const pillRef = useRef(null);

      useEffect(() => {
        setDoc(loadDoc(sessionId) || newDoc());
        setSel(null);
      }, [sessionId]);

      useEffect(() => {
        const id = window.setTimeout(() => saveDoc(sessionId, doc), 400);
        return () => window.clearTimeout(id);
      }, [doc, sessionId]);

      /* A reload must never drop the last few hundred milliseconds of typing:
       * flush the in-memory draft when the page goes away. */
      const docRef = useRef(doc);
      docRef.current = doc;
      useEffect(() => {
        const flush = () => saveDoc(sessionId, docRef.current);
        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', flush);
        return () => {
          window.removeEventListener('pagehide', flush);
          window.removeEventListener('beforeunload', flush);
          flush();
        };
      }, [sessionId]);

      useEffect(() => () => {
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
      }, []);

      const say = useCallback((msg, tone) => {
        setFlash({ msg: msg, tone: tone || 'ok' });
        if (flashTimer.current) window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(null), 3600);
      }, []);

      const active = useMemo(
        () => doc.chapters.find((c) => c.id === doc.activeId) || doc.chapters[0],
        [doc],
      );
      const total = useMemo(() => totalChars(doc.chapters), [doc.chapters]);
      const base = doc.daily ? Math.min(doc.daily.base, total) : total;
      const todayCount = Math.max(0, total - base);
      const chapterCount = countChars(active ? active.text : '');

      const patchDoc = useCallback((patch) => {
        setDoc((prev) => (typeof patch === 'function' ? patch(prev) : Object.assign({}, prev, patch)));
      }, []);

      const patchActive = useCallback((patch) => {
        setDoc((prev) => ({
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === prev.activeId ? Object.assign({}, c, patch, { updatedAt: Date.now() }) : c),
        }));
      }, []);

      /* ---- draft editing ---- */

      const onText = useCallback((event) => {
        const value = event.target.value;
        setDoc((prev) => {
          const before = prev.chapters.reduce((n, c) => n + countChars(c.text), 0);
          const chapters = prev.chapters.map((c) =>
            c.id === prev.activeId ? Object.assign({}, c, { text: value, updatedAt: Date.now() }) : c);
          const after = chapters.reduce((n, c) => n + countChars(c.text), 0);
          const daily = prev.daily && prev.daily.date === todayKey()
            ? prev.daily
            : { date: todayKey(), base: before };
          return { ...prev, chapters: chapters, daily: daily };
        });
        setSel(null);
        setPillAsk(false);
      }, []);

      const onSelect = useCallback((event) => {
        const area = event.currentTarget;
        const start = area.selectionStart;
        const end = area.selectionEnd;
        if (end <= start) {
          setSel(null);
          setPillAsk(false);
          return;
        }
        const text = area.value.slice(start, end);
        if (!text.trim()) {
          setSel(null);
          setPillAsk(false);
          return;
        }
        const card = cardRef.current;
        const box = (card || area).getBoundingClientRect();
        const anchorX = event.clientX && event.clientX > 0 ? event.clientX : box.left + 160;
        const anchorY = event.clientY && event.clientY > 0 ? event.clientY : box.top + 60;
        const width = card ? card.clientWidth : box.width;
        const x = Math.min(Math.max(anchorX - box.left, 150), Math.max(150, width - 150));
        const y = Math.max(6, anchorY - box.top);
        setSel({ start: start, end: end, text: text, x: x, y: y });
      }, []);

      const clearSelection = useCallback(() => {
        setSel(null);
        setPillAsk(false);
      }, []);

      /* ---- chapters ---- */

      const addChapter = useCallback(() => {
        const chapter = { id: uid(), title: '', text: '', updatedAt: Date.now() };
        setDoc((prev) => ({
          ...prev,
          chapters: prev.chapters.concat(chapter),
          activeId: chapter.id,
        }));
        setSel(null);
      }, []);

      const removeChapter = useCallback((id) => {
        setDoc((prev) => {
          if (prev.chapters.length <= 1) return prev;
          const chapters = prev.chapters.filter((c) => c.id !== id);
          return { ...prev, chapters: chapters, activeId: prev.activeId === id ? chapters[0].id : prev.activeId };
        });
        setSel(null);
      }, []);

      /* ---- prompts and delivery ---- */

      const contextOf = useCallback((text) => ({
        work: (doc.title || '').trim() || '-',
        chapter: (active && active.title || '').trim() || '-',
        text: String(text || '').slice(0, 4000),
        question: (question || '').trim(),
      }), [doc.title, active, question]);

      const fillComposer = useCallback((text) => {
        if (inputActions && typeof inputActions.setDraft === 'function') {
          try {
            inputActions.setDraft(text);
            return true;
          } catch (error) {
            return false;
          }
        }
        return false;
      }, [inputActions]);

      const deliver = useCallback(async (text) => {
        const sessions = props.getService('sessions');
        if (!sessions || typeof sessions.using !== 'function') throw new Error('sessions service unavailable');
        await sessions.using(sessionId, { source: 'controllerOperation' }, async (reference) => {
          await reference.ready;
          const result = await reference.binding.session.prompt([{ type: 'text', text: text }], 'queue');
          if (result && result.ok === false) {
            throw new Error((result.error && (result.error.message || result.error.code)) || 'prompt rejected');
          }
        });
      }, [props.getService, sessionId]);

      const ask = useCallback(async (kind) => {
        if (busy) return;
        const selectedText = sel ? sel.text : '';
        const fallbackText = active ? active.text.slice(-1200) : '';
        const source = selectedText || fallbackText;
        if (!source.trim()) {
          say(t('ai.needText'), 'error');
          return;
        }
        if (kind === 'ask') {
          const asked = (question || '').trim();
          if (!asked) {
            if (askRef.current) askRef.current.focus();
            setPillAsk(false);
            say(t('ai.question.placeholder'), 'error');
            return;
          }
        }
        const filled = t('prompt.' + kind, contextOf(source));
        if (!filled) return;
        setBusy(true);
        try {
          await deliver(filled);
          say(t('ai.sent'));
          setQuestion('');
          setSel(null);
          setPillAsk(false);
        } catch (error) {
          if (fillComposer(filled)) {
            say(t('ai.filled'));
          } else {
            say(t('ai.failed', { msg: (error && error.message) || String(error) }), 'error');
          }
        } finally {
          setBusy(false);
        }
      }, [busy, sel, active, question, t, contextOf, deliver, fillComposer, say]);

      const exportAs = useCallback((kind) => {
        const body = doc.chapters.map((c) => {
          const title = (c.title || '').trim() || '未命名';
          return (kind === 'md' ? '## ' + title : title) + '\n\n' + c.text;
        }).join('\n\n');
        const name = ((doc.title || '').trim() || 'novel') + (kind === 'md' ? '.md' : '.txt');
        const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, [doc]);

      const openChat = useCallback(() => {
        if (typeof props.openView === 'function') props.openView('chat', '');
      }, [props.openView]);

      /* ---- pieces ---- */

      const statRow = (label, value) => h('div', { className: 'ns-row', key: label },
        h('span', { className: 'ns-row-key' }, label),
        h('span', { className: 'ns-row-val' }, value));

      const actionRow = (kind, label, sub) => h('button', {
        key: kind,
        type: 'button',
        className: 'ns-action',
        disabled: busy,
        onClick: () => ask(kind),
      }, h('span', null, label), h('small', null, sub));

      const selectionPill = sel && h('div', {
        className: 'ns-pill',
        ref: pillRef,
        style: { left: sel.x + 'px', top: Math.max(0, sel.y - 54) + 'px' },
        onMouseDown: (event) => event.preventDefault(),
      },
        h('span', { className: 'ns-pill-chip' }, t('pill.selected', { n: countChars(sel.text) })),
        pillAsk
          ? [
            h('input', {
              key: 'q',
              className: 'ns-pill-input',
              autoFocus: true,
              value: question,
              placeholder: t('pill.placeholder'),
              onChange: (event) => setQuestion(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask('ask');
                }
                if (event.key === 'Escape') {
                  setPillAsk(false);
                  clearSelection();
                }
              },
            }),
            h('button', { key: 's', type: 'button', className: 'ns-pill-btn primary', disabled: busy, onClick: () => ask('ask') }, t('pill.send')),
            h('button', { key: 'c', type: 'button', className: 'ns-pill-btn', onClick: () => { setPillAsk(false); clearSelection(); } }, t('pill.cancel')),
          ]
          : [
            h('button', { key: 'p', type: 'button', className: 'ns-pill-btn', disabled: busy, onClick: () => ask('polish') }, t('pill.polish')),
            h('button', { key: 'n', type: 'button', className: 'ns-pill-btn', disabled: busy, onClick: () => ask('continue') }, t('pill.continue')),
            h('button', { key: 'd', type: 'button', className: 'ns-pill-btn', disabled: busy, onClick: () => ask('directions') }, t('pill.directions')),
            h('button', { key: 'a', type: 'button', className: 'ns-pill-btn primary', disabled: busy, onClick: () => setPillAsk(true) }, t('pill.ask')),
          ]);

      const progress = Math.min(100, Math.round((todayCount / Math.max(1, doc.goal || 1)) * 100));

      const pickMaterial = (value) => {
        setMaterial(value);
        writeMaterial(value);
      };

      const segBtn = (value, label, hint) => h('button', {
        key: value,
        type: 'button',
        className: 'ns-seg-btn',
        'data-on': String(material === value),
        'aria-pressed': String(material === value),
        title: hint,
        onClick: () => pickMaterial(value),
      }, label);

      return h('div', { className: 'ns-root', 'data-material': material },
        h('style', { key: 'ns-style' }, CSS),
        h('div', { key: 'ns-toolbar', className: 'ns-toolbar' },
          h('span', { className: 'ns-toolbar-title' }, t('ui.workspace')),
          h('div', { className: 'ns-seg', role: 'group', 'aria-label': t('material.label') },
            segBtn('frosted', t('material.frosted'), t('material.frosted.hint')),
            segBtn('clear', t('material.clear'), t('material.clear.hint')))),
        h('div', { className: 'ns-wrap' },

          /* ---- left rail ---- */
          h('div', { className: 'ns-col ns-col-left' },
            h('div', { className: 'ns-card' },
              h('div', { className: 'ns-card-title' }, t('today.title')),
              h('div', { className: 'ns-big' }, String(todayCount)),
              h('div', { className: 'ns-sub' }, t('today.of', { g: doc.goal })),
              h('div', { className: 'ns-bar' }, h('i', { style: { width: progress + '%' } }))),
            h('div', { className: 'ns-card' },
              statRow(t('stat.total'), total + ' ' + t('unit.chars')),
              statRow(t('stat.chapters'), String(doc.chapters.length))),
            h('div', { className: 'ns-card' },
              h('div', { className: 'ns-card-title' }, t('chapters.title')),
              h('div', { className: 'ns-chapters' },
                doc.chapters.map((chapter, index) => h('div', {
                  key: chapter.id,
                  style: { display: 'flex', alignItems: 'center', gap: '2px' },
                },
                  h('button', {
                    type: 'button',
                    className: 'ns-chapter',
                    'data-active': String(chapter.id === doc.activeId),
                    onClick: () => {
                      setDoc((prev) => Object.assign({}, prev, { activeId: chapter.id }));
                      setSel(null);
                    },
                  },
                    h('span', { className: 'ns-chapter-name' },
                      (chapter.title || '').trim() || t('chapters.defaultTitle', { n: index + 1 })),
                    h('span', { className: 'ns-chapter-meta' }, t('chapters.words', { n: countChars(chapter.text) }))),
                  doc.chapters.length > 1 && h('button', {
                    type: 'button',
                    className: 'ns-link',
                    title: t('chapters.delete'),
                    onClick: () => removeChapter(chapter.id),
                    style: { padding: '0 4px', color: 'var(--dsw-alias-label-secondary)' },
                  }, '\u00d7'))),
                null),
              h('button', { type: 'button', className: 'ns-btn ns-full', onClick: addChapter }, t('chapters.new'))),
            h('div', { className: 'ns-card' },
              h('div', { className: 'ns-card-title' }, t('export.title')),
              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                h('button', { type: 'button', className: 'ns-btn', onClick: () => exportAs('txt') }, t('export.txt')),
                h('button', { type: 'button', className: 'ns-btn', onClick: () => exportAs('md') }, t('export.md'))))),

          /* ---- editor ---- */
          h('div', { className: 'ns-col ns-col-main' },
            h('div', { className: 'ns-card ns-head' },
              h('input', {
                className: 'ns-title-input',
                value: doc.title,
                placeholder: t('work.titlePlaceholder'),
                onChange: (event) => patchDoc({ title: event.target.value }),
              }),
              h('div', { className: 'ns-head-row' },
                h('label', { className: 'ns-goal' },
                  t('work.goal'),
                  h('input', {
                    className: 'ns-num-input',
                    type: 'number',
                    min: 0,
                    step: 100,
                    value: doc.goal,
                    onChange: (event) => {
                      const next = Math.max(0, Number(event.target.value) || 0);
                      patchDoc({ goal: next });
                    },
                  })),
                h('span', { className: 'ns-sub' }, t('editor.words', { n: chapterCount })))),
            h('div', { className: 'ns-card ns-editor-card', ref: cardRef },
              h('input', {
                className: 'ns-chapter-title',
                value: active ? active.title : '',
                placeholder: t('chapter.placeholder'),
                onChange: (event) => patchActive({ title: event.target.value }),
              }),
              h('textarea', {
                className: 'ns-editor',
                value: active ? active.text : '',
                placeholder: t('editor.placeholder'),
                spellCheck: false,
                onChange: onText,
                onSelect: onSelect,
                onMouseUp: onSelect,
                onKeyUp: (event) => {
                  if (event.key === 'Escape') {
                    clearSelection();
                    return;
                  }
                  onSelect(event);
                },
                onBlur: () => {
                  window.setTimeout(() => {
                    const focused = document.activeElement;
                    const inPill = pillRef.current && focused && pillRef.current.contains(focused);
                    if (!inPill && focused !== askRef.current) setPillAsk(false);
                  }, 150);
                },
              }),
              selectionPill,
              h('div', { className: 'ns-foot' },
                h('span', null, t('editor.words', { n: chapterCount })),
                h('span', null, t('editor.saved')))),

            flash && h('div', { className: 'ns-flash', 'data-tone': flash.tone }, flash.msg)),

          /* ---- AI rail ---- */
          h('div', { className: 'ns-col ns-col-right' },
            h('div', { className: 'ns-card' },
              h('div', { className: 'ns-card-title' }, t('ai.title')),
              h('div', { className: 'ns-hint' },
                sel ? t('ai.selPreview', { n: countChars(sel.text) }) : t('ai.hint')),
              actionRow('polish', t('ai.action.polish'), t('ai.action.polish.sub')),
              actionRow('continue', t('ai.action.continue'), t('ai.action.continue.sub')),
              actionRow('directions', t('ai.action.directions'), t('ai.action.directions.sub')),
              actionRow('outline', t('ai.action.outline'), t('ai.action.outline.sub')),
              actionRow('dialogue', t('ai.action.dialogue'), t('ai.action.dialogue.sub')),
              h('textarea', {
                className: 'ns-ask',
                ref: askRef,
                rows: 3,
                value: question,
                placeholder: t('ai.question.placeholder'),
                onChange: (event) => setQuestion(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    ask('ask');
                  }
                },
              }),
              h('button', {
                type: 'button',
                className: 'ns-btn primary ns-full',
                disabled: busy,
                onClick: () => ask('ask'),
              }, busy ? t('ai.busy') : t('ai.send')),
              flash && h('div', { className: 'ns-flash', 'data-tone': flash.tone }, flash.msg),
              h('button', { type: 'button', className: 'ns-btn ghost ns-full', onClick: openChat }, t('ai.openChat'))),
            h('div', { className: 'ns-card' },
              h('div', { className: 'ns-card-title' },
                t('inspire.title'),
                h('button', { type: 'button', className: 'ns-link', onClick: () => setSpark((n) => n + 1) }, t('inspire.refresh'))),
              h('div', { className: 'ns-quote' }, t(INSPIRE_KEYS[spark % INSPIRE_KEYS.length])))),
        ));
    }

    /* ------------------------------------------------------------------ */
    /* Plugin                                                             */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots'],

      apply(ctx) {
        const locale = ctx.get('locale');

        /* The active locale decides the wording, so read it instead of trusting a
         * single registered dictionary to be the one being served. */
        const isChinese = () => {
          try {
            const snapshot = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null;
            const active = snapshot && snapshot.active ? String(snapshot.active) : '';
            if (active) return /^zh/i.test(active);
          } catch (error) {
            /* fall through to the Chinese default */
          }
          return true;
        };

        const translate = (key, vars) => {
          const entry = STRINGS[key];
          let value = entry ? (isChinese() ? entry.zh : entry.en) : key;
          if (vars) {
            for (const name of Object.keys(vars)) {
              value = value.split('{' + name + '}').join(String(vars[name]));
            }
          }
          return value;
        };

        if (locale && typeof locale.register === 'function') {
          ctx.effect(() => {
            const zh = {};
            const en = {};
            for (const key of Object.keys(STRINGS)) {
              zh[key] = STRINGS[key].zh;
              en[key] = STRINGS[key].en;
            }
            const disposers = [];
            for (const id of ['zh-CN', 'zh', 'en', 'en-US']) {
              try {
                disposers.push(locale.register(NS, id, id.indexOf('zh') === 0 ? zh : en));
              } catch (error) {
                /* an id already owned by another dictionary: keep the rest */
              }
            }
            return () => {
              for (const off of disposers) {
                if (typeof off === 'function') off();
              }
            };
          }, 'novel-studio: locale');
        }

        const BoundView = (props) => h(NovelStudio, Object.assign({}, props, {
          t: translate,
          getService: (name) => ctx.get(name),
        }));

        ctx.effect(() => ctx.slots.inject('conversation.view', () => ctx.slots.register({
          name: 'conversation.view',
          id: 'novel-studio',
          order: 5,
          label: () => translate('view.label'),
        }, BoundView)), 'novel-studio: view');
      },
    };
  },
});

// ==UserScript==
// @name         Critical Thinking Intervention - AI Prompt Helper
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Encourages critical thinking before sending prompts to ChatGPT, Claude, Gemini, and Copilot by generating personalized reflection questions
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// @match        *://claude.ai/*
// @match        *://gemini.google.com/*
// @match        *://copilot.microsoft.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      cti-proxy.hall-justinanthony.workers.dev
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @author       Justin, Jenny, Jeongyeon, Alex
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";
  
    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION — RESEARCHERS: EDIT THIS SECTION
    // ═══════════════════════════════════════════════════════════════
  
    const CONFIG = {
      PROXY_URL: "https://cti-proxy.hall-justinanthony.workers.dev",
      PROXY_SECRET: "",
      GOOGLE_SHEET_WEBHOOK: "https://script.google.com/macros/s/AKfycbzCXW7vQw-YGLHjzZMLP1_m1GSC8YdJV91jufepPri12zrkvKaQBCRcu-ghjgshovzu3Q/exec",
      MODEL: "gpt-4o-mini",
      MAX_LOOPS: 2,
      NUM_QUESTIONS: 2,
      APPEND_PLANNING_TO_PROMPT: true,
      LOG_DATA: true,
    };
  
    // ═══════════════════════════════════════════════════════════════
    // MULTI-PLATFORM SELECTORS
    // ═══════════════════════════════════════════════════════════════
  
    const PLATFORMS = {
      chatgpt: {
        name: "ChatGPT",
        hostMatch: (h) => h.includes("chatgpt.com") || h.includes("chat.openai.com"),
        inputSelectors: [
          '#prompt-textarea',
          'div[contenteditable="true"][data-id]',
          'div[contenteditable="true"]',
          'textarea',
        ],
        sendSelectors: [
          '[data-testid="send-button"]',
          'button[aria-label="Send prompt"]',
          'button[aria-label="Send"]',
        ],
        newConvoCheck: () => {
          const url = window.location.href;
          if (url.match(/^https:\/\/(chatgpt\.com|chat\.openai\.com)\/?$/)) return true;
          return document.querySelectorAll('[data-message-author-role]').length === 0;
        },
      },
      claude: {
        name: "Claude",
        hostMatch: (h) => h.includes("claude.ai"),
        inputSelectors: [
          '.ProseMirror[contenteditable="true"]',
          'div[data-placeholder][contenteditable="true"]',
          'div[contenteditable="true"]',
          'fieldset div[contenteditable="true"]',
        ],
        sendSelectors: [
          'button[data-testid="send-button"]',
          'button[aria-label*="Send" i]',
          'button[aria-label*="Send message" i]',
        ],
        newConvoCheck: () => {
          const url = window.location.href;
          if (url.match(/^https:\/\/claude\.ai\/(new)?\/?$/)) return true;
          const messages = document.querySelectorAll('[data-is-streaming], .font-claude-message, div[class*="Message"]');
          return messages.length === 0;
        },
      },
      gemini: {
        name: "Gemini",
        hostMatch: (h) => h.includes("gemini.google.com"),
        inputSelectors: [
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"][aria-label*="prompt"]',
          'rich-textarea [contenteditable="true"]',
          'div[contenteditable="true"]',
        ],
        sendSelectors: [
          'button[aria-label*="Send"]',
          'button.send-button',
          'button[mattooltip*="Send"]',
          'button[data-action-type="send"]',
        ],
        newConvoCheck: () => {
          const url = window.location.href;
          if (url.match(/^https:\/\/gemini\.google\.com\/(app)?\/?$/)) return true;
          const turns = document.querySelectorAll('message-content, .conversation-container .turn-content, model-response');
          return turns.length === 0;
        },
      },
      copilot: {
        name: "Copilot",
        hostMatch: (h) => h.includes("copilot.microsoft.com"),
        inputSelectors: [
          '#userInput',
          'textarea[id="userInput"]',
          'textarea[placeholder*="message"]',
          'textarea[aria-label*="message" i]',
          'div[contenteditable="true"]',
          'textarea',
        ],
        sendSelectors: [
          'button[aria-label*="Send" i]',
          'button[aria-label*="Submit" i]',
          'button[title*="Send" i]',
          'button[data-testid="send-button"]',
        ],
        newConvoCheck: () => {
          const url = window.location.href;
          if (url.match(/^https:\/\/copilot\.microsoft\.com\/?$/)) return true;
          const messages = document.querySelectorAll('[data-content="ai-message"], .response-message, cib-message-group');
          return messages.length === 0;
        },
      },
    };
  
    // ═══════════════════════════════════════════════════════════════
    // PLATFORM DETECTION
    // ═══════════════════════════════════════════════════════════════
  
    function detectPlatform() {
      const host = window.location.hostname;
      for (const [key, platform] of Object.entries(PLATFORMS)) {
        if (platform.hostMatch(host)) {
          return { key, ...platform };
        }
      }
      return null;
    }
  
    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════
  
    let state = {
      isFirstMessage: true,
      interceptActive: false,
      currentPrompt: "",
      reflectionLoop: 0,
      sessionLog: [],
      participantId: "",
      consentGiven: false,
      initialized: false,
      platform: null,
    };
  
    // ═══════════════════════════════════════════════════════════════
    // STYLES — JACE BRAND THEME
    // ═══════════════════════════════════════════════════════════════
  
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Sans:wght@400;500;600;700&display=swap');
  
      /* ── JACE Design Tokens ── */
      :root {
        --jace-green-light: #a1cf9a;
        --jace-green-mid:   #20a565;
        --jace-blue-mid:    #2e7dab;
        --jace-blue-light:  #4bb0d0;
        --jace-bg:          #1a1a1a;
        --jace-surface:     #272727;
        --jace-surface-2:   #303030;
        --jace-border:      rgba(255,255,255,0.08);
        --jace-text:        #f0f0f0;
        --jace-text-muted:  #9a9a9a;
        --jace-text-dim:    #5e5e5e;
        --jace-radius:      18px;
        --jace-radius-sm:   10px;
        --jace-radius-pill: 100px;
      }
  
      /* ── Modal Overlay ── */
      #cti-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: 'DM Sans', system-ui, sans-serif;
      }
      #cti-overlay.visible { opacity: 1; }
  
      /* ── Modal Container ── */
      #cti-modal {
        background: var(--jace-surface);
        border: 1px solid var(--jace-border);
        border-radius: var(--jace-radius);
        width: 90%;
        max-width: 600px;
        max-height: 88vh;
        overflow-y: auto;
        padding: 36px 32px 28px;
        box-shadow:
          0 32px 80px rgba(0,0,0,0.6),
          0 0 0 1px rgba(255,255,255,0.05),
          inset 0 1px 0 rgba(255,255,255,0.06);
        transform: translateY(18px) scale(0.97);
        transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
        color: var(--jace-text);
        scrollbar-width: thin;
        scrollbar-color: var(--jace-surface-2) transparent;
      }
      #cti-overlay.visible #cti-modal {
        transform: translateY(0) scale(1);
      }
  
      /* ── Wordmark / Logo area ── */
      #cti-modal .cti-wordmark {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
        margin-bottom: 22px;
      }
      #cti-modal .cti-wordmark-icon {
        width: 32px;
        height: 32px;
        background: var(--jace-green-mid);
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      #cti-modal .cti-wordmark-text {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--jace-text);
        text-transform: uppercase;
      }
  
      /* ── Header ── */
      #cti-modal .cti-header { text-align: center; margin-bottom: 20px; }
      #cti-modal .cti-title {
        font-family: 'Instrument Sans', sans-serif;
        font-size: 22px;
        font-weight: 700;
        color: var(--jace-text);
        margin: 0 0 6px;
        letter-spacing: -0.01em;
      }
      #cti-modal .cti-subtitle {
        font-size: 14px;
        color: var(--jace-text-muted);
        margin: 0;
        line-height: 1.55;
      }
      #cti-modal .cti-platform-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(75, 176, 208, 0.12);
        color: var(--jace-blue-light);
        border: 1px solid rgba(75, 176, 208, 0.22);
        font-size: 11px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: var(--jace-radius-pill);
        margin-top: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      #cti-modal .cti-platform-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--jace-blue-light);
        display: inline-block;
      }
  
      /* ── Divider ── */
      #cti-modal .cti-divider {
        border: none;
        border-top: 1px solid var(--jace-border);
        margin: 20px 0;
      }
  
      /* ── Prompt Preview ── */
      #cti-prompt-preview {
        background: var(--jace-surface-2);
        border: 1px solid var(--jace-border);
        border-radius: var(--jace-radius-sm);
        padding: 14px 16px;
        margin-bottom: 20px;
        font-size: 13px;
        color: var(--jace-text-muted);
        line-height: 1.6;
        max-height: 80px;
        overflow-y: auto;
      }
      #cti-prompt-preview .cti-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--jace-text-dim);
        margin-bottom: 5px;
        display: block;
      }
  
      /* ── Questions ── */
      .cti-question-block { margin-bottom: 18px; }
      .cti-question-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--jace-text);
        margin-bottom: 8px;
        line-height: 1.45;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .cti-question-number {
        background: linear-gradient(135deg, var(--jace-green-mid), var(--jace-blue-mid));
        color: white;
        font-size: 11px;
        font-weight: 700;
        min-width: 22px;
        height: 22px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 1px;
        flex-shrink: 0;
      }
      .cti-answer-input {
        width: 100%;
        background: var(--jace-surface-2);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: var(--jace-radius-sm);
        padding: 12px 14px;
        color: var(--jace-text);
        font-size: 13.5px;
        line-height: 1.55;
        resize: vertical;
        min-height: 68px;
        font-family: 'DM Sans', sans-serif;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .cti-answer-input:focus {
        outline: none;
        border-color: var(--jace-blue-mid);
        box-shadow: 0 0 0 3px rgba(46, 125, 171, 0.18);
      }
      .cti-answer-input::placeholder { color: var(--jace-text-dim); }
  
      /* ── Feedback ── */
      #cti-feedback {
        background: rgba(32, 165, 101, 0.08);
        border: 1px solid rgba(32, 165, 101, 0.22);
        border-left: 3px solid var(--jace-green-mid);
        border-radius: var(--jace-radius-sm);
        padding: 13px 16px;
        margin-bottom: 18px;
        font-size: 13.5px;
        color: var(--jace-green-light);
        line-height: 1.55;
        display: none;
      }
      #cti-feedback.visible { display: block; }
  
      /* ── Buttons ── */
      .cti-button-row {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 22px;
        align-items: center;
      }
      .cti-btn {
        padding: 11px 24px;
        border-radius: var(--jace-radius-pill);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: 0.01em;
      }
      .cti-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  
      /* Primary — green (Approved style) */
      .cti-btn-primary {
        background: var(--jace-green-mid);
        color: white;
        box-shadow: 0 2px 12px rgba(32, 165, 101, 0.3);
      }
      .cti-btn-primary:hover:not(:disabled) {
        background: #23b871;
        transform: translateY(-1px);
        box-shadow: 0 4px 18px rgba(32, 165, 101, 0.4);
      }
      .cti-btn-primary:active:not(:disabled) {
        transform: translateY(0);
      }
  
      /* Secondary — blue (Submit style) */
      .cti-btn-secondary {
        background: var(--jace-blue-mid);
        color: white;
        box-shadow: 0 2px 12px rgba(46, 125, 171, 0.25);
      }
      .cti-btn-secondary:hover:not(:disabled) {
        background: #3490c0;
        transform: translateY(-1px);
      }
  
      /* Skip — white ghost (Skip style) */
      .cti-btn-skip {
        background: rgba(255,255,255,0.07);
        color: var(--jace-text-muted);
        font-size: 13px;
        padding: 11px 18px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .cti-btn-skip:hover { background: rgba(255,255,255,0.11); color: var(--jace-text); }
  
      /* ── Loading ── */
      .cti-loading { text-align: center; padding: 40px 20px; }
      .cti-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(32, 165, 101, 0.2);
        border-top-color: var(--jace-green-mid);
        border-radius: 50%;
        animation: cti-spin 0.75s linear infinite;
        margin: 0 auto 14px;
      }
      @keyframes cti-spin { to { transform: rotate(360deg); } }
      .cti-loading-text { color: var(--jace-text-muted); font-size: 14px; }
  
      /* ── Progress ── */
      .cti-progress {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
        margin-bottom: 18px;
      }
      .cti-progress-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        transition: background 0.3s;
      }
      .cti-progress-dot.active  { background: var(--jace-green-mid); }
      .cti-progress-dot.complete { background: var(--jace-blue-light); }
      .cti-progress-label {
        font-size: 11px;
        color: var(--jace-text-dim);
        margin-left: 6px;
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
  
      /* ── Consent / Setup Modal ── */
      #cti-modal.cti-setup input[type="text"] {
        width: 100%;
        background: var(--jace-surface-2);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: var(--jace-radius-sm);
        padding: 12px 14px;
        color: var(--jace-text);
        font-size: 13.5px;
        font-family: 'DM Sans', sans-serif;
        margin-bottom: 12px;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      #cti-modal.cti-setup input[type="text"]:focus {
        outline: none;
        border-color: var(--jace-green-mid);
        box-shadow: 0 0 0 3px rgba(32, 165, 101, 0.15);
      }
      #cti-modal.cti-setup label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: var(--jace-text-dim);
        text-align: left;
        margin-bottom: 6px;
        margin-top: 14px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
  
      /* ── Consent box ── */
      .cti-consent-box {
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--jace-border);
        border-radius: var(--jace-radius-sm);
        padding: 16px;
        margin: 16px 0;
        font-size: 13px;
        color: var(--jace-text-muted);
        line-height: 1.65;
        max-height: 200px;
        overflow-y: auto;
        text-align: left;
      }
      .cti-consent-box strong { color: var(--jace-text); }
      .cti-consent-box ul { margin: 8px 0; padding-left: 18px; }
      .cti-consent-box li { margin-bottom: 4px; }
  
      .cti-consent-checkbox {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 16px 0;
        text-align: left;
      }
      .cti-consent-checkbox input[type="checkbox"] {
        margin-top: 3px;
        accent-color: var(--jace-green-mid);
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .cti-consent-checkbox span { font-size: 13px; color: var(--jace-text-muted); line-height: 1.5; }
  
      /* ── Icon circles (like Icons section in style tile) ── */
      .cti-icon-circle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        margin: 0 auto 12px;
      }
      .cti-icon-circle.green { background: var(--jace-green-mid); }
      .cti-icon-circle.blue  { background: var(--jace-blue-mid); }
      .cti-icon-circle.teal  { background: var(--jace-blue-light); }
    `);
  
    // ═══════════════════════════════════════════════════════════════
    // PROXY API HELPER
    // ═══════════════════════════════════════════════════════════════
  
    function callOpenAI(systemPrompt, userMessage, jsonMode = true) {
      return new Promise((resolve, reject) => {
        const body = {
          model: CONFIG.MODEL,
          max_tokens: 1024,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        };
  
        if (jsonMode) {
          body.response_format = { type: "json_object" };
        }
  
        const headers = { "Content-Type": "application/json" };
        if (CONFIG.PROXY_SECRET) {
          headers["X-CTI-Secret"] = CONFIG.PROXY_SECRET;
        }
  
        GM_xmlhttpRequest({
          method: "POST",
          url: CONFIG.PROXY_URL,
          headers: headers,
          data: JSON.stringify(body),
          onload: function (response) {
            try {
              const data = JSON.parse(response.responseText);
              if (data.error) {
                reject(new Error(data.error.message || data.error || "Proxy API error"));
                return;
              }
              const text = data.choices?.[0]?.message?.content || "";
              if (!text) {
                reject(new Error("Empty response from API"));
                return;
              }
              resolve(text);
            } catch (e) {
              reject(e);
            }
          },
          onerror: function (err) {
            reject(new Error("Network error calling proxy. Is the worker deployed?"));
          },
        });
      });
    }
  
    // ═══════════════════════════════════════════════════════════════
    // QUESTION GENERATION
    // ═══════════════════════════════════════════════════════════════
  
    async function generateQuestions(prompt) {
      const platformName = state.platform?.name || "an AI chatbot";
      const systemPrompt = `You are a metacognitive coach helping students think critically before using ${platformName}. Your job is to generate ${CONFIG.NUM_QUESTIONS} personalized reflection questions based on the user's prompt.
  
  Your goals:
  - Help the user clarify what they actually need
  - Encourage them to think about what they already know
  - Push them to form a plan or approach before relying on the AI
  - Make questions feel relevant and useful, not patronizing
  
  Rules:
  - Generate exactly ${CONFIG.NUM_QUESTIONS} questions
  - Make questions specific to the prompt content, not generic
  - Questions should be answerable in 1-3 sentences each
  - Frame questions positively — as tools to improve their outcome, not gatekeeping
  - Vary question types: some about understanding, some about planning, some about self-assessment
  
  You MUST respond with a JSON object containing a "questions" array. Each item has "question" and "placeholder" keys. Example:
  {"questions": [
    {"question": "What specific aspect of X are you trying to understand?", "placeholder": "e.g., I want to understand how..."},
    {"question": "What do you already know about Y?", "placeholder": "e.g., I know that..."}
  ]}`;
  
      const raw = await callOpenAI(systemPrompt, `Student's prompt:\n"${prompt}"`);
      const parsed = JSON.parse(raw);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
      throw new Error("Failed to parse questions from API");
    }
  
    // ═══════════════════════════════════════════════════════════════
    // RESPONSE EVALUATION
    // ═══════════════════════════════════════════════════════════════
  
    async function evaluateResponses(prompt, questions, answers) {
      const systemPrompt = `You are evaluating whether a student has engaged in sufficient critical thinking before using an AI chatbot. You are NOT grading them — you are coaching them.
  
  You will receive:
  1. The student's original prompt
  2. The reflection questions they were asked
  3. Their answers
  
  Evaluate whether the student has:
  - Shown genuine engagement (not just filler answers)
  - Demonstrated some understanding or honest self-assessment
  - Formed at least a rough plan or identified what they need
  
  Be generous — a thoughtful 1-2 sentence answer is fine. Only flag responses that are clearly minimal-effort (e.g., "idk", "yes", single words, or copy-pasting the question).
  
  You MUST respond with a JSON object with these exact keys:
  {
    "sufficient": true or false,
    "feedback": "Brief encouraging feedback or gentle nudge to think deeper (2-3 sentences max)",
    "strengthened_prompt_addition": "If sufficient, a 1-2 sentence summary of their planning that can be appended to improve their prompt. If not sufficient, empty string."
  }`;
  
      const qaBlock = questions
        .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer)"}`)
        .join("\n\n");
  
      const userMsg = `Original prompt:\n"${prompt}"\n\nReflection Q&A:\n${qaBlock}`;
      const raw = await callOpenAI(systemPrompt, userMsg);
      return JSON.parse(raw);
    }
  
    // ═══════════════════════════════════════════════════════════════
    // DOM INTERACTION — MULTI-PLATFORM
    // ═══════════════════════════════════════════════════════════════
  
    function getPromptTextarea() {
      const platform = state.platform;
      if (!platform) return null;
  
      for (const sel of platform.inputSelectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
    }
  
    function getPromptText() {
      const el = getPromptTextarea();
      if (!el) return "";
      if (el.contentEditable === "true" || el.getAttribute("contenteditable") === "true") {
        const text = el.innerText?.trim() || el.textContent?.trim() || "";
        if (text === el.getAttribute("data-placeholder")) return "";
        return text;
      }
      return (el.value || "").trim();
    }
  
    function setPromptText(text) {
      const el = getPromptTextarea();
      if (!el) return;
  
      el.focus();
  
      if (el.contentEditable === "true" || el.getAttribute("contenteditable") === "true") {
        el.innerHTML = "";
        document.execCommand("insertText", false, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(el, text);
        } else {
          el.value = text;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  
    function clickSendButton() {
      const platform = state.platform;
      if (!platform) return;
  
      for (const sel of platform.sendSelectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.disabled) {
          btn.click();
          return;
        }
      }
  
      const inputEl = getPromptTextarea();
      if (inputEl) {
        let container = inputEl.parentElement;
        for (let i = 0; i < 8 && container; i++) {
          const buttons = container.querySelectorAll("button");
          for (const btn of buttons) {
            if (btn.disabled || btn.offsetParent === null) continue;
            const label = (btn.getAttribute("aria-label") || "").toLowerCase();
            if (label.includes("send") || label.includes("submit")) {
              btn.click();
              return;
            }
          }
          container = container.parentElement;
        }
      }
  
      if (inputEl) {
        inputEl.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter", code: "Enter", keyCode: 13, bubbles: true,
          })
        );
      }
    }
  
    function isNewConversation() {
      const platform = state.platform;
      if (!platform) return false;
      try {
        return platform.newConvoCheck();
      } catch {
        return true;
      }
    }
  
    function isInsideInput(el) {
      if (!el || !state.platform) return false;
      for (const sel of state.platform.inputSelectors) {
        if (el.matches?.(sel) || el.closest?.(sel)) return true;
      }
      return false;
    }
  
    function isSendButton(el) {
      if (!el || !state.platform) return false;
      for (const sel of state.platform.sendSelectors) {
        if (el.matches?.(sel) || el.closest?.(sel)) return true;
      }
      return false;
    }
  
    function isSendAction(e) {
      const platform = state.platform;
      if (!platform) return false;
  
      if (e.type === "keydown" && e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (isInsideInput(e.target) || isInsideInput(document.activeElement)) {
          return true;
        }
      }
  
      if (e.type === "click" || e.type === "pointerdown" || e.type === "mousedown") {
        if (isSendButton(e.target)) return true;
      }
  
      return false;
    }
  
    // ═══════════════════════════════════════════════════════════════
    // UI CREATION
    // ═══════════════════════════════════════════════════════════════
  
    function createOverlay() {
      const existing = document.getElementById("cti-overlay");
      if (existing) existing.remove();
  
      const overlay = document.createElement("div");
      overlay.id = "cti-overlay";
      overlay.innerHTML = `<div id="cti-modal"></div>`;
      document.body.appendChild(overlay);
  
      requestAnimationFrame(() => overlay.classList.add("visible"));
      return overlay;
    }
  
    /* JACE wordmark HTML — reused across screens */
    function wordmarkHTML() {
      return `
        <div class="cti-wordmark">
          <div class="cti-wordmark-icon">🧠</div>
          <span class="cti-wordmark-text">JACE</span>
        </div>
      `;
    }
  
    function showConsentModal() {
      const overlay = createOverlay();
      const modal = document.getElementById("cti-modal");
      modal.classList.add("cti-setup");
      const platformName = state.platform?.name || "AI Chatbot";
      modal.innerHTML = `
        ${wordmarkHTML()}
        <div class="cti-header">
          <h2 class="cti-title">Welcome to the Thinking Helper</h2>
          <p class="cti-subtitle">This tool helps you think more deeply before using AI — leading to better answers and stronger learning.</p>
          <div class="cti-platform-badge">Active on ${platformName}</div>
        </div>
  
        <hr class="cti-divider" />
  
        <div class="cti-consent-box">
          <strong>📋 What this tool does & what data is collected:</strong>
          <ul>
            <li>When you send your <strong>first message</strong> in a new conversation, this tool will pause and ask you a few reflection questions before the message is sent.</li>
            <li>It only activates once per conversation — after that, the AI works normally.</li>
            <li>Works across <strong>ChatGPT, Claude, Gemini, and Copilot</strong>.</li>
          </ul>
          <strong>The following data is collected and shared with the research team:</strong>
          <ul>
            <li>Your <strong>original prompt</strong> (the first message you type)</li>
            <li>The <strong>reflection questions</strong> generated for you</li>
            <li>Your <strong>answers</strong> to those questions</li>
            <li>Whether you <strong>skipped</strong> the reflection</li>
            <li>The <strong>feedback</strong> the tool gave you</li>
            <li><strong>Timestamps</strong>, <strong>platform name</strong>, and your <strong>participant ID</strong></li>
          </ul>
          <strong>What is NOT collected:</strong>
          <ul>
            <li>Your conversation history beyond the first prompt</li>
            <li>Your account information on any platform</li>
            <li>Any browsing data outside of this tool</li>
          </ul>
          Data is used solely for this research study and will be handled in accordance with your study's data policies.
        </div>
  
        <div class="cti-consent-checkbox">
          <input type="checkbox" id="cti-consent-check" />
          <span>I understand what data is collected and consent to participating in this study.</span>
        </div>
  
        <label>Your Participant ID (provided by your researcher)</label>
        <input type="text" id="cti-participant-id" placeholder="e.g., P001" value="" />
  
        <div class="cti-button-row" style="justify-content: center;">
          <button class="cti-btn cti-btn-primary" id="cti-consent-save" disabled>I Agree — Get Started</button>
        </div>
      `;
  
      const checkbox = document.getElementById("cti-consent-check");
      const saveBtn = document.getElementById("cti-consent-save");
  
      checkbox.addEventListener("change", () => { saveBtn.disabled = !checkbox.checked; });
  
      saveBtn.addEventListener("click", () => {
        if (!checkbox.checked) return;
        const pid = document.getElementById("cti-participant-id").value.trim();
        if (!pid) { alert("Please enter your Participant ID to continue."); return; }
  
        state.participantId = pid;
        state.consentGiven = true;
        GM_setValue("cti_participant_id", pid);
        GM_setValue("cti_consent_given", true);
        GM_setValue("cti_consent_timestamp", new Date().toISOString());
  
        logEvent("consent_given", { participantId: pid });
  
        overlay.classList.remove("visible");
        setTimeout(() => overlay.remove(), 300);
      });
    }
  
    function showLoading(modal) {
      const platformName = state.platform?.name || "AI";
      modal.innerHTML = `
        ${wordmarkHTML()}
        <div class="cti-header">
          <h2 class="cti-title">Let's Think This Through</h2>
          <p class="cti-subtitle">Generating personalized reflection questions to help you get the best results...</p>
          <div class="cti-platform-badge">${platformName}</div>
        </div>
        <div class="cti-loading">
          <div class="cti-spinner"></div>
          <div class="cti-loading-text">Analyzing your prompt...</div>
        </div>
      `;
    }
  
    function showQuestions(modal, prompt, questions, feedback = null) {
      const loopNum = state.reflectionLoop + 1;
      const progressDots = Array.from({ length: CONFIG.MAX_LOOPS }, (_, i) => {
        if (i < state.reflectionLoop) return `<div class="cti-progress-dot complete"></div>`;
        if (i === state.reflectionLoop) return `<div class="cti-progress-dot active"></div>`;
        return `<div class="cti-progress-dot"></div>`;
      }).join("");
  
      const feedbackHTML = feedback
        ? `<div id="cti-feedback" class="visible">${escapeHtml(feedback)}</div>`
        : `<div id="cti-feedback"></div>`;
  
      const questionsHTML = questions.map((q, i) => `
        <div class="cti-question-block">
          <div class="cti-question-label">
            <span class="cti-question-number">${i + 1}</span>
            <span>${escapeHtml(q.question)}</span>
          </div>
          <textarea class="cti-answer-input" data-index="${i}" placeholder="${escapeHtml(q.placeholder || "Type your thoughts here...")}" rows="2"></textarea>
        </div>
      `).join("");
  
      modal.innerHTML = `
        ${wordmarkHTML()}
        <div class="cti-header">
          <h2 class="cti-title">Before You Send...</h2>
          <p class="cti-subtitle">Taking a moment to plan will help you get a much better response.</p>
        </div>
        <div class="cti-progress">
          ${progressDots}
          <span class="cti-progress-label">Round ${loopNum} of ${CONFIG.MAX_LOOPS}</span>
        </div>
        <div id="cti-prompt-preview">
          <span class="cti-label">Your prompt</span>
          ${escapeHtml(prompt)}
        </div>
        ${feedbackHTML}
        <div id="cti-questions-container">
          ${questionsHTML}
        </div>
        <div class="cti-button-row">
          <button class="cti-btn cti-btn-skip" id="cti-skip">Skip &amp; Send Original</button>
          <button class="cti-btn cti-btn-primary" id="cti-submit-reflection">Submit Reflection</button>
        </div>
      `;
  
      document.getElementById("cti-submit-reflection")
        .addEventListener("click", () => handleReflectionSubmit(modal, prompt, questions));
      document.getElementById("cti-skip").addEventListener("click", () => {
        logEvent("skipped", { loop: state.reflectionLoop, prompt });
        closeModalAndSend(prompt, null);
      });
    }
  
    function showEvaluating(modal) {
      const container = document.getElementById("cti-questions-container");
      if (container) {
        container.innerHTML = `
          <div class="cti-loading">
            <div class="cti-spinner"></div>
            <div class="cti-loading-text">Reviewing your reflections...</div>
          </div>
        `;
      }
      modal.querySelectorAll(".cti-btn").forEach((b) => (b.disabled = true));
    }
  
    // ═══════════════════════════════════════════════════════════════
    // INTERACTION HANDLERS
    // ═══════════════════════════════════════════════════════════════
  
    async function handleReflectionSubmit(modal, prompt, questions) {
      const inputs = modal.querySelectorAll(".cti-answer-input");
      const answers = Array.from(inputs).map((el) => el.value.trim());
  
      if (answers.every((a) => a.length === 0)) {
        document.getElementById("cti-feedback").textContent =
          "Please try answering at least one question — even a short response helps!";
        document.getElementById("cti-feedback").classList.add("visible");
        return;
      }
  
      logEvent("reflection_submitted", {
        loop: state.reflectionLoop, prompt,
        questions: questions.map((q) => q.question), answers,
      });
  
      showEvaluating(modal);
  
      try {
        const evaluation = await evaluateResponses(prompt, questions, answers);
  
        if (evaluation.sufficient || state.reflectionLoop >= CONFIG.MAX_LOOPS - 1) {
          logEvent("reflection_approved", {
            loop: state.reflectionLoop,
            feedback: evaluation.feedback,
            sufficient: evaluation.sufficient,
          });
  
          let enhancedPrompt = prompt;
          if (CONFIG.APPEND_PLANNING_TO_PROMPT && evaluation.strengthened_prompt_addition) {
            enhancedPrompt = `${prompt}\n\n[Context from my planning: ${evaluation.strengthened_prompt_addition}]`;
          }
  
          closeModalAndSend(enhancedPrompt, evaluation.feedback);
        } else {
          state.reflectionLoop++;
          logEvent("reflection_insufficient", {
            loop: state.reflectionLoop, feedback: evaluation.feedback,
          });
          showQuestions(modal, prompt, questions, evaluation.feedback);
        }
      } catch (err) {
        console.error("CTI evaluation error:", err);
        closeModalAndSend(prompt, null);
      }
    }
  
    function closeModalAndSend(promptText, feedback) {
      const overlay = document.getElementById("cti-overlay");
      if (overlay) {
        overlay.classList.remove("visible");
        setTimeout(() => overlay.remove(), 300);
      }
  
      state.interceptActive = false;
      state.isFirstMessage = false;
  
      setTimeout(() => {
        setPromptText(promptText);
        setTimeout(() => clickSendButton(), 300);
      }, 400);
    }
  
    // ═══════════════════════════════════════════════════════════════
    // INTERCEPT LOGIC
    // ═══════════════════════════════════════════════════════════════
  
    function interceptSubmission(e) {
      if (!state.isFirstMessage || state.interceptActive) return;
      if (!state.consentGiven) return;
      if (!state.platform) return;
  
      if (!isSendAction(e)) return;
  
      const promptText = getPromptText();
      console.log("[CTI] Send action detected!", e.type, "prompt length:", promptText.length);
  
      if (!promptText || promptText.length < 5) return;
  
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
  
      if (e.type === "pointerdown" || e.type === "mousedown") {
        const blockClick = (ce) => {
          ce.preventDefault();
          ce.stopPropagation();
          ce.stopImmediatePropagation();
          document.removeEventListener("click", blockClick, true);
        };
        document.addEventListener("click", blockClick, true);
        setTimeout(() => document.removeEventListener("click", blockClick, true), 500);
      }
  
      state.interceptActive = true;
      state.currentPrompt = promptText;
      state.reflectionLoop = 0;
  
      logEvent("prompt_intercepted", { prompt: promptText });
  
      const overlay = createOverlay();
      const modal = overlay.querySelector("#cti-modal");
      showLoading(modal);
  
      generateQuestions(promptText)
        .then((questions) => {
          logEvent("questions_generated", { questions: questions.map((q) => q.question) });
          showQuestions(modal, promptText, questions);
        })
        .catch((err) => {
          console.error("CTI question generation error:", err);
          modal.innerHTML = `
            ${wordmarkHTML()}
            <div class="cti-header">
              <div class="cti-icon-circle teal" style="margin:0 auto 12px;">⚠️</div>
              <h2 class="cti-title">Something went wrong</h2>
              <p class="cti-subtitle">Couldn't generate questions: ${escapeHtml(err.message)}. Sending your prompt as-is.</p>
            </div>
            <div class="cti-button-row" style="justify-content: center;">
              <button class="cti-btn cti-btn-primary" id="cti-error-close">Continue</button>
            </div>
          `;
          document.getElementById("cti-error-close")
            .addEventListener("click", () => closeModalAndSend(promptText, null));
        });
    }
  
    // ═══════════════════════════════════════════════════════════════
    // DATA LOGGING
    // ═══════════════════════════════════════════════════════════════
  
    function logEvent(eventType, data) {
      if (!CONFIG.LOG_DATA) return;
  
      const entry = {
        timestamp: new Date().toISOString(),
        participantId: state.participantId,
        platform: state.platform?.name || "unknown",
        eventType,
        conversationUrl: window.location.href,
        ...data,
      };
  
      state.sessionLog.push(entry);
      const allLogs = GM_getValue("cti_logs", []);
      allLogs.push(entry);
      GM_setValue("cti_logs", allLogs);
  
      console.log("[CTI Log]", entry);
  
      if (CONFIG.GOOGLE_SHEET_WEBHOOK && CONFIG.GOOGLE_SHEET_WEBHOOK !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        sendToGoogleSheet(entry);
      }
    }
  
    function sendToGoogleSheet(entry) {
      const flat = {
        timestamp: entry.timestamp,
        participantId: entry.participantId,
        platform: entry.platform || "",
        eventType: entry.eventType,
        conversationUrl: entry.conversationUrl || "",
        prompt: entry.prompt || "",
        questions: Array.isArray(entry.questions) ? entry.questions.join(" | ") : (entry.questions || ""),
        answers: Array.isArray(entry.answers) ? entry.answers.join(" | ") : (entry.answers || ""),
        feedback: entry.feedback || "",
        loop: entry.loop !== undefined ? entry.loop : "",
        sufficient: entry.sufficient !== undefined ? entry.sufficient : "",
      };
  
      GM_xmlhttpRequest({
        method: "POST",
        url: CONFIG.GOOGLE_SHEET_WEBHOOK,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify(flat),
        onload: function (response) {
          if (response.status >= 200 && response.status < 400) {
            console.log("[CTI] Remote log sent successfully");
          } else {
            console.warn("[CTI] Remote log failed:", response.status, response.responseText);
          }
        },
        onerror: function (err) {
          console.warn("[CTI] Remote log network error:", err);
        },
      });
    }
  
    // ═══════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════
  
    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }
  
    function exportLogs() {
      const logs = GM_getValue("cti_logs", []);
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cti-logs-${state.participantId || "all"}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return `Exported ${logs.length} log entries.`;
    }
  
    function clearLogs() {
      GM_setValue("cti_logs", []);
      state.sessionLog = [];
      return "Logs cleared.";
    }
  
    window.CTI = { exportLogs, clearLogs, getState: () => state };
  
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
  
    function init() {
      if (state.initialized) return;
      state.initialized = true;
  
      state.platform = detectPlatform();
      if (!state.platform) {
        console.log("[CTI] No supported platform detected on", window.location.hostname);
        return;
      }
  
      state.participantId = GM_getValue("cti_participant_id", "");
      state.consentGiven = GM_getValue("cti_consent_given", false);
  
      document.addEventListener("keydown", interceptSubmission, true);
      document.addEventListener("click", interceptSubmission, true);
      document.addEventListener("pointerdown", interceptSubmission, true);
      document.addEventListener("mousedown", interceptSubmission, true);
  
      let lastAttachedBtn = null;
      setInterval(() => {
        if (!state.isFirstMessage || state.interceptActive || !state.consentGiven) return;
  
        const platform = state.platform;
        if (!platform) return;
  
        for (const sel of platform.sendSelectors) {
          const btn = document.querySelector(sel);
          if (btn && btn !== lastAttachedBtn) {
            lastAttachedBtn = btn;
            btn.addEventListener("pointerdown", interceptSubmission, true);
            btn.addEventListener("mousedown", interceptSubmission, true);
            btn.addEventListener("click", interceptSubmission, true);
            console.log("[CTI] Attached direct listeners to send button:", sel);
          }
        }
  
        for (const sel of platform.inputSelectors) {
          const input = document.querySelector(sel);
          if (input && !input._ctiAttached) {
            input._ctiAttached = true;
            input.addEventListener("keydown", interceptSubmission, true);
            console.log("[CTI] Attached direct keydown listener to input:", sel);
          }
        }
      }, 1000);
  
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log("[CTI] Navigation detected:", lastUrl);
          lastAttachedBtn = null;
          setTimeout(() => {
            if (isNewConversation()) {
              state.isFirstMessage = true;
              state.interceptActive = false;
              state.reflectionLoop = 0;
              console.log("[CTI] New conversation — intervention armed");
            }
          }, 500);
        }
      }, 500);
  
      if (!state.consentGiven) {
        setTimeout(showConsentModal, 2000);
      }
  
      console.log(
        `%c🧠 Critical Thinking Intervention v4.1 — JACE Theme`,
        "color: #20a565; font-weight: bold; font-size: 14px;"
      );
      console.log(`  Platform: ${state.platform.name}`);
      console.log("  Proxy URL:", CONFIG.PROXY_URL);
      console.log("  Remote logging:", CONFIG.GOOGLE_SHEET_WEBHOOK !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE" ? "ENABLED" : "DISABLED");
      console.log("  CTI.exportLogs() — download local research data");
      console.log("  CTI.clearLogs()  — clear local logs");
    }
  
    setTimeout(init, 2000);
  })();
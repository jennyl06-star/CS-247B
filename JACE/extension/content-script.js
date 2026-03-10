(function () {
  "use strict";

  const CONFIG = {
    PROXY_URL: "https://cti-proxy.hall-justinanthony.workers.dev",
    PROXY_SECRET: "",
    GOOGLE_SHEET_WEBHOOK: "https://script.google.com/macros/s/AKfycbzCXW7vQw-YGLHjzZMLP1_m1GSC8YdJV91jufepPri12zrkvKaQBCRcu-ghjgshovzu3Q/exec",
    MODEL: "gpt-4o-mini",
    MAX_LOOPS: 2,
    NUM_QUESTIONS: 2,
    APPEND_PLANNING_TO_PROMPT: true,
    LOG_DATA: true,
    INTENT_THRESHOLD: 3,
    FAMILIARITY_CHECK: true,
    MIN_SCORE_ROUND_1: 70,
    MIN_SCORE_ROUND_2: 50,
    ENABLED_PLATFORMS: { chatgpt: true, claude: true, gemini: true, copilot: true },
  };

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
        '[data-testid="chat-input"] [contenteditable="true"]',
        'fieldset .ProseMirror',
        'div[data-placeholder][contenteditable="true"]',
        'fieldset div[contenteditable="true"]',
        'div[contenteditable="true"]',
      ],
      sendSelectors: [
        'button[data-testid="send-button"]',
        'button[aria-label="Send Message"]',
        'button[aria-label="Send message"]',
        'button[aria-label*="Send" i]',
        'fieldset button[type="submit"]',
        'form button[type="submit"]',
      ],
      newConvoCheck: () => {
        const url = window.location.href;
        // Explicit new/empty chat URLs
        if (url.match(/^https:\/\/claude\.ai\/(new|chats)?\/?$/)) return true;
        // Look for actual human or AI message content in the conversation
        const messages = document.querySelectorAll(
          '[data-is-streaming], ' +
          '.font-claude-message, ' +
          '[data-testid="human-turn"], ' +
          '[data-testid="ai-turn"], ' +
          '.human-turn, .ai-turn, ' +
          '[class*="HumanTurn"], [class*="AssistantTurn"]'
        );
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
    round1Questions: [],
    round1Answers: [],
    currentQueryId: null,
    supabase: null,
    allAnswers: [],
    pendingLogs: [],
    logFlushTimer: null,
  };

  function detectPlatform() {
    const host = window.location.hostname;
    for (const [key, platform] of Object.entries(PLATFORMS)) {
      if (platform.hostMatch(host)) {
        return { key, ...platform };
      }
    }
    return null;
  }

  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  // Strips markdown code fences if the model ignores response_format and wraps JSON
  function parseJSON(raw) {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  }

  async function callOpenAI(systemPrompt, userMessage, jsonMode = true) {
    if (!isContextValid()) {
      throw new Error("Extension context invalidated. Please refresh the page.");
    }
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          {
            type: "API_CALL",
            data: {
              systemPrompt,
              userMessage,
              jsonMode,
              config: CONFIG,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || "API call failed"));
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  async function analyzeIntent(prompt) {
    const systemPrompt = `You are an intent analyzer. Evaluate whether a user's question requires deep critical thinking or is simple enough to answer directly.

Score the complexity from 1-10:
- 1-3: Very simple (e.g., "What color is the sky?", "What's 2+2?")
- 4-6: Moderate complexity
- 7-10: Complex, requires planning/research/critical thinking

You MUST respond with JSON: {"complexity_score": number, "reasoning": "brief explanation"}`;

    const raw = await callOpenAI(systemPrompt, `User's prompt:\n"${prompt}"`);
    return parseJSON(raw);
  }

  async function checkFamiliarity(prompt) {
    const platformName = state.platform?.name || "an AI chatbot";
    const systemPrompt = `You are checking if the user needs basic conceptual understanding before diving into detailed questions.

Determine if asking "Are you familiar with this concept?" would be helpful.

You MUST respond with JSON: {"ask_familiarity": true/false, "concept_name": "the main concept or topic"}`;

    const raw = await callOpenAI(systemPrompt, `User's prompt:\n"${prompt}"`);
    return parseJSON(raw);
  }

  async function generateQuestions(prompt, isRound2 = false, previousQA = null) {
    const platformName = state.platform?.name || "an AI chatbot";

    let systemPrompt = `You are a metacognitive coach helping students think critically before using ${platformName}. Your job is to generate ${CONFIG.NUM_QUESTIONS} personalized reflection questions based on the user's prompt.

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

You MUST respond with a JSON object containing a "questions" array. Each item has "question" and "placeholder" keys.`;

    if (isRound2 && previousQA) {
      systemPrompt += `\n\nIMPORTANT: This is Round 2. The user has already answered some questions. Generate NEW questions that:
- Build on their previous answers
- Address gaps or unclear areas from Round 1
- Help them think deeper about aspects they haven't fully explored
- Are different from the Round 1 questions

Previous Q&A:
${previousQA}`;
    }

    const raw = await callOpenAI(systemPrompt, `Student's prompt:\n"${prompt}"`);
    const parsed = JSON.parse(raw);
    if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    throw new Error("Failed to parse questions from API");
  }

  async function checkForGibberish(text) {
    if (!text || text.trim().length < 3) return true;

    const systemPrompt = `You are checking if user input is gibberish or a genuine attempt at answering.

Determine if the text is:
- Gibberish (random characters, "asdf", "...", single words like "idk" or "yes")
- Real content (genuine attempt to answer, even if brief)

You MUST respond with JSON: {"is_gibberish": true/false, "confidence": number (0-1)}`;

    try {
      const raw = await callOpenAI(systemPrompt, `Text to evaluate:\n"${text}"`);
      const result = JSON.parse(raw);
      return result.is_gibberish && result.confidence > 0.7;
    } catch {
      return text.trim().length < 5;
    }
  }

  async function evaluateResponses(prompt, questions, answers, roundNumber) {
    const minScore = roundNumber === 0 ? CONFIG.MIN_SCORE_ROUND_1 : CONFIG.MIN_SCORE_ROUND_2;

    const systemPrompt = `You are evaluating whether a student has engaged in sufficient critical thinking before using an AI chatbot. You are NOT grading them — you are coaching them.

You will receive:
1. The student's original prompt
2. The reflection questions they were asked
3. Their answers

Evaluate whether the student has:
- Shown genuine engagement (not just filler answers)
- Demonstrated some understanding or honest self-assessment
- Formed at least a rough plan or identified what they need

Score their responses from 1-100 where:
- 1-20: No effort — gibberish, completely off-topic, or refused to engage
- 21-50: Minimal effort — single words, "I don't know", vague answers with no specifics, or generic filler
- 51-60: Surface-level — student tried but answers are generic, hedge with uncertainty, or repeat the question without adding real thought
- 61-75: Moderate engagement — shows some genuine thought and includes a few specific ideas, but lacks depth, clear planning, or awareness of tradeoffs
- 76-90: Strong engagement — specific, well-reasoned answers that demonstrate real understanding and a concrete plan
- 91-99: Very strong — comprehensive, detailed, multi-faceted answers that cover key angles and show critical awareness of challenges
- 100: Exceptional (extremely rare) — essentially perfect critical thinking; professional-quality reasoning that is thorough, nuanced, and would meaningfully transform the AI's response

Be critical and exacting. Vague answers, hedging, and generic ideas should score in the 51-60 range even with genuine effort. A score of 76+ requires specific, actionable content — not just good intentions. Scores above 90 should be rare, and 100 should almost never occur.

IMPORTANT: This is Round ${roundNumber + 1}. The minimum passing score is ${minScore}/100.

You MUST respond with a JSON object with these exact keys:
{
  "score": number (1-100),
  "sufficient": true or false (true if score >= ${minScore}),
  "feedback": "Brief encouraging feedback or gentle nudge to think deeper (2-3 sentences max)",
  "strengthened_prompt_addition": "A 1-2 sentence summary of their planning that can be appended to improve their prompt. Generate this even if score is below threshold, as long as answers aren't complete gibberish."
}`;

    const qaBlock = questions
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i] || "(no answer)"}`)
      .join("\n\n");

    const userMsg = `Original prompt:\n"${prompt}"\n\nReflection Q&A:\n${qaBlock}`;
    const raw = await callOpenAI(systemPrompt, userMsg);
    return parseJSON(raw);
  }

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
      // Select all existing content then replace — preserves ProseMirror/React state
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
      // Dispatch events to trigger framework state updates
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text }));
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
      const inInput = isInsideInput(e.target) || isInsideInput(document.activeElement);
      if (inInput) {
        console.log("[JACE] Enter key send detected", { target: e.target?.tagName, activeEl: document.activeElement?.tagName });
        return true;
      }
      // Fallback for Claude: check if we're inside ANY contenteditable
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.contentEditable === "true" || activeEl.closest('[contenteditable="true"]'))) {
        console.log("[JACE] Enter key send detected via contenteditable fallback");
        return true;
      }
    }

    if (e.type === "click" || e.type === "pointerdown" || e.type === "mousedown") {
      if (isSendButton(e.target)) {
        console.log("[JACE] Send button detected", { sel: e.target?.getAttribute?.("aria-label"), testid: e.target?.getAttribute?.("data-testid") });
        return true;
      }
    }

    return false;
  }

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
        <h2 class="cti-title">Welcome to JACE</h2>
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

      try {
        chrome.storage.local.set({
          cti_participant_id: pid,
          cti_consent_given: true,
          cti_consent_timestamp: new Date().toISOString(),
        });
      } catch {}

      logEvent("consent_given", { participantId: pid });

      overlay.classList.remove("visible");
      setTimeout(() => overlay.remove(), 300);
    });
  }

  function showLoading(modal, message = "Analyzing your prompt...") {
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
        <div class="cti-loading-text">${message}</div>
      </div>
    `;
  }

  function showSkipNotice(overlay, onDone) {
    const modal = overlay.querySelector("#cti-modal");
    modal.innerHTML = `
      ${wordmarkHTML()}
      <div class="cti-skip-notice">
        <div class="cti-skip-icon">✓</div>
        <div class="cti-skip-title">Skipping Prompt…</div>
        <div class="cti-skip-subtitle">This question looks straightforward — sending it directly.</div>
      </div>
    `;
    setTimeout(() => {
      overlay.classList.remove("visible");
      setTimeout(() => { overlay.remove(); onDone(); }, 300);
    }, 1200);
  }

  function getScoreBadgeClass(score) {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  function showFamiliarityCheck(modal, prompt, conceptName, onYes, onNo) {
    modal.innerHTML = `
      ${wordmarkHTML()}
      <div class="cti-header">
        <div class="cti-icon-circle teal" style="margin:0 auto 12px;">❓</div>
        <h2 class="cti-title">Quick Question</h2>
        <p class="cti-subtitle">Before we dive into planning questions...</p>
      </div>
      <div class="cti-familiarity-question">
        <p>How familiar are you with <strong>${escapeHtml(conceptName)}</strong>?</p>
        <div class="cti-familiarity-slider-row">
          <input type="range" id="cti-familiarity-slider" min="0" max="5" value="3" step="1" style="width:100%;" />
          <div class="cti-familiarity-labels">
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
          <p class="cti-familiarity-value">Selected: <strong id="cti-familiarity-display">3</strong> / 5</p>
        </div>
      </div>
      <div class="cti-button-row" style="justify-content: center;">
        <button class="cti-btn cti-btn-primary" id="cti-familiar-submit">Continue</button>
      </div>
    `;

    const slider = document.getElementById("cti-familiarity-slider");
    const display = document.getElementById("cti-familiarity-display");
    slider.addEventListener("input", () => { display.textContent = slider.value; });

    document.getElementById("cti-familiar-submit").addEventListener("click", () => {
      const value = parseInt(slider.value, 10);
      logEvent("familiarity_check", { prompt, concept: conceptName, familiarity: value });
      if (value <= 1) {
        onNo();
      } else {
        onYes();
      }
    });
  }

  function showQuestions(modal, prompt, questions, feedback = null, evaluationScore = null) {
    const loopNum = state.reflectionLoop + 1;
    const progressDots = Array.from({ length: CONFIG.MAX_LOOPS }, (_, i) => {
      if (i < state.reflectionLoop) return `<div class="cti-progress-dot complete"></div>`;
      if (i === state.reflectionLoop) return `<div class="cti-progress-dot active"></div>`;
      return `<div class="cti-progress-dot"></div>`;
    }).join("");

    const scoreBadge = evaluationScore !== null
      ? `<span class="cti-score-badge ${getScoreBadgeClass(evaluationScore)}">Score: ${evaluationScore}/100</span>`
      : '';

    const feedbackHTML = feedback
      ? `<div id="cti-feedback" class="visible">${escapeHtml(feedback)} ${scoreBadge}</div>`
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
    document.getElementById("cti-skip").addEventListener("click", async () => {
      logEvent("skipped", { loop: state.reflectionLoop, prompt });

      if (state.supabase && state.currentQueryId) {
        await state.supabase.updateQueryHistory(state.currentQueryId, {
          skipped: true,
          total_rounds: state.reflectionLoop
        });
      }

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

  function showScoreScreen(modal, score, promptText, feedback) {
    const color = score >= 80 ? 'var(--jace-green-mid)' :
                  score >= 60 ? 'var(--jace-blue-light)' :
                  score >= 40 ? '#ffc107' : '#ff6b6b';
    const message = score >= 80 ? 'Excellent reflection!' :
                    score >= 60 ? 'Good thinking!' :
                    score >= 40 ? 'Keep reflecting!' : 'Thanks for trying!';

    modal.innerHTML = `
      ${wordmarkHTML()}
      <div class="cti-score-screen">
        <div class="cti-score-display" style="--score-color: ${color}">
          <div class="cti-score-big">${score}</div>
          <div class="cti-score-denom">/100</div>
        </div>
        <div class="cti-score-message">${message}</div>
        <div class="cti-score-sending" id="cti-score-countdown">Sending in 3s…</div>
      </div>
    `;

    let secs = 3;
    const tick = setInterval(() => {
      secs--;
      const el = document.getElementById('cti-score-countdown');
      if (el) el.textContent = secs > 0 ? `Sending in ${secs}s…` : 'Sending…';
      if (secs <= 0) {
        clearInterval(tick);
        closeModalAndSend(promptText, feedback, score);
      }
    }, 1000);
  }

  async function handleReflectionSubmit(modal, prompt, questions) {
    const inputs = modal.querySelectorAll(".cti-answer-input");
    const answers = Array.from(inputs).map((el) => el.value.trim());

    if (answers.every((a) => a.length === 0)) {
      document.getElementById("cti-feedback").textContent =
        "Please try answering at least one question — even a short response helps!";
      document.getElementById("cti-feedback").classList.add("visible");
      return;
    }

    if (state.reflectionLoop === 0) {
      state.round1Questions = questions;
      state.round1Answers = answers;
    }

    state.allAnswers = state.allAnswers.concat(answers);

    logEvent("reflection_submitted", {
      loop: state.reflectionLoop, prompt,
      questions: questions.map((q) => q.question), answers,
    });

    showEvaluating(modal);

    try {
      const evaluation = await evaluateResponses(prompt, questions, answers, state.reflectionLoop);

      logEvent("reflection_evaluated", {
        loop: state.reflectionLoop,
        score: evaluation.score,
        sufficient: evaluation.sufficient,
        feedback: evaluation.feedback,
      });

      if (state.supabase && state.currentQueryId) {
        try {
          await state.supabase.insertReflectionRound({
            query_id: state.currentQueryId,
            round_number: state.reflectionLoop,
            questions: questions.map(q => q.question),
            answers: answers,
            evaluation_score: evaluation.score,
            evaluation_feedback: evaluation.feedback,
            sufficient: evaluation.sufficient
          });
        } catch (dbErr) {
          console.warn("[JACE] Supabase insertReflectionRound failed:", dbErr.message);
        }
      }

      if (evaluation.sufficient || state.reflectionLoop >= CONFIG.MAX_LOOPS - 1) {
        logEvent("reflection_approved", {
          loop: state.reflectionLoop,
          feedback: evaluation.feedback,
          sufficient: evaluation.sufficient,
          finalScore: evaluation.score,
        });

        let enhancedPrompt = prompt;
        const hasValidContext = evaluation.strengthened_prompt_addition &&
          evaluation.strengthened_prompt_addition.trim().length > 10;

        if (CONFIG.APPEND_PLANNING_TO_PROMPT && hasValidContext) {
          const allAnswersText = state.allAnswers.join(" ");
          const isGibberish = await checkForGibberish(allAnswersText);

          if (!isGibberish) {
            enhancedPrompt = `${prompt}\n\n[Context from my planning: ${evaluation.strengthened_prompt_addition}]`;
          }
        }

        if (state.supabase && state.currentQueryId) {
          try {
            await state.supabase.updateQueryHistory(state.currentQueryId, {
              completed: true,
              total_rounds: state.reflectionLoop + 1,
              final_score: evaluation.score,
              enhanced_prompt: enhancedPrompt
            });
          } catch (dbErr) {
            console.warn("[JACE] Supabase updateQueryHistory failed:", dbErr.message);
          }
        }

        showScoreScreen(modal, evaluation.score, enhancedPrompt, evaluation.feedback);
      } else {
        state.reflectionLoop++;
        logEvent("reflection_insufficient", {
          loop: state.reflectionLoop,
          feedback: evaluation.feedback,
          score: evaluation.score,
        });

        showLoading(modal, "Generating deeper questions based on your answers...");

        const previousQA = questions
          .map((q, i) => `Q: ${q.question}\nA: ${answers[i] || "(no answer)"}`)
          .join("\n\n");

        const newQuestions = await generateQuestions(prompt, true, previousQA);
        showQuestions(modal, prompt, newQuestions, evaluation.feedback, evaluation.score);
      }
    } catch (err) {
      console.error("CTI evaluation error:", err);
      closeModalAndSend(prompt, null);
    }
  }

  function closeModalAndSend(promptText, feedback, finalScore = null) {
    const overlay = document.getElementById("cti-overlay");
    if (overlay) {
      overlay.classList.remove("visible");
      setTimeout(() => overlay.remove(), 300);
    }

    state.interceptActive = false;
    state.isFirstMessage = false;

    const isClaude = state.platform?.key === "claude";
    const sendDelay = isClaude ? 600 : 300;

    setTimeout(() => {
      setPromptText(promptText);
      // Claude needs extra time for its React state to re-enable the send button
      setTimeout(() => {
        clickSendButton();
        // Fallback: retry once if first attempt may have hit a disabled button
        if (isClaude) {
          setTimeout(() => {
            const btn = document.querySelector(
              'button[data-testid="send-button"], button[aria-label="Send Message"], button[aria-label="Send message"]'
            );
            if (btn && !btn.disabled) btn.click();
          }, 400);
        }
      }, sendDelay);
    }, 400);
  }

  async function interceptSubmission(e) {
    if (!state.isFirstMessage || state.interceptActive) return;
    if (!state.consentGiven) return;
    if (!state.platform) return;

    if (!isSendAction(e)) return;

    // Log state at interception point for debugging
    console.log("[JACE] Intercepting send action", { type: e.type, isFirstMessage: state.isFirstMessage, consentGiven: state.consentGiven, platform: state.platform?.name });

    const promptText = getPromptText();
    console.log("[JACE] Send action detected!", e.type, "prompt length:", promptText.length);

    if (!promptText || promptText.length < 5) {
      console.log("[JACE] Skipped - Prompt too short:", promptText.length);
      return;
    }

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
    state.round1Questions = [];
    state.round1Answers = [];
    state.allAnswers = [];

    logEvent("prompt_intercepted", { prompt: promptText });

    const overlay = createOverlay();
    const modal = overlay.querySelector("#cti-modal");
    showLoading(modal, "Analyzing your question...");

    try {
      const intentAnalysis = await analyzeIntent(promptText);
      logEvent("intent_analyzed", {
        prompt: promptText,
        complexityScore: intentAnalysis.complexity_score,
        reasoning: intentAnalysis.reasoning,
      });

      if (state.supabase) {
        try {
          const queryData = await state.supabase.insertQueryHistory({
            participant_id: state.participantId,
            platform: state.platform?.name || "unknown",
            original_prompt: promptText,
            complexity_score: intentAnalysis.complexity_score,
            intent_reasoning: intentAnalysis.reasoning,
            conversation_url: window.location.href,
            skipped: false,
            completed: false
          });

          if (queryData && queryData.length > 0) {
            state.currentQueryId = queryData[0].id;
          }
        } catch (dbErr) {
          console.warn("[JACE] Supabase insert failed, continuing without logging:", dbErr.message);
        }
      }

      if (intentAnalysis.complexity_score < CONFIG.INTENT_THRESHOLD) {
        console.log(`[JACE] Skipped - Question too simple (score: ${intentAnalysis.complexity_score}/${CONFIG.INTENT_THRESHOLD})`, intentAnalysis.reasoning);

        logEvent("intent_skipped", {
          prompt: promptText,
          reason: "Question too simple for intervention",
        });

        if (state.supabase && state.currentQueryId) {
          try {
            await state.supabase.updateQueryHistory(state.currentQueryId, {
              skipped: true,
              total_rounds: 0
            });
          } catch (dbErr) {
            console.warn("[JACE] Supabase update failed:", dbErr.message);
          }
        }

        state.interceptActive = false;
        state.isFirstMessage = false;
        showSkipNotice(overlay, () => clickSendButton());
        return;
      }

      console.log(`[JACE] Proceeding with intervention (complexity score: ${intentAnalysis.complexity_score}/${CONFIG.INTENT_THRESHOLD})`);

      if (CONFIG.FAMILIARITY_CHECK) {
        showLoading(modal, "Checking concept...");

        let conceptName = "this concept";
        try {
          const familiarityCheck = await checkFamiliarity(promptText);
          if (familiarityCheck.concept_name) {
            conceptName = familiarityCheck.concept_name;
          }
        } catch (err) {
          console.warn("[JACE] Familiarity check failed, using generic concept name:", err);
        }

        showFamiliarityCheck(modal, promptText, conceptName,
          () => {
            showLoading(modal, "Generating your reflection questions...");
            generateQuestions(promptText, false, null)
              .then((questions) => {
                logEvent("questions_generated", { questions: questions.map((q) => q.question) });
                showQuestions(modal, promptText, questions);
              })
              .catch((err) => {
                console.error("CTI question generation error:", err);
                closeModalAndSend(promptText, null);
              });
          },
          () => {
            logEvent("familiarity_low", { prompt: promptText, concept: conceptName });
            overlay.classList.remove("visible");
            setTimeout(() => overlay.remove(), 300);
            state.interceptActive = false;
            state.isFirstMessage = false;
            setTimeout(() => clickSendButton(), 100);
          }
        );
        return;
      }

      showLoading(modal, "Generating your reflection questions...");

      generateQuestions(promptText, false, null)
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
    } catch (err) {
      // Intent analysis failed (API error or JSON parse error) — skip intervention
      // to avoid blocking simple prompts when the classifier can't run
      console.error("[JACE] Intent analysis failed, skipping intervention:", err);
      logEvent("intent_error", { prompt: promptText, error: err.message });
      state.interceptActive = false;
      state.isFirstMessage = false;
      showSkipNotice(overlay, () => clickSendButton());
    }
  }

  function logEvent(eventType, data) {
    if (!CONFIG.LOG_DATA) return;
    if (!isContextValid()) return;

    const entry = {
      timestamp: new Date().toISOString(),
      participantId: state.participantId,
      platform: state.platform?.name || "unknown",
      eventType,
      conversationUrl: window.location.href,
      ...data,
    };

    state.sessionLog.push(entry);

    // Batch writes to avoid race conditions when multiple events fire in rapid succession
    state.pendingLogs.push(entry);
    if (!state.logFlushTimer) {
      state.logFlushTimer = setTimeout(() => {
        const toFlush = state.pendingLogs.splice(0);
        state.logFlushTimer = null;
        try {
          chrome.storage.local.get(["cti_logs"], (result) => {
            if (chrome.runtime.lastError) return;
            const allLogs = result.cti_logs || [];
            chrome.storage.local.set({ cti_logs: [...allLogs, ...toFlush] });
          });
        } catch {}
      }, 50);
    }

    console.log("[JACE Log]", entry);

    try {
      if (CONFIG.GOOGLE_SHEET_WEBHOOK && CONFIG.GOOGLE_SHEET_WEBHOOK !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
        chrome.runtime.sendMessage({
          type: "LOG_TO_SHEET",
          data: { entry, webhookUrl: CONFIG.GOOGLE_SHEET_WEBHOOK },
        });
      }
    } catch {}
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    state.platform = detectPlatform();
    if (!state.platform) {
      console.log("[JACE] No supported platform detected on", window.location.hostname);
      return;
    }

    if (typeof SupabaseClient !== 'undefined') {
      state.supabase = new SupabaseClient();
      console.log("[JACE] Supabase client initialized");
    } else {
      console.warn("[JACE] SupabaseClient not available");
    }

    chrome.storage.local.get(["cti_participant_id", "cti_consent_given", "cti_config"], (result) => {
      state.participantId = result.cti_participant_id || "";
      state.consentGiven = result.cti_consent_given || false;

      if (result.cti_config) {
        Object.assign(CONFIG, result.cti_config);
      }

      // Check if JACE is enabled for this platform
      const platformKey = state.platform?.key;
      const enabled = CONFIG.ENABLED_PLATFORMS || {};
      if (platformKey && enabled[platformKey] === false) {
        console.log(`[JACE] Disabled for platform: ${state.platform.name}`);
        return;
      }

      if (!state.consentGiven) {
        setTimeout(showConsentModal, 2000);
      }

      // Attach send interceptors only if platform is enabled
      // Use window (not document) so we fire before framework-level capture handlers
      // (e.g. Tiptap/ProseMirror on Claude registers at window level and calls
      // stopPropagation, which would prevent document-level listeners from firing)
      window.addEventListener("keydown", interceptSubmission, true);
      window.addEventListener("click", interceptSubmission, true);
      window.addEventListener("pointerdown", interceptSubmission, true);
      window.addEventListener("mousedown", interceptSubmission, true);

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
          }
        }

        for (const sel of platform.inputSelectors) {
          const input = document.querySelector(sel);
          if (input && !input._ctiAttached) {
            input._ctiAttached = true;
            input.addEventListener("keydown", interceptSubmission, true);
          }
        }
      }, 1000);

      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          console.log("[JACE] Navigation detected:", lastUrl);
          lastAttachedBtn = null;
          setTimeout(() => {
            if (isNewConversation()) {
              state.isFirstMessage = true;
              state.interceptActive = false;
              state.reflectionLoop = 0;
              state.round1Questions = [];
              state.round1Answers = [];
              console.log("[JACE] New conversation — intervention armed");
            }
          }, 500);
        }
      }, 500);

      console.log(
        `%c🧠 JACE v5.0 — Chrome Extension`,
        "color: #20a565; font-weight: bold; font-size: 14px;"
      );
      console.log(`  Platform: ${state.platform.name}`);
    });
  }

  setTimeout(init, 2000);
})();

# JACE Extension - Quick Reference Card

## Installation (5 Minutes)

1. **Generate Icons First!**
   - Open `extension/icons/generate-icons.html` in browser
   - Save 3 squares as: `icon16.png`, `icon48.png`, `icon128.png`
   - Place in `extension/icons/` folder

2. **Load Extension**
   - Chrome → `chrome://extensions/`
   - Enable "Developer mode" (top-right)
   - Click "Load unpacked"
   - Select `extension/` folder

3. **Setup**
   - Extension popup will open
   - Enter Participant ID
   - Check consent box
   - Click "I Agree — Get Started"

---

## Feature Summary (What's New)

| Feature | Who Requested | What It Does |
|---------|---------------|--------------|
| **Intent Parser** | Jeongyeon | Skips simple questions like "What color is the sky?" |
| **Familiarity Check** | Jenny | Asks if user knows concept before reflection questions |
| **Dashboard** | Jenny | Shows stats and query history with Supabase |
| **Sliders** | Justin | Customize # of questions, rounds, thresholds |
| **Score Lowering** | Justin | Round 2 easier than Round 1 (5/10 vs 7/10) |
| **Show Scores** | Justin | Display evaluation scores everywhere |
| **Round 2 Customization** | Team | Follow-up questions based on Round 1 answers |
| **Context Addition** | Team | Add planning even below threshold (if not gibberish) |
| **Design** | Alex | Professional dark theme with green/blue accents |
| **Database** | Team | Supabase integration for persistence |

---

## How It Works (30 Second Version)

```
User types question → Complexity check (1-10)
    ↓
If too simple (< 6) → Skip intervention
If complex enough → Familiarity check
    ↓
"Are you familiar with [concept]?"
    ↓
Yes → Reflection questions (Round 1)
No → Skip intervention
    ↓
User answers → AI evaluates (score 1-10)
    ↓
If score < 7 → Round 2 (easier threshold: 5/10)
If score ≥ 7 → Continue
    ↓
Gibberish check on answers
    ↓
If genuine → Add context to prompt (even if low score)
If nonsense → Don't add context
    ↓
Enhanced prompt sent to AI
All data saved to Supabase
```

---

## Testing Quick Guide

### Test 1: Intent Parser
```
Go to ChatGPT → Type "What's 2+2?"
Expected: Skips JACE (too simple)

Type "How do I build a microservices architecture?"
Expected: Shows JACE intervention (complex)
```

### Test 2: Familiarity Check
```
Type "Explain quantum entanglement"
Expected: Shows "Are you familiar with quantum entanglement?"

Click "Not Really"
Expected: Skips to AI (lets AI teach)

Click "Yes, I'm Familiar"
Expected: Shows reflection questions
```

### Test 3: Dashboard
```
Click extension icon → Dashboard tab
Expected: Shows stats (prompts, avg score, skip rate)
Expected: Shows history of queries
```

### Test 4: Settings
```
Click Settings tab
Move "Questions per Round" slider to 5
Save Settings
Start new chat → Type complex question
Expected: Shows 5 questions instead of 2
```

### Test 5: Scores
```
Answer questions poorly → Check feedback
Expected: Shows score badge (colored: green/blue/yellow)

Open Dashboard → Check history
Expected: Score displayed for that query
```

### Test 6: Round 2
```
Give weak Round 1 answers → Proceed to Round 2
Expected: Questions reference your previous answers
Expected: Questions target weak areas
```

### Test 7: Context Addition
```
Give mediocre answers (score 5/10) → Continue
Check final prompt sent to AI
Expected: Includes "[Context from my planning: ...]"

Give nonsense answers ("asdf idk ...") → Continue
Expected: No context added (gibberish detected)
```

---

## Settings Explained

| Setting | Default | Range | What It Controls |
|---------|---------|-------|------------------|
| Questions per Round | 2 | 1-5 | How many questions each round |
| Maximum Rounds | 2 | 1-3 | Max rounds before submission |
| Intent Threshold | 6 | 1-10 | Min complexity to trigger |
| Min Score Round 1 | 7 | 1-10 | Passing score for first round |
| Min Score Round 2 | 5 | 1-10 | Passing score for second round |

**Toggles**:
- Append context: Add planning summary to prompt
- Enable logging: Save data to Supabase

---

## Troubleshooting (1 Minute Fixes)

### Extension not showing up?
- Check you're on supported site (ChatGPT/Claude/Gemini/Copilot)
- Verify icons exist (16, 48, 128px)
- Check manifest.json for errors

### Modal not appearing?
- Must be on NEW conversation (empty chat)
- Must have given consent (participant ID set)
- Check console: `[JACE]` logs should appear

### Dashboard empty?
- Need to interact with extension first
- Check Supabase connection (Network tab)
- Falls back to local storage if offline

### Scores not displaying?
- Check evaluation completed (console logs)
- Verify CSS loaded (no style errors)
- Refresh page and try again

---

## Database Access (For Researchers)

### Supabase Dashboard:
1. Go to https://supabase.com
2. Open JACE project
3. Table Editor → View data

### Tables:
- **query_history**: All prompts, scores, completion status
- **reflection_rounds**: Detailed Q&A for each round
- **user_settings**: Participant configuration

### Useful Queries:
```sql
-- Get all queries by participant
SELECT * FROM query_history
WHERE participant_id = 'P001'
ORDER BY created_at DESC;

-- Get average scores
SELECT participant_id, AVG(final_score) as avg_score
FROM query_history
WHERE final_score IS NOT NULL
GROUP BY participant_id;

-- Get skip rate
SELECT
  participant_id,
  COUNT(*) as total,
  SUM(CASE WHEN skipped THEN 1 ELSE 0 END) as skipped,
  ROUND(100.0 * SUM(CASE WHEN skipped THEN 1 ELSE 0 END) / COUNT(*), 2) as skip_rate
FROM query_history
GROUP BY participant_id;
```

---

## Files Cheat Sheet

```
extension/
├── manifest.json              # Extension config
├── content-script.js          # Main logic (970 lines)
├── background.js              # API proxy
├── supabase-client.js         # Database (NEW)
├── styles.css                 # Modal styles
├── popup.html                 # Dashboard UI
├── popup.js                   # Dashboard logic
├── popup.css                  # Popup styles
└── icons/                     # 16, 48, 128px images
```

**Documentation**:
- `COMPLETION_REPORT.md` - Full implementation details
- `IMPLEMENTATION_GUIDE.md` - Technical reference
- `FEATURES_SUMMARY.md` - Feature explanations
- `QUICK_REFERENCE.md` - This document

---

## Contact & Support

**For Bugs**:
1. Check browser console (`F12` → Console tab)
2. Check Network tab (API failures?)
3. Test in incognito mode (clean state)
4. Export logs from Dashboard

**For Questions**:
- Read `IMPLEMENTATION_GUIDE.md` for technical details
- Check console for `[JACE]` debug logs
- Verify Supabase connection working

---

## Version Information

- **Version**: 5.0.0
- **Build Date**: 2026-03-05
- **Manifest**: V3
- **Browser**: Chrome 120+
- **Database**: Supabase PostgreSQL

---

## Privacy & Data

**What's Collected**:
- Prompt text (first message only)
- Reflection questions and answers
- Evaluation scores and feedback
- Platform name and timestamp
- Participant ID (anonymous)

**What's NOT Collected**:
- Full conversation history
- Account information
- Browsing data outside extension
- Personal identifying information

**Data Storage**:
- Supabase cloud database (encrypted)
- Local chrome.storage (backup)
- Exportable as JSON anytime

---

## Quick Commands (Terminal)

```bash
# Build project
npm run build

# Run dev mode (if needed)
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Keyboard Shortcuts

- **Skip**: Click "Skip & Send Original" button (no shortcut)
- **Submit**: Click "Submit Reflection" or Enter in last field
- **Dashboard**: Click extension icon

---

## Color Codes (For Scores)

| Color | Range | Meaning |
|-------|-------|---------|
| 🟢 Green | 7-10 | High quality thinking |
| 🔵 Blue | 4-6 | Medium effort |
| 🟡 Yellow | 1-3 | Low effort/minimal |

---

## Platform Support

| Platform | URL Pattern | Status |
|----------|-------------|--------|
| ChatGPT | chatgpt.com, chat.openai.com | ✅ Supported |
| Claude | claude.ai | ✅ Supported |
| Gemini | gemini.google.com | ✅ Supported |
| Copilot | copilot.microsoft.com | ✅ Supported |

---

## Default Configuration

```javascript
{
  MODEL: "gpt-4o-mini",
  MAX_LOOPS: 2,
  NUM_QUESTIONS: 2,
  INTENT_THRESHOLD: 6,
  MIN_SCORE_ROUND_1: 7,
  MIN_SCORE_ROUND_2: 5,
  FAMILIARITY_CHECK: true,
  APPEND_PLANNING_TO_PROMPT: true,
  LOG_DATA: true
}
```

All configurable via Settings tab!

---

**Last Updated**: 2026-03-05
**Status**: Production Ready ✅

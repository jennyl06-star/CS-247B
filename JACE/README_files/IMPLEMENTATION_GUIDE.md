# JACE Implementation Guide

## Quick Reference for All Requested Features

### ✅ Feature 1: Intent Parser (Skip Simple Questions)
**Requested by**: Jeongyeon
**Status**: Implemented
**How it works**:
- Automatically scores questions 1-10 for complexity
- Questions below threshold (default 6) skip intervention
- Example: "What color is the sky?" gets skipped automatically

**Where to find**:
- Logic: `content-script.js` lines 156-168
- Trigger: `content-script.js` lines 799-842
- Settings: Popup > Settings > Intent Threshold slider

---

### ✅ Feature 2: Familiarity Check
**Requested by**: Jenny
**Status**: Implemented
**How it works**:
- Before reflection questions, asks "Are you familiar with [concept]?"
- If user says "Not Really", skips intervention
- Lets AI teach concepts instead of forcing reflection

**Where to find**:
- Detection: `content-script.js` lines 170-180
- UI: `content-script.js` lines 534-561
- Styles: `styles.css` lines 421-444
- Trigger: `content-script.js` lines 845-870

**Testing**: Try prompts like "Explain quantum entanglement"

---

### ✅ Feature 3: Dashboard (Query History)
**Requested by**: Jenny
**Status**: Implemented
**Features**:
- Stats: Total prompts, average score, skip rate
- History: Last 10 queries with details
- Export data as JSON
- Clear all data button
- Powered by Supabase for persistence

**Where to find**:
- UI: `popup.html` lines 24-53
- Logic: `popup.js` lines 45-202
- Database: Supabase `query_history` table
- Styles: `popup.css`

**Access**: Click extension icon > Dashboard tab

---

### ✅ Feature 4: Customizable # of Questions/Rounds
**Requested by**: Justin
**Status**: Implemented
**Settings available**:
- Questions per Round: 1-5 (slider)
- Maximum Rounds: 1-3 (slider)
- Intent Threshold: 1-10 (slider)
- Min Score Round 1: 1-10 (slider)
- Min Score Round 2: 1-10 (slider)

**Where to find**:
- UI: `popup.html` lines 67-92
- Logic: `popup.js` lines 186-198
- Apply: Saved to `cti_config` in chrome.storage
- Used: `content-script.js` CONFIG object

**Access**: Click extension icon > Settings tab

---

### ✅ Feature 5: Lower Evaluation Score for Later Rounds
**Requested by**: Justin
**Status**: Implemented
**How it works**:
- Round 1 default: 7/10 required
- Round 2 default: 5/10 required
- Prevents frustration from repeated rejections
- Fully configurable via settings

**Where to find**:
- Logic: `content-script.js` line 245
- Display: Shows current requirement in prompt
- Config: `CONFIG.MIN_SCORE_ROUND_1` and `MIN_SCORE_ROUND_2`

---

### ✅ Feature 6: Show Evaluation Scores
**Requested by**: Justin
**Status**: Implemented
**Where scores appear**:
1. **In Modal**: After each round, colored badge shows score
2. **Dashboard**: Score badges in history list
3. **Logs**: Saved to database with each evaluation

**Color coding**:
- 🟢 Green (7-10): High quality
- 🔵 Blue (4-6): Medium effort
- 🟡 Yellow (1-3): Low effort

**Where to find**:
- Badge component: `content-script.js` lines 525-532
- Display: `content-script.js` line 572
- Styles: `styles.css` lines 222-247
- Dashboard: `popup.js` lines 98-99

---

### ✅ Feature 7: Round 2 Based on Round 1 Answers
**Requested by**: Implicit requirement
**Status**: Implemented
**How it works**:
- System passes all Round 1 Q&A to question generator
- Explicitly prompted to build on previous answers
- Addresses gaps, probes deeper, asks different questions

**Where to find**:
- Question generation: `content-script.js` lines 202-211
- Passing context: `content-script.js` lines 691-697
- State tracking: `content-script.js` lines 119-121, 594-596

**Testing**: Give weak Round 1 answers, watch Round 2 target those gaps

---

### ✅ Feature 8: Add Context Even Below Threshold
**Requested by**: Team
**Status**: Implemented
**How it works**:
- Gibberish detection checks answer quality
- If genuine attempt (not "idk", "asdf", etc.), adds context
- Even if score below passing threshold
- Gives users benefit of the doubt

**Where to find**:
- Gibberish check: `content-script.js` lines 224-242
- Context logic: `content-script.js` lines 660-671
- Prompt enhancement: Appends `[Context from my planning: ...]`

**Testing**: Give mediocre but real answers below threshold score

---

### ✅ Feature 9: Design & Theme
**Requested by**: Alex
**Status**: Implemented
**Design features**:
- Dark theme with green/blue accents
- Professional typography (Instrument Sans + DM Sans)
- Smooth animations and micro-interactions
- Consistent spacing and visual hierarchy
- Mobile-friendly sizing

**Where to find**:
- Modal styles: `styles.css` (entire file)
- Popup styles: `popup.css` (entire file)
- Color system: Lines 4-17 in both CSS files
- Icons: Lucide React + emoji

**Fonts**:
- Headers: Instrument Sans (bold, uppercase)
- Body: DM Sans (readable, clean)

---

## Database Schema (Supabase)

### `query_history` table
Stores each intercepted prompt:
- `id`, `participant_id`, `platform`, `original_prompt`
- `complexity_score`, `intent_reasoning`
- `skipped`, `completed`, `total_rounds`, `final_score`
- `enhanced_prompt`, `conversation_url`, `created_at`

### `reflection_rounds` table
Stores each reflection round:
- `id`, `query_id` (FK), `round_number`
- `questions` (jsonb), `answers` (jsonb)
- `evaluation_score`, `evaluation_feedback`, `sufficient`
- `created_at`

### `user_settings` table
Stores participant preferences:
- `id`, `participant_id`
- `num_questions`, `max_rounds`, `intent_threshold`
- `min_score_round_1`, `min_score_round_2`
- `append_context`, `log_data`
- `created_at`, `updated_at`

---

## Installation & Testing

### Load Extension:
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/extension` folder
5. Generate icons first! (see extension/icons/README.md)

### Test Flow:
1. Go to chatgpt.com
2. Start new conversation
3. Type: "Explain quantum mechanics" → Should show familiarity check
4. Type: "What's 2+2?" → Should skip (too simple)
5. Type: "How do I build a mobile app?" → Should show full intervention
6. Open extension popup → View Dashboard and Settings

### Verify Database:
1. Open Supabase dashboard
2. Check `query_history` table has entries
3. Check `reflection_rounds` table has rounds
4. Verify scores and metadata saved

---

## Configuration Files

### `manifest.json`
- Version: 5.0.0
- Permissions: storage, activeTab
- Host permissions: AI platforms + Supabase
- Content scripts: supabase-client.js + content-script.js

### Default CONFIG in `content-script.js`:
```javascript
{
  MODEL: "gpt-4o-mini",
  MAX_LOOPS: 2,
  NUM_QUESTIONS: 2,
  INTENT_THRESHOLD: 6,
  FAMILIARITY_CHECK: true,
  MIN_SCORE_ROUND_1: 7,
  MIN_SCORE_ROUND_2: 5,
  APPEND_PLANNING_TO_PROMPT: true,
  LOG_DATA: true
}
```

---

## API Endpoints (via background.js)

1. **API_CALL**: Sends OpenAI requests through proxy
2. **LOG_TO_SHEET**: Logs events to Google Sheets (optional)

---

## Troubleshooting

### Extension not loading?
- Check manifest.json syntax
- Ensure all icon files exist (icon16.png, icon48.png, icon128.png)
- Check console for errors

### Modal not appearing?
- Check platform detection (must be on supported site)
- Verify consent given (participant ID set)
- Check console: "[JACE] ..." logs

### Supabase not saving?
- Check network tab for failed requests
- Verify CORS permissions in Supabase dashboard
- Check RLS policies are public for research study
- Falls back to chrome.storage.local if offline

### Scores not showing?
- Check evaluation is completing successfully
- Verify `evaluationScore` parameter passed to `showQuestions()`
- Check CSS for `.cti-score-badge` visibility

---

## Code Organization

```
extension/
├── manifest.json           # Extension config
├── content-script.js       # Main intervention logic (950+ lines)
├── background.js           # API proxy handler
├── supabase-client.js      # Database client (NEW)
├── styles.css              # Modal styles
├── popup.html              # Dashboard & settings UI
├── popup.js                # Dashboard logic
├── popup.css               # Popup styles
└── icons/                  # Extension icons
```

---

## Research Data Collected

For each query:
- Original prompt text
- Complexity score & reasoning
- Platform used (ChatGPT/Claude/etc.)
- All questions asked
- All answers given
- Evaluation scores for each round
- Whether completed or skipped
- Enhanced prompt (with context added)
- Timestamps and URLs

**Privacy**: Data is anonymous (participant ID only), no account info collected.

---

## Next Steps for Team

### Testing:
- [ ] Jeongyeon: Test intent parser with various question types
- [ ] Jenny: Test familiarity check and dashboard
- [ ] Justin: Test all slider settings and score displays
- [ ] Alex: Review design on different screen sizes

### Validation:
- [ ] Verify gibberish detection accuracy
- [ ] Check Round 2 questions are truly customized
- [ ] Ensure context is added when appropriate
- [ ] Test database sync across multiple queries

### Documentation:
- [ ] User guide for participants
- [ ] Researcher guide for analyzing data
- [ ] Privacy policy for study
- [ ] Installation video/screenshots

---

## Support

For bugs or questions:
1. Check browser console for error logs
2. Check Supabase dashboard for data issues
3. Review `FEATURES_SUMMARY.md` for detailed explanations
4. Test in incognito mode (clean state)

# JACE Extension - Quick Start (2 Minutes)

## Step 1: Install Extension (30 seconds)

1. **Download the Extension**:
   - Download the JACE extension zip file (**Link: TBD**)
   - Unzip the file to a folder on your computer

2. **Load Extension**:
   - Open Chrome
   - Go to `chrome://extensions/`
   - Toggle ON "Developer mode" (top-right)
   - Click "Load unpacked"
   - Select the unzipped `extension` folder

## Step 2: Setup (30 seconds)

1. Click the JACE extension icon (puzzle piece in toolbar)
2. Go to "Settings" tab (if not already there)
3. Enter your Participant ID (e.g., "P001" or "TEST_001")
4. Click "Save Settings"
5. You should see: "Settings saved! JACE is now active."

## Step 3: Test It (1 minute)

1. Go to **chatgpt.com**
2. Click **"+ New chat"** (must be completely empty)
3. Type: **"How do I build a microservices architecture?"**
4. Try to send (press Enter or click send button)
5. JACE modal should appear! ✅

## If It Doesn't Work

**Open browser console** (Press F12 → Console tab)

Look for these messages:

### ✅ Working:
```
🧠 JACE v5.0 — Chrome Extension
  Platform: ChatGPT
[JACE] Send action detected! click prompt length: 45
[JACE] Proceeding with intervention (complexity score: 8/6)
```

### ❌ Not Working - Check These:

**Message: "Skipped - No consent given. Please open extension popup and set participant ID"**
→ Click extension icon → Settings tab → Enter Participant ID → Click "Save Settings"

**Message: "Skipped - Not first message"**
→ Must be a NEW, EMPTY conversation

**Message: "Skipped - Question too simple (score: 3/6)"**
→ Ask a more complex question OR lower threshold in Settings

**No messages at all**
→ Reload extension: `chrome://extensions/` → Click refresh icon

## Common Issues (30 seconds to fix)

| Problem | Solution |
|---------|----------|
| Nothing happens | Set participant ID in popup |
| Works once then stops | Start NEW conversation each time |
| Skips all questions | Lower "Intent Threshold" in Settings to 4 |
| Extension not in toolbar | Pin it: chrome://extensions/ → Pin icon |

## Understanding JACE Behavior

**JACE Will Appear When**:
- ✓ First message in new conversation
- ✓ Question is complex enough (score ≥ 6/10)
- ✓ You're familiar with the concept (or skip familiarity check)

**JACE Will Skip When**:
- ✗ Already sent a message in this chat
- ✗ Question too simple ("What's 2+2?")
- ✗ You click "Not Really" on familiarity check
- ✗ No participant ID set

## Test Questions

**Should Trigger JACE** (complex):
- "How do I architect a scalable microservices system?"
- "What are the ethical implications of AI in medicine?"
- "How can I optimize my React application's performance?"

**Should Skip JACE** (simple):
- "What's 2+2?"
- "What color is the sky?"
- "Define JavaScript"

## Adjusting Settings

1. Click extension icon
2. Go to "Settings" tab
3. Adjust sliders:
   - **Intent Threshold**: Lower (4-5) to show more often, higher (7-8) to show less
   - **Questions per Round**: How many reflection questions (1-5)
   - **Max Rounds**: How many times to ask (1-3)
4. Click "Save Settings"

## Viewing Your Activity

1. Click extension icon
2. Go to "Dashboard" tab
3. See:
   - Total prompts intercepted
   - Your average reflection score
   - Skip rate
   - Last 10 queries

## Quick Debug (10 seconds)

**In console, run**:
```javascript
// Check if set up
chrome.storage.local.get(['cti_consent_given', 'cti_participant_id'], console.log)
// Should show: { cti_consent_given: true, cti_participant_id: "YOUR_ID" }

// Check current config
chrome.storage.local.get(['cti_config'], console.log)
```

## Getting Help

**Read full troubleshooting**: See `/TROUBLESHOOTING.md` in project root

**Console shows errors**:
1. Copy the error message
2. Check TROUBLESHOOTING.md for that specific error

**Still stuck**:
1. Reload extension: `chrome://extensions/` → refresh icon
2. Clear storage: Run in console: `chrome.storage.local.clear()`
3. Start fresh from Step 1

---

## That's It!

JACE should now intercept your first message on ChatGPT, Claude, Gemini, or Copilot and guide you through reflection questions before sending.

**Remember**: Only works on FIRST message of NEW conversations!

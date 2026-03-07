# JACE Extension - Troubleshooting Guide

## ⚠️ CRITICAL: API Authentication Required

### 0. "API request failed: 403" or "CTI intent analysis error"

**Problem**: The extension cannot communicate with the OpenAI API. This is the **#1 reason** JACE doesn't work.

**Symptoms**:
- Console error: `API request failed: 403`
- Console error: `CTI intent analysis error: Error: API request failed: 403`
- Console error: `CTI question generation error: Error: API request failed: 403`
- Modal appears but shows "Something went wrong"
- JACE starts but never shows reflection questions

**Root Cause**:
The `PROXY_SECRET` is empty in `extension/content-script.js` line 6.

**Solution**:

#### If you're in a research study:
1. **Contact your researcher** to get the `PROXY_SECRET`
2. Open `extension/content-script.js`
3. Line 6: Change `PROXY_SECRET: ""` to `PROXY_SECRET: "your-secret-here"`
4. Save the file
5. Go to `chrome://extensions/`
6. Click the reload icon under JACE
7. Test again

#### If you're running this independently:
You need to set up your own OpenAI API key. See `API_SETUP_REQUIRED.md` for complete instructions. This will cost money (~$0.15 per 1M tokens).

**Verify Fix**:
```javascript
// Open ChatGPT console (F12)
// Try sending a complex question
// You should see: [JACE] Proceeding with intervention
// You should NOT see any 403 errors
```

**Without this fix, JACE CANNOT generate questions or analyze your prompts.**

---

## Problem: JACE Gets Skipped / Doesn't Show Up

If JACE isn't appearing when you type a question, check the browser console (F12 → Console tab) for these messages:

---

### 1. "Skipped - No consent given"

**Problem**: You haven't set up your participant ID yet.

**Solution**:
1. Click the JACE extension icon (puzzle piece in Chrome toolbar)
2. Go to "Settings" tab
3. Enter your Participant ID (e.g., "P001" or "TEST_001")
4. Click "Save Settings"
5. You should see: "Settings saved! JACE is now active."
6. Refresh the ChatGPT/Claude page
7. Start a NEW conversation
8. Try again

**Check**:
```javascript
// In console, run:
chrome.storage.local.get(['cti_consent_given', 'cti_participant_id'], console.log)
// Should show: { cti_consent_given: true, cti_participant_id: "YOUR_ID" }
```

---

### 2. "Skipped - Not first message or already active"

**Problem**: JACE only works on the FIRST message of a NEW conversation.

**Solution**:
1. Go to ChatGPT home page
2. Click "+ New chat" button (top-left)
3. Make sure the chat is completely empty
4. Type your first question
5. Try to send

**Common Mistakes**:
- Typing in an existing conversation ❌
- Already sent one message ❌
- URL still has old chat ID ❌

**Correct State**:
- Fresh new chat ✓
- Empty input field ✓
- URL is just "chatgpt.com" or "chatgpt.com/c/*" with no messages ✓

---

### 3. "Skipped - Question too simple (score: X/6)"

**Problem**: Your question scored below the complexity threshold.

**Examples of Simple Questions** (will be skipped):
- "What's 2+2?"
- "What color is the sky?"
- "Define photosynthesis"
- "What is HTML?"

**Examples of Complex Questions** (will show JACE):
- "How do I architect a scalable microservices system?"
- "What are the ethical implications of AI in healthcare?"
- "How can I optimize my React app's performance?"

**Solutions**:

**Option A**: Ask a more complex question
- Add context: "I'm building X and need to Y"
- Add constraints: "considering Z factors"
- Ask for analysis, not just facts

**Option B**: Lower the threshold
1. Open extension popup
2. Go to Settings tab
3. Move "Intent Threshold" slider to the left (e.g., 4 or 5)
4. Click "Save Settings"
5. Try again

---

### 4. "Skipped - Platform not detected"

**Problem**: You're not on a supported platform or the platform detection failed.

**Supported Platforms**:
- ✅ chatgpt.com
- ✅ chat.openai.com
- ✅ claude.ai
- ✅ gemini.google.com
- ✅ copilot.microsoft.com

**Solution**:
1. Make sure you're on one of the URLs above
2. Check console for: `[JACE] No supported platform detected on [hostname]`
3. If on correct site, try refreshing the page
4. Check the extension is enabled in `chrome://extensions/`

---

### 5. "Skipped - Prompt too short"

**Problem**: Your prompt has less than 5 characters.

**Solution**: Type a longer question (at least 5 characters).

---

### 6. Modal Appears Then Immediately Disappears

**Problem**: Familiarity check or intent analysis might be skipping automatically.

**Check Console For**:
- `[JACE] Skipped - Question too simple (score: X/Y)`
- `familiarity_low` event

**Solution**:
1. If you see familiarity check and click "Not Really", that's expected behavior
2. If questions seem to auto-skip, check your settings
3. Try disabling familiarity check:
   - Popup → Settings → Uncheck related options
   - Or edit `content-script.js` line 14: `FAMILIARITY_CHECK: false`

---

### 7. No Console Logs at All

**Problem**: Extension isn't loading or running.

**Checks**:
1. **Is extension installed?**
   - Go to `chrome://extensions/`
   - Look for "JACE" in the list
   - Make sure toggle is ON (blue)

2. **Are icons present?**
   - Check `extension/icons/` folder
   - Must have: `icon16.png`, `icon48.png`, `icon128.png`
   - If missing, generate them from `extension/icons/generate-icons.html`

3. **Any errors in extension?**
   - Go to `chrome://extensions/`
   - Click "Errors" button under JACE
   - Check for red error messages

4. **Check console on extension page**:
   - Right-click extension icon → "Inspect popup"
   - Check console for errors

5. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click refresh icon (circular arrow) under JACE
   - Refresh ChatGPT page
   - Try again

---

### 8. Extension Loads But Nothing Happens

**Check the init log**:
```
Console should show:
🧠 JACE v5.0 — Chrome Extension
  Platform: ChatGPT
```

**If you see this**, extension is loaded correctly.

**If you don't see this**:
1. Open console (F12)
2. Refresh page
3. Look for any red errors
4. Check that you're on a supported platform

---

### 9. "Send action detected!" But Then Nothing

**Problem**: Event is detected but something fails during processing.

**Look for error messages**:
- "CTI intent analysis error"
- "CTI question generation error"
- "Supabase error"

**Common Causes**:
1. **API proxy down**: Check `CONFIG.PROXY_URL` is accessible
2. **Network issue**: Check internet connection
3. **OpenAI API issue**: Proxy might be rate-limited

**Solution**:
- Wait a few seconds and try again
- Check network tab (F12 → Network) for failed requests
- Verify proxy URL in `content-script.js` line 5

---

## Complete Debugging Checklist

Open browser console (F12) and check:

```
✓ [ ] Extension installed and enabled (chrome://extensions/)
✓ [ ] Icons exist (icon16.png, icon48.png, icon128.png)
✓ [ ] On supported platform (chatgpt.com, claude.ai, etc.)
✓ [ ] Consent given (participant ID set)
✓ [ ] New conversation (empty chat)
✓ [ ] First message attempt (not 2nd, 3rd, etc.)
✓ [ ] Question has 5+ characters
✓ [ ] Console shows: "🧠 JACE v5.0 — Chrome Extension"
✓ [ ] Console shows: "Platform: [ChatGPT/Claude/etc]"
✓ [ ] No red errors in console
✓ [ ] Question complex enough (or threshold lowered)
```

---

## Testing in Clean State

1. **Clear extension storage**:
```javascript
// In console:
chrome.storage.local.clear()
```

2. **Reload extension**:
- `chrome://extensions/` → Click refresh icon

3. **Refresh page**:
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Start fresh**:
- Open extension popup
- Go to Settings tab
- Set participant ID: "TEST_001"
- Click "Save Settings"

5. **Go to ChatGPT**:
- Click "+ New chat"
- Type: "How do I build a scalable web application?"
- Try to send

6. **Watch console**:
```
Expected logs:
[JACE] Send action detected! click prompt length: 45
[JACE] Proceeding with intervention (complexity score: 8/6)
```

---

## Advanced Debugging

### Check State Object
```javascript
// In console on ChatGPT page:
// (Extension content script state)
console.log({
  isFirstMessage: state.isFirstMessage,
  consentGiven: state.consentGiven,
  platform: state.platform?.name,
  participantId: state.participantId
})
```

### Force Show Modal (Test)
```javascript
// In console - bypass all checks
document.body.innerHTML += `<div id="cti-overlay" class="visible"><div id="cti-modal">TEST</div></div>`;
```

### Check Config
```javascript
chrome.storage.local.get(['cti_config'], console.log)
```

### Check Logs
```javascript
chrome.storage.local.get(['cti_logs'], (r) => console.log(r.cti_logs?.slice(-5)))
```

---

## Still Not Working?

### Last Resort Steps:

1. **Completely remove and reinstall**:
   - Go to `chrome://extensions/`
   - Click "Remove" on JACE
   - Close Chrome completely
   - Reopen Chrome
   - Load unpacked again from `extension/` folder
   - Refresh ChatGPT

2. **Test in Incognito Mode**:
   - Open incognito window (Ctrl+Shift+N)
   - Go to `chrome://extensions/`
   - Enable "Allow in incognito" for JACE
   - Try ChatGPT in incognito

3. **Check browser compatibility**:
   - Chrome 120+ required
   - Manifest V3 support needed
   - Some enterprise Chrome configs block extensions

4. **Verify file contents**:
   - Make sure `content-script.js` isn't corrupted
   - Check file size: should be ~36KB
   - Re-download extension files if needed

---

## Common Error Messages & Fixes

| Error | Meaning | Fix |
|-------|---------|-----|
| "No supported platform" | Wrong website | Use ChatGPT/Claude/Gemini/Copilot |
| "No consent given" | Missing participant ID | Set up in extension popup |
| "Not first message" | Already sent messages | Start new conversation |
| "Question too simple" | Complexity score too low | Ask harder question or lower threshold |
| "API call failed" | Network/proxy issue | Check internet, wait and retry |
| "SupabaseClient not available" | Supabase script not loaded | Check manifest.json, reload extension |

---

## Getting Help

If still stuck:

1. **Export your logs**:
   - Open extension popup
   - Dashboard tab → Export Logs
   - Save the JSON file

2. **Get console output**:
   - F12 → Console tab
   - Right-click → Save as...
   - Or copy all text

3. **Take screenshots**:
   - Extension popup (showing settings)
   - Console logs
   - ChatGPT page state

4. **Document exact steps**:
   - What you did
   - What you expected
   - What actually happened

5. **Check these details**:
   - Chrome version: `chrome://version/`
   - Extension version: 5.0.0
   - Operating system
   - Which AI platform (ChatGPT/Claude/etc.)

---

## Quick Fixes Summary

| Symptom | Quick Fix |
|---------|-----------|
| Nothing happens | Set participant ID in popup |
| Works once then stops | Start NEW conversation |
| Skips every question | Lower intent threshold in settings |
| Shows briefly then disappears | Click "Yes" on familiarity check |
| No console logs | Reload extension, refresh page |
| Error messages | Check network, wait, retry |

---

**Last Updated**: 2026-03-05 (with enhanced logging)
**Version**: 5.0.0

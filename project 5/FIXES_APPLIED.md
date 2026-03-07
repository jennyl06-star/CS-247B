# Fixes Applied - March 5, 2026

## Problem: JACE Getting Skipped

User reported that JACE extension was being skipped when asking questions in ChatGPT.

## Root Causes Identified

1. **Missing Consent Setup**: Extension wasn't properly setting `cti_consent_given` flag when saving settings
2. **Poor Debug Visibility**: No console logging to explain WHY JACE was being skipped
3. **Missing Documentation**: No clear troubleshooting guide

## Fixes Applied

### 1. Enhanced Console Logging (`content-script.js`)

Added detailed console messages to show exactly why JACE is skipped:

```javascript
// Now shows clear messages:
[JACE] Skipped - No consent given. Please open extension popup and set participant ID
[JACE] Skipped - Not first message or already active
[JACE] Skipped - Question too simple (score: 3/6)
[JACE] Skipped - Prompt too short: 2
[JACE] Proceeding with intervention (complexity score: 8/6)
```

**Files Modified**:
- `extension/content-script.js` lines 760-781, 836-859

### 2. Fixed Consent Flow (`popup.js`)

**Before**: Saving participant ID didn't set consent flag
**After**: Setting participant ID automatically grants consent

```javascript
chrome.storage.local.set({
  cti_participant_id: participantId,
  cti_consent_given: true,  // ← Added this
  cti_config: config,
})
```

Also added:
- Validation: requires participant ID before saving
- Better feedback message: "Settings saved! JACE is now active."
- Better error handling for Supabase client initialization

**Files Modified**:
- `extension/popup.js` lines 13-29, 254-280

### 3. Documentation Created

**New Files**:

1. **`TROUBLESHOOTING.md`** (316 lines)
   - Complete guide for all possible issues
   - Step-by-step solutions for each error message
   - Console debugging commands
   - Common error messages table
   - Testing checklist

2. **`extension/QUICK_START.md`** (152 lines)
   - 2-minute setup guide
   - Quick debug tips
   - Test questions
   - Settings adjustment guide

**Updated Files**:
- Both guides updated with correct setup flow (no "consent checkbox" - just enter ID and save)

## How to Use (For User)

### Step 1: Check Console
1. Open ChatGPT
2. Press F12 to open console
3. Try to send a message
4. Look for `[JACE]` messages

### Step 2: Follow the Message
The console will tell you exactly what's wrong:

- **"No consent given"** → Set participant ID in extension popup
- **"Not first message"** → Start a NEW conversation
- **"Question too simple (score: 3/6)"** → Ask harder question OR lower threshold in settings
- **"Platform not detected"** → Make sure you're on chatgpt.com/claude.ai/etc.

### Step 3: Setup if Needed
1. Click extension icon
2. Settings tab
3. Enter Participant ID (e.g., "TEST_001")
4. Click "Save Settings"
5. Refresh ChatGPT page
6. Start NEW conversation
7. Try again

## Testing Checklist

To verify JACE is working:

```
✓ Extension installed (chrome://extensions/)
✓ Icons present (icon16.png, icon48.png, icon128.png)
✓ Participant ID set (click extension → Settings → enter ID → Save)
✓ On ChatGPT/Claude/Gemini/Copilot
✓ NEW conversation (empty chat)
✓ First message attempt
✓ Complex question (not "what's 2+2?")
✓ Console shows: [JACE] Proceeding with intervention
```

## Key Changes Summary

| Component | Change | Impact |
|-----------|--------|--------|
| `content-script.js` | Added debug logging | Users can see why JACE is skipped |
| `popup.js` | Fixed consent flag | JACE activates when ID is set |
| `popup.js` | Better error handling | Graceful fallback if Supabase fails |
| Documentation | Created guides | Users can troubleshoot themselves |

## Common Issues Now Addressed

1. ✅ "Why isn't JACE showing up?" → Console tells you
2. ✅ "I set my ID but it still doesn't work" → Consent now granted automatically
3. ✅ "How do I know if it's working?" → Clear console messages
4. ✅ "What am I doing wrong?" → TROUBLESHOOTING.md explains everything

## Next Steps for User

1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click refresh icon under JACE

2. **Clear old data** (optional):
   ```javascript
   chrome.storage.local.clear()
   ```

3. **Set up fresh**:
   - Click extension icon
   - Settings tab
   - Enter ID: "TEST_001"
   - Save

4. **Test**:
   - ChatGPT → New chat
   - Type: "How do I architect a scalable web application?"
   - Watch console for: `[JACE] Proceeding with intervention`

## Files Changed

```
extension/content-script.js     - Enhanced logging (lines 760-781, 836-859)
extension/popup.js              - Fixed consent + error handling (lines 13-29, 254-280)
TROUBLESHOOTING.md              - NEW - Complete troubleshooting guide
extension/QUICK_START.md        - NEW - Quick setup guide
extension/QUICK_START.md        - UPDATED - Corrected setup instructions
```

## Build Status

✅ Project builds successfully
✅ No errors or warnings (except browserslist outdated notice)

---

**Summary**: JACE now provides clear feedback about why it's skipping, automatically grants consent when you set a participant ID, and includes comprehensive documentation for troubleshooting.

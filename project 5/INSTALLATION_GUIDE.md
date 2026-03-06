# JACE Chrome Extension - Complete Installation Guide

This guide will walk you through converting your TamperMonkey script to a Chrome Extension and installing it.

## 📁 Project Structure

Your Chrome Extension files are located in the `extension/` directory:

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content-script.js      # Main intervention logic
├── styles.css            # JACE theme styles
├── popup.html            # Dashboard/settings interface
├── popup.css             # Dashboard styles
├── popup.js              # Dashboard functionality
├── README.md             # Extension documentation
└── icons/                # Extension icons
    ├── generate-icons.html
    └── README.md
```

## 🎨 Step 1: Generate Icons

### Option A: Using the Icon Generator (Recommended)

1. Open `extension/icons/generate-icons.html` in Chrome
2. Right-click each canvas image and select "Save image as..."
3. Save the files as:
   - `icon16.png` (16x16 canvas)
   - `icon48.png` (48x48 canvas)
   - `icon128.png` (128x128 canvas)
4. Save all three files in the `extension/icons/` directory

### Option B: Create Icons Manually

If the generator doesn't work:

1. Create a 128x128 square image with:
   - Background: Green (#20a565)
   - Border radius: ~28px
   - Brain emoji 🧠 centered
2. Export/resize to create:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

## 🔧 Step 2: Configure the Extension (Optional)

### Update API Endpoints

If you have custom API endpoints, edit `extension/content-script.js`:

```javascript
const CONFIG = {
  PROXY_URL: "https://your-proxy-url.workers.dev",  // Your Cloudflare Worker
  PROXY_SECRET: "your-secret-key",                  // Optional secret
  GOOGLE_SHEET_WEBHOOK: "https://script.google.com/...",  // Google Apps Script URL
  // ... other settings
};
```

### Default Settings

The extension comes with these defaults:
- **Questions per Round**: 2
- **Maximum Rounds**: 2
- **Intent Threshold**: 6 (questions scoring below this are skipped)
- **Min Score Round 1**: 7/10
- **Min Score Round 2**: 5/10

These can be changed in the extension popup after installation.

## 🚀 Step 3: Install the Extension

### In Chrome/Edge/Brave:

1. Open your browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`

2. **Enable Developer Mode**
   - Look for a toggle in the top-right corner
   - Turn it ON

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `extension/` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "JACE - Critical Thinking AI Helper" in your extensions list
   - The extension icon (brain) should appear in your toolbar
   - Status should show "Enabled"

### Troubleshooting Installation:

**Error: "Manifest file is missing or unreadable"**
- Ensure you selected the `extension/` folder, not the project root
- Verify `manifest.json` exists in the selected folder

**Error: "Icons not found"**
- Generate the icons following Step 1
- Ensure all three icon files are in `extension/icons/`

**Extension loads but icon is blank**
- The icons are missing or incorrectly named
- Check `extension/icons/` contains: `icon16.png`, `icon48.png`, `icon128.png`

## ✅ Step 4: First-Time Setup

1. **Visit a Supported Platform**
   - Open ChatGPT, Claude, Gemini, or Copilot in a new tab

2. **Consent Modal Will Appear**
   - Read the consent information
   - Enter your Participant ID (provided by your researcher)
   - Check the consent checkbox
   - Click "I Agree — Get Started"

3. **Test the Extension**
   - Start a new conversation
   - Type a complex question (e.g., "How do neural networks work?")
   - Press Enter or click Send
   - JACE should intercept and show reflection questions

## 🎯 Step 5: Configure Settings

1. **Open Settings Panel**
   - Click the JACE brain icon in your toolbar
   - The popup will open showing Dashboard and Settings tabs

2. **Adjust Settings (Settings Tab)**
   - Set your preferred number of questions (1-5)
   - Set maximum rounds (1-3)
   - Adjust intent threshold (1-10)
   - Modify minimum scores for each round
   - Enable/disable context appending and logging

3. **Click "Save Settings"**
   - Your preferences are saved locally
   - Changes take effect immediately

## 📊 Step 6: Using the Dashboard

Click the JACE icon to access:

### Dashboard Tab
- **Statistics**
  - Total prompts intercepted
  - Average evaluation score
  - Skip rate percentage

- **Recent Activity**
  - Last 10 interactions
  - Timestamps and platforms
  - Scores and completion status

- **Data Management**
  - Export all logs as JSON
  - Clear all stored data

## 🧪 Testing the Extension

### Test 1: Simple Question (Should Skip)
1. Open ChatGPT in a new tab
2. Type: "What is 2+2?"
3. Press Enter
4. ✅ Expected: Question should be sent immediately without intervention

### Test 2: Complex Question (Should Trigger)
1. Open a new conversation
2. Type: "Explain quantum entanglement and its implications"
3. Press Enter
4. ✅ Expected: JACE modal appears with reflection questions

### Test 3: Round 2 Triggering
1. Open a new conversation
2. Type a complex question
3. Answer reflection questions poorly (e.g., "idk", one word)
4. Submit
5. ✅ Expected: Round 2 appears with new, adapted questions

### Test 4: Settings Changes
1. Open JACE popup
2. Change "Questions per Round" to 3
3. Save settings
4. Start new conversation with complex question
5. ✅ Expected: Should see 3 questions instead of 2

### Test 5: Dashboard Updates
1. Complete several interactions
2. Open JACE popup → Dashboard
3. ✅ Expected: See updated stats and recent activity

## 🔍 Debugging

### Check Console Logs

1. Open Chrome DevTools (F12 or Ctrl+Shift+I)
2. Go to Console tab
3. Look for messages starting with `[JACE]`

### Common Console Messages

✅ **Good:**
```
🧠 JACE v5.0 — Chrome Extension
  Platform: ChatGPT
[JACE] New conversation — intervention armed
[JACE] Send action detected!
```

❌ **Issues:**
```
[JACE] No supported platform detected
→ Solution: Refresh page, verify platform is supported

API call failed: Failed to fetch
→ Solution: Check PROXY_URL in content-script.js

Failed to load resource: icons/icon48.png
→ Solution: Generate icons following Step 1
```

### View Extension Logs

1. Go to `chrome://extensions/`
2. Find JACE extension
3. Click "Details"
4. Click "Inspect views: service worker"
5. Check Console for background script errors

### Export Debug Data

1. Open JACE popup
2. Go to Dashboard
3. Click "Export Data"
4. Share JSON file with researchers for debugging

## 🔄 Updating the Extension

After making code changes:

1. Go to `chrome://extensions/`
2. Find JACE extension
3. Click the refresh icon (↻) button
4. The extension will reload with your changes

**Note:** You may need to refresh the AI platform page as well.

## 🎓 Features Overview

### Intent Parser ✨ NEW
- Automatically analyzes question complexity
- Skips intervention for simple questions
- Customizable threshold (default: 6/10)

### Adaptive Questions ✨ NEW
- Round 2 questions adapt based on Round 1 answers
- Addresses specific gaps in thinking
- More targeted follow-up questions

### Evaluation Scores ✨ NEW
- See your reflection score (1-10)
- Visual badges (high/medium/low)
- Tracked in dashboard

### Customizable Settings ✨ NEW
- Slider controls for all parameters
- Save preferences per participant
- Immediately effective

### Dashboard ✨ NEW
- View interaction history
- Track statistics over time
- Export data for analysis

## 📋 Supported Platforms

- ✅ ChatGPT (chatgpt.com)
- ✅ OpenAI Chat (chat.openai.com)
- ✅ Claude (claude.ai)
- ✅ Google Gemini (gemini.google.com)
- ✅ Microsoft Copilot (copilot.microsoft.com)

## 🆘 Getting Help

### Extension Not Working?
1. Check icon generation (Step 1)
2. Verify developer mode is enabled
3. Refresh the AI platform page
4. Check browser console for errors

### Questions Not Generating?
1. Verify PROXY_URL is accessible
2. Check internet connection
3. Ensure question complexity > threshold

### Settings Not Saving?
1. Verify Chrome storage permissions
2. Check for console errors
3. Try reinstalling the extension

## 📝 Notes for Researchers

### Data Collection
All interaction data is stored locally in Chrome storage and can be:
- Viewed in the dashboard
- Exported as JSON
- Automatically sent to Google Sheets (if configured)

### Privacy
- Only first message per conversation is intercepted
- No account information is collected
- No browsing history is tracked
- Data stays local unless webhook is configured

### Customization
Researchers can modify:
- Default settings in `content-script.js`
- Number of questions and rounds
- Evaluation thresholds
- System prompts for questions
- UI text and styling

## 🎉 Success!

Once you see the JACE icon in your toolbar and the consent modal appears on AI platforms, you're all set!

The extension will now help users think more critically before using AI chatbots.

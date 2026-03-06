# JACE Chrome Extension - Quick Start Guide

Get your TamperMonkey script running as a Chrome Extension in 5 minutes!

## 📦 What You Have

Your TamperMonkey script has been converted into a full Chrome Extension with:
- ✅ Intent parser (skips simple questions)
- ✅ Dashboard (view history & stats)
- ✅ Customizable settings (sliders for everything)
- ✅ Evaluation scores (see your reflection quality)
- ✅ Adaptive Round 2 (questions based on Round 1)
- ✅ All original features preserved

## 🚀 Installation (3 Steps)

### Step 1: Generate Icons (2 minutes)

1. Open `extension/icons/generate-icons.html` in Chrome
2. Right-click each canvas → Save as:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
3. Save all in `extension/icons/` folder

### Step 2: Load Extension (1 minute)

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Done! 🎉

### Step 3: First Use

1. Visit ChatGPT, Claude, Gemini, or Copilot
2. Consent modal appears
3. Enter your Participant ID
4. Check consent box → Click "I Agree"
5. Start chatting!

## 🎯 Quick Test

1. Open ChatGPT
2. Type: "Explain quantum mechanics"
3. Press Enter
4. See JACE modal with reflection questions ✅

## 📊 View Dashboard

1. Click the 🧠 brain icon in Chrome toolbar
2. See stats, history, and settings
3. Adjust settings with sliders
4. Click "Save Settings"

## 🔧 Default Settings

- Questions per round: **2**
- Maximum rounds: **2**
- Intent threshold: **6** (skips simple questions)
- Round 1 min score: **7/10**
- Round 2 min score: **5/10**

## 📁 File Structure

```
extension/
├── manifest.json          # Config
├── background.js          # API calls
├── content-script.js      # Main logic
├── styles.css            # JACE theme
├── popup.html/css/js     # Dashboard
├── README.md             # Full docs
└── icons/                # Icons
```

## 🆘 Troubleshooting

**Extension not loading?**
- Check icons are generated (Step 1)
- Verify Developer mode is ON
- Select the `extension/` folder, not project root

**Not intercepting prompts?**
- Refresh the AI platform page
- Check question complexity (must be > 6)
- Open console (F12) and look for `[JACE]` logs

**Questions not generating?**
- Check `PROXY_URL` in `content-script.js` line 5
- Verify internet connection
- Check browser console for errors

## 📚 Full Documentation

- **INSTALLATION_GUIDE.md** - Complete step-by-step installation
- **FEATURES_IMPLEMENTED.md** - All features and their status
- **extension/README.md** - Extension-specific documentation

## ✨ What's New vs TamperMonkey

| Feature | TamperMonkey | Chrome Extension |
|---------|--------------|------------------|
| Simple questions | Always intervenes | ✅ Skipped automatically |
| Settings | Hard-coded | ✅ GUI with sliders |
| History | None | ✅ Dashboard with stats |
| Scores | Hidden | ✅ Shown with badges |
| Round 2 | Same questions | ✅ Adaptive questions |
| Installation | Script injection | ✅ One-click load |

## 🎓 For Researchers

**Customize defaults:** Edit `CONFIG` object in `content-script.js` (line 4-17)

**Change prompts:** Edit system prompts in:
- `analyzeIntent()` - Intent analysis
- `generateQuestions()` - Question generation
- `evaluateResponses()` - Response evaluation

**Export data:** Click dashboard → "Export Data" → Get JSON

**Remote logging:** Set `GOOGLE_SHEET_WEBHOOK` URL in config

## 🎉 You're Ready!

The extension is now converting your TamperMonkey script into a professional Chrome Extension with dashboard, settings, and smart intent detection.

**Need help?** Check `INSTALLATION_GUIDE.md` for detailed instructions.

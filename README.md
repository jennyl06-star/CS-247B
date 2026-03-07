# JACE - Critical Thinking AI Helper (Chrome Extension)

A Chrome extension that encourages critical thinking before sending prompts to AI chatbots through personalized reflection questions.

## Features

✅ **Intent Parser** - Automatically skips intervention for simple questions
✅ **Adaptive Questioning** - Round 2 questions adapt based on Round 1 answers
✅ **Evaluation Scores** - See how well you've thought through your question
✅ **Dashboard** - View your usage history and statistics
✅ **Customizable Settings** - Adjust number of questions, rounds, and thresholds
✅ **Multi-Platform** - Works on ChatGPT, Claude, Gemini, and Copilot

## Installation

### Download the Extension

1. Download the JACE extension zip file
   - **Link: TBD**
2. Unzip the file to a folder on your computer

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the unzipped `extension` folder
5. The JACE extension should now appear in your extensions list

## Configuration

### First-Time Setup

1. Visit any supported AI platform (ChatGPT, Claude, Gemini, or Copilot)
2. Click the JACE extension icon in Chrome toolbar
3. Go to Settings tab
4. Enter your Participant ID (e.g., "P001" or "TEST_001")
5. Click "Save Settings"

### Settings Panel

Click the JACE extension icon in your toolbar to open the settings panel:

#### Dashboard Tab
- **Total Prompts**: Number of times you've used JACE
- **Avg Score**: Average evaluation score across all sessions
- **Skip Rate**: Percentage of prompts where intervention was skipped
- **Recent Activity**: View your last 10 interactions with details

#### Settings Tab
- **Questions per Round**: 1-5 questions (default: 2)
- **Maximum Rounds**: 1-3 rounds (default: 2)
- **Intent Threshold**: 1-10 complexity score (default: 6)
  - Questions scoring below this are automatically skipped
- **Min Score Round 1**: Minimum passing score for first round (default: 7/10)
- **Min Score Round 2**: Minimum passing score for second round (default: 5/10)
- **Append Context**: Add your planning context to the final prompt
- **Enable Logging**: Log data for research purposes

## How It Works

### Intent Analysis
When you try to send your first message in a new conversation:
1. JACE analyzes the complexity of your question (1-10 scale)
2. If complexity < threshold (default 6), the question is sent immediately
3. Example simple questions: "What color is the sky?", "What's 2+2?"

### Reflection Process
For complex questions:
1. **Round 1**: Answer personalized reflection questions
2. **Evaluation**: Your responses are scored (1-10)
3. **Round 2** (if needed): Deeper questions based on your Round 1 answers
4. **Approval**: Once sufficient, your enhanced prompt is sent

### Adaptive Questions
- Round 2 questions are dynamically generated based on:
  - Your Round 1 answers
  - Gaps in your understanding
  - Areas needing deeper exploration

## Data Collection

JACE collects the following data for research purposes:
- Original prompts (first message only)
- Reflection questions and answers
- Evaluation scores and feedback
- Skip events and timestamps
- Platform name and participant ID

**Not collected:**
- Conversation history beyond first prompt
- Account information
- Browsing data outside JACE

## Export Data

To export your data:
1. Click the JACE extension icon
2. Go to Dashboard tab
3. Click **Export Data**
4. A JSON file will be downloaded with all your logged activity

## Troubleshooting

### Extension Not Working
- Check that you've enabled the extension at `chrome://extensions/`
- Refresh the AI platform page
- Check browser console for errors (F12 → Console)

### Questions Not Generating
- Check your internet connection
- Refresh the page and try again

### Settings Not Saving
- Check Chrome storage permissions
- Try reopening the extension popup

## Support

For issues or questions about the research study, contact your researcher.

For technical issues with the extension:
- Check browser console logs
- Export and examine your data logs
- Verify all extension files are present

## Version

Current Version: **5.0.0**

## Credits

Developed by: Justin, Jenny, Jeongyeon, Alex
Theme: JACE Brand (Green/Blue calming colors)

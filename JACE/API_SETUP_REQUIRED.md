# API Setup Required

## Critical Issues Found

You're seeing errors because the extension needs API configuration to work. There are two main issues:

### 1. OpenAI API Proxy Authentication (403 Error)

**Error**: `API request failed: 403`

**Problem**: The extension uses a proxy server at `https://cti-proxy.hall-justinanthony.workers.dev` that requires authentication, but the `PROXY_SECRET` is empty.

**Solution**: You need to either:

#### Option A: Get the Proxy Secret (Recommended if this is a research study)
Contact the researcher (Justin Anthony Hall) to get the `PROXY_SECRET` value, then:

1. Open `extension/content-script.js`
2. Find line 6:
   ```javascript
   PROXY_SECRET: "",
   ```
3. Add the secret:
   ```javascript
   PROXY_SECRET: "your-secret-here",
   ```

#### Option B: Use Your Own OpenAI API Key
If you want to use your own OpenAI account:

1. Get an API key from https://platform.openai.com/api-keys
2. Modify `extension/background.js` to use OpenAI directly instead of the proxy
3. Replace the proxy URL with `https://api.openai.com/v1/chat/completions`
4. Add your API key to the headers:
   ```javascript
   headers: {
     "Content-Type": "application/json",
     "Authorization": `Bearer YOUR_API_KEY_HERE`
   }
   ```

**Important**: Option B will cost money based on OpenAI's pricing. The extension uses `gpt-4o-mini` which is relatively cheap (~$0.15 per 1M input tokens).

### 2. Supabase Network Issues (TypeError: Failed to fetch)

**Error**: `TypeError: Failed to fetch` when calling Supabase

**Problem**: The Supabase client in the extension is trying to make requests but they're failing. This could be due to:

1. **CORS issues**: Browser extensions have stricter CORS requirements
2. **Network connectivity**: Check if you can access `https://gzqyuhkikeyaieqijgps.supabase.co` from your browser
3. **RLS policies not applied**: The policies exist in the migration but might not be active

**Solution**:

#### Check Supabase Connection
1. Open browser console (F12)
2. Try accessing Supabase directly:
   ```javascript
   fetch('https://gzqyuhkikeyaieqijgps.supabase.co/rest/v1/', {
     headers: {
       'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cXl1aGtpa2V5YWllcWlqZ3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3OTM3NDUsImV4cCI6MjA1NjM2OTc0NX0.Hf-2UUxYz0nOGn7aYnfQ5hLnKZbZUkQx-BYyvvSQSdw'
     }
   }).then(r => r.json()).then(console.log)
   ```

#### Verify RLS Policies
The database has RLS enabled but the policies might not be active. Run this to check:

```sql
-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('query_history', 'reflection_rounds', 'user_settings');
```

If no policies show up, you need to re-apply the migration or manually create policies.

## Quick Test Without APIs

If you want to test the extension without setting up APIs:

1. **Disable Supabase**: The extension already has fallback to local storage
2. **Disable OpenAI**: Comment out the API calls in `content-script.js`

But this defeats the purpose of the extension since it needs AI to:
- Analyze prompt complexity
- Generate reflection questions
- Evaluate responses

## Recommended Setup Order

1. **Get PROXY_SECRET** from the researcher (fastest option)
2. **Test the extension** on ChatGPT with a complex question
3. **Check if Supabase works** - if not, the local storage fallback will work
4. **Verify data is being logged** - check chrome.storage.local or Supabase dashboard

## Testing Checklist

Once you've added the PROXY_SECRET:

```
✓ Reload extension (chrome://extensions/ → click reload)
✓ Go to ChatGPT (chatgpt.com)
✓ Open console (F12)
✓ Click "+ New chat"
✓ Set participant ID in extension popup if not already set
✓ Type complex question: "How do I architect a scalable microservices system?"
✓ Try to send
✓ Watch console for errors
```

**Expected behavior**:
- `[JACE] Send action detected!` message
- `[JACE] Proceeding with intervention` message
- Modal appears with reflection questions
- No 403 errors in console

**If still seeing 403**:
- PROXY_SECRET is wrong or not set
- Proxy server is down
- Need to use your own OpenAI API key instead

## Support

If you're part of a research study, contact your researcher for the PROXY_SECRET.

If you're trying to run this independently, you'll need to:
1. Set up your own OpenAI API key (costs money)
2. Modify the code to use OpenAI directly instead of the proxy
3. Or set up your own Cloudflare Worker proxy

## Current Configuration

**File**: `extension/content-script.js` line 4-16

```javascript
const CONFIG = {
  PROXY_URL: "https://cti-proxy.hall-justinanthony.workers.dev",
  PROXY_SECRET: "",  // ← NEEDS TO BE FILLED
  GOOGLE_SHEET_WEBHOOK: "https://script.google.com/...",
  MODEL: "gpt-4o-mini",
  MAX_LOOPS: 2,
  NUM_QUESTIONS: 2,
  APPEND_PLANNING_TO_PROMPT: true,
  LOG_DATA: true,
  INTENT_THRESHOLD: 6,
  FAMILIARITY_CHECK: true,
  MIN_SCORE_ROUND_1: 7,
  MIN_SCORE_ROUND_2: 5,
};
```

**What you need**: The value for `PROXY_SECRET`

---

**Bottom line**: The extension cannot work without either:
1. The `PROXY_SECRET` from the researcher, OR
2. Your own OpenAI API key configured

Everything else is set up correctly. The Supabase errors are secondary and won't prevent the extension from working (it will fall back to local storage).

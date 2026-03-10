chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "API_CALL") {
    handleAPICall(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.type === "LOG_TO_SHEET") {
    logToGoogleSheet(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (request.type === "SUPABASE_QUERY") {
    handleSupabaseQuery(request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleAPICall(data) {
  const { systemPrompt, userMessage, jsonMode, config } = data;

  const body = {
    model: config.MODEL,
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const headers = { "Content-Type": "application/json" };
  if (config.PROXY_SECRET) {
    headers["X-CTI-Secret"] = config.PROXY_SECRET;
  }

  try {
    const response = await fetch(config.PROXY_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(responseData.error.message || responseData.error || "Proxy API error");
    }

    const text = responseData.choices?.[0]?.message?.content || "";
    if (!text) {
      throw new Error("Empty response from API");
    }

    return { success: true, data: text };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSupabaseQuery(data) {
  const { url, method, headers, body } = data;
  try {
    const options = { method, headers };
    if (body) options.body = body;
    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) {
      return { success: false, error: `Supabase error ${response.status}: ${text}` };
    }
    return { success: true, data: text ? JSON.parse(text) : null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logToGoogleSheet(data) {
  const { entry, webhookUrl } = data;

  const flat = {
    timestamp: entry.timestamp,
    participantId: entry.participantId,
    platform: entry.platform || "",
    eventType: entry.eventType,
    conversationUrl: entry.conversationUrl || "",
    prompt: entry.prompt || "",
    questions: Array.isArray(entry.questions) ? entry.questions.join(" | ") : (entry.questions || ""),
    answers: Array.isArray(entry.answers) ? entry.answers.join(" | ") : (entry.answers || ""),
    feedback: entry.feedback || "",
    loop: entry.loop !== undefined ? entry.loop : "",
    sufficient: entry.sufficient !== undefined ? entry.sufficient : "",
    evaluationScore: entry.evaluationScore || "",
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flat),
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

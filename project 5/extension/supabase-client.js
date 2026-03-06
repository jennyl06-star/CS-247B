const SUPABASE_CONFIG = {
  url: 'https://gzqyuhkikeyaieqijgps.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cXl1aGtpa2V5YWllcWlqZ3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3OTM3NDUsImV4cCI6MjA1NjM2OTc0NX0.Hf-2UUxYz0nOGn7aYnfQ5hLnKZbZUkQx-BYyvvSQSdw'
};

class SupabaseClient {
  constructor() {
    this.url = SUPABASE_CONFIG.url;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
    };
  }

  async query(table, options = {}) {
    const { select, insert, update, eq, order, limit } = options;

    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();

    if (select) {
      params.append('select', select);
    }

    if (eq) {
      for (const [key, value] of Object.entries(eq)) {
        params.append(key, `eq.${value}`);
      }
    }

    if (order) {
      params.append('order', order);
    }

    if (limit) {
      params.append('limit', limit);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const config = {
      headers: this.headers
    };

    if (insert) {
      config.method = 'POST';
      config.body = JSON.stringify(insert);
    } else if (update) {
      config.method = 'PATCH';
      config.body = JSON.stringify(update);
    } else {
      config.method = 'GET';
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase error: ${error}`);
      }

      if (insert || update) {
        return await response.json();
      }

      return await response.json();
    } catch (error) {
      console.error('[Supabase] Query failed:', error);
      throw error;
    }
  }

  async insertQueryHistory(data) {
    return this.query('query_history', {
      insert: data,
      select: '*'
    });
  }

  async updateQueryHistory(id, updates) {
    return this.query('query_history', {
      update: updates,
      eq: { id }
    });
  }

  async insertReflectionRound(data) {
    return this.query('reflection_rounds', {
      insert: data,
      select: '*'
    });
  }

  async getQueryHistory(participantId, limit = 50) {
    return this.query('query_history', {
      select: '*',
      eq: { participant_id: participantId },
      order: 'created_at.desc',
      limit
    });
  }

  async getReflectionRounds(queryId) {
    return this.query('reflection_rounds', {
      select: '*',
      eq: { query_id: queryId },
      order: 'round_number.asc'
    });
  }

  async getUserSettings(participantId) {
    const results = await this.query('user_settings', {
      select: '*',
      eq: { participant_id: participantId },
      limit: 1
    });
    return results.length > 0 ? results[0] : null;
  }

  async upsertUserSettings(participantId, settings) {
    const existing = await this.getUserSettings(participantId);

    if (existing) {
      return this.query('user_settings', {
        update: { ...settings, updated_at: new Date().toISOString() },
        eq: { participant_id: participantId }
      });
    } else {
      return this.query('user_settings', {
        insert: { participant_id: participantId, ...settings },
        select: '*'
      });
    }
  }

  async getStats(participantId) {
    const history = await this.getQueryHistory(participantId);

    const totalPrompts = history.length;
    const skipped = history.filter(q => q.skipped).length;
    const completed = history.filter(q => q.completed).length;

    const scores = history
      .filter(q => q.final_score !== null)
      .map(q => q.final_score);

    const avgScore = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

    const skipRate = totalPrompts > 0
      ? Math.round((skipped / totalPrompts) * 100)
      : 0;

    return {
      totalPrompts,
      skipped,
      completed,
      avgScore,
      skipRate,
      history
    };
  }
}

if (typeof window !== 'undefined') {
  window.SupabaseClient = SupabaseClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseClient;
}

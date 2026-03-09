/*
  # JACE Extension Database Schema

  1. New Tables
    - `query_history`
      - `id` (uuid, primary key) - Unique identifier for each query session
      - `user_id` (uuid) - User identifier (participant ID as uuid)
      - `participant_id` (text) - Original participant ID string
      - `platform` (text) - AI platform used (ChatGPT, Claude, etc.)
      - `original_prompt` (text) - The user's original query
      - `enhanced_prompt` (text, nullable) - Final prompt sent to AI with context
      - `complexity_score` (integer) - Intent analysis score (1-10)
      - `intent_reasoning` (text, nullable) - Reasoning for complexity score
      - `skipped` (boolean, default false) - Whether user skipped intervention
      - `completed` (boolean, default false) - Whether user completed all rounds
      - `total_rounds` (integer, default 0) - Number of reflection rounds
      - `final_score` (integer, nullable) - Final evaluation score
      - `conversation_url` (text, nullable) - URL of the conversation
      - `created_at` (timestamptz, default now()) - Timestamp of query
      
    - `reflection_rounds`
      - `id` (uuid, primary key) - Unique identifier for each round
      - `query_id` (uuid, foreign key) - References query_history
      - `round_number` (integer) - Round number (0-based)
      - `questions` (jsonb) - Array of reflection questions
      - `answers` (jsonb) - Array of user answers
      - `evaluation_score` (integer) - Score for this round (1-10)
      - `evaluation_feedback` (text, nullable) - Feedback from evaluation
      - `sufficient` (boolean) - Whether responses were sufficient
      - `created_at` (timestamptz, default now())
      
    - `user_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `participant_id` (text, unique) - Participant ID
      - `num_questions` (integer, default 2) - Questions per round
      - `max_rounds` (integer, default 2) - Maximum reflection rounds
      - `intent_threshold` (integer, default 6) - Minimum complexity score
      - `min_score_round_1` (integer, default 7) - Min passing score for round 1
      - `min_score_round_2` (integer, default 5) - Min passing score for round 2
      - `append_context` (boolean, default true) - Append planning to prompt
      - `log_data` (boolean, default true) - Enable data logging
      - `updated_at` (timestamptz, default now())
      - `created_at` (timestamptz, default now())
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create query_history table
CREATE TABLE IF NOT EXISTS query_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  participant_id text NOT NULL,
  platform text NOT NULL,
  original_prompt text NOT NULL,
  enhanced_prompt text,
  complexity_score integer,
  intent_reasoning text,
  skipped boolean DEFAULT false,
  completed boolean DEFAULT false,
  total_rounds integer DEFAULT 0,
  final_score integer,
  conversation_url text,
  created_at timestamptz DEFAULT now()
);

-- Create reflection_rounds table
CREATE TABLE IF NOT EXISTS reflection_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES query_history(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL,
  evaluation_score integer NOT NULL,
  evaluation_feedback text,
  sufficient boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id text UNIQUE NOT NULL,
  num_questions integer DEFAULT 2,
  max_rounds integer DEFAULT 2,
  intent_threshold integer DEFAULT 6,
  min_score_round_1 integer DEFAULT 7,
  min_score_round_2 integer DEFAULT 5,
  append_context boolean DEFAULT true,
  log_data boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for query_history (allow public access for research study)
CREATE POLICY "Anyone can insert query history"
  ON query_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view query history"
  ON query_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own query history"
  ON query_history FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for reflection_rounds (allow public access for research study)
CREATE POLICY "Anyone can insert reflection rounds"
  ON reflection_rounds FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view reflection rounds"
  ON reflection_rounds FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policies for user_settings (allow public access for research study)
CREATE POLICY "Anyone can insert user settings"
  ON user_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view user settings"
  ON user_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update user settings"
  ON user_settings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_query_history_participant ON query_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_query_history_created ON query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflection_rounds_query ON reflection_rounds(query_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_participant ON user_settings(participant_id);

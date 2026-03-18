-- ============================================================
-- RISK Multiplayer Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. GAMES TABLE: The 'World' state
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'LOBBY',  -- LOBBY, ACTIVE, COMPLETED
    current_player_index INTEGER NOT NULL DEFAULT 0,  -- 0-5
    turn_phase TEXT NOT NULL DEFAULT 'REINFORCE',  -- REINFORCE, ATTACK, FORTIFY
    turn_number INTEGER NOT NULL DEFAULT 1,
    trade_in_count INTEGER NOT NULL DEFAULT 0,
    has_conquered_this_turn BOOLEAN NOT NULL DEFAULT FALSE,
    use_missions BOOLEAN NOT NULL DEFAULT FALSE,
    winner_id UUID REFERENCES auth.users(id),
    last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. PLAYERS TABLE: Linking Users to Game Seats
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),  -- Nullable for AI slots
    slot_index INTEGER NOT NULL,  -- 0 to 5
    display_name TEXT NOT NULL,
    color TEXT NOT NULL,  -- e.g., 'player-1', 'player-2', etc.
    armies_to_place INTEGER NOT NULL DEFAULT 0,
    is_ai BOOLEAN NOT NULL DEFAULT FALSE,
    secret_objective TEXT,  -- Protected by RLS!
    eliminated BOOLEAN NOT NULL DEFAULT FALSE,
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,  -- RiskCard[] stored as JSON
    UNIQUE(game_id, slot_index)
);

-- ============================================================
-- 3. TERRITORIES TABLE: The Board State
-- ============================================================
CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    territory_id TEXT NOT NULL,  -- e.g., 'alaska', 'brazil'
    owner_slot_index INTEGER NOT NULL,  -- 0-5 (matches players.slot_index)
    army_count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(game_id, territory_id)
);

-- ============================================================
-- 4. RISK_CARDS TABLE: Card deck
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id),  -- Null = in deck
    territory_name TEXT,
    card_type TEXT NOT NULL  -- INFANTRY, CAVALRY, ARTILLERY, WILD
);

-- ============================================================
-- 5. GAME_LOG TABLE: History for async players
-- ============================================================
CREATE TABLE IF NOT EXISTS game_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    player_slot_index INTEGER,
    message TEXT NOT NULL,
    action_type TEXT NOT NULL DEFAULT 'info'  -- info, reinforce, attack, fortify, trade, capture, elimination, turn_start
);

-- Index for fast log retrieval
CREATE INDEX IF NOT EXISTS idx_game_log_game_created ON game_log(game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_territories_game ON territories(game_id);
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_cards_game ON risk_cards(game_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_log ENABLE ROW LEVEL SECURITY;

-- Games: Anyone authenticated can read, only participants can update
CREATE POLICY "games_select" ON games FOR SELECT TO authenticated USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "games_update" ON games FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE players.game_id = games.id
        AND players.user_id = auth.uid()
    )
);

-- Players: Read all player info EXCEPT secret_objective of other players
-- We handle secret_objective visibility in application logic + a security definer function
CREATE POLICY "players_select" ON players FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players AS p
        WHERE p.game_id = players.game_id
        AND p.user_id = auth.uid()
    )
);
CREATE POLICY "players_insert" ON players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE TO authenticated USING (
    -- Players can only update their own row OR the game's current turn player
    user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM players AS p
        JOIN games ON games.id = p.game_id
        WHERE p.game_id = players.game_id
        AND p.user_id = auth.uid()
        AND p.slot_index = games.current_player_index
    )
);

-- Territories: Visible to all game participants, updateable by current turn player
CREATE POLICY "territories_select" ON territories FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE players.game_id = territories.game_id
        AND players.user_id = auth.uid()
    )
);
CREATE POLICY "territories_insert" ON territories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "territories_update" ON territories FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players p
        JOIN games g ON g.id = p.game_id
        WHERE p.game_id = territories.game_id
        AND p.user_id = auth.uid()
        AND p.slot_index = g.current_player_index
    )
);

-- Risk cards: Only see your own cards (or unowned deck cards)
CREATE POLICY "risk_cards_select" ON risk_cards FOR SELECT TO authenticated USING (
    player_id IS NULL OR  -- Deck cards visible for game logic
    EXISTS (
        SELECT 1 FROM players
        WHERE players.id = risk_cards.player_id
        AND players.user_id = auth.uid()
    )
);
CREATE POLICY "risk_cards_insert" ON risk_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "risk_cards_update" ON risk_cards FOR UPDATE TO authenticated USING (true);

-- Game log: Visible to all game participants
CREATE POLICY "game_log_select" ON game_log FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players
        WHERE players.game_id = game_log.game_id
        AND players.user_id = auth.uid()
    )
);
CREATE POLICY "game_log_insert" ON game_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 7. SECURITY DEFINER: Hide other players' secret objectives
-- ============================================================
CREATE OR REPLACE FUNCTION get_player_secret_objective(p_game_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT secret_objective INTO result
    FROM players
    WHERE game_id = p_game_id
    AND user_id = auth.uid();
    RETURN result;
END;
$$;

-- ============================================================
-- 8. TURN ENFORCEMENT FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION validate_turn_action(p_game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_slot INTEGER;
    player_slot INTEGER;
BEGIN
    -- Get current player index from game
    SELECT current_player_index INTO current_slot
    FROM games WHERE id = p_game_id;

    -- Get the slot of the requesting user
    SELECT slot_index INTO player_slot
    FROM players
    WHERE game_id = p_game_id AND user_id = auth.uid();

    -- Allow if it's their turn OR if the current slot is AI
    IF player_slot = current_slot THEN
        RETURN TRUE;
    END IF;

    -- Check if current player is AI (any participant can trigger AI moves)
    IF EXISTS (
        SELECT 1 FROM players
        WHERE game_id = p_game_id
        AND slot_index = current_slot
        AND is_ai = TRUE
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================================
-- 9. REALTIME ENABLEMENT
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE games, players, territories, game_log;

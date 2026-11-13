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
    host_user_id UUID REFERENCES auth.users(id),
    winner_id UUID REFERENCES auth.users(id),
    winner_slot_index INTEGER,
    last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_slot_index INTEGER;

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
    eliminated BOOLEAN NOT NULL DEFAULT FALSE,
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,  -- RiskCard[] stored as JSON
    UNIQUE(game_id, slot_index)
);

-- ============================================================
-- 2b. GAME_MISSIONS TABLE: Private mission assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS game_missions (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    mission JSONB NOT NULL,
    PRIMARY KEY (game_id, slot_index)
);

-- Migrate mission assignments written by older app versions before removing
-- the publicly-readable players.secret_objective column.
ALTER TABLE players ADD COLUMN IF NOT EXISTS secret_objective TEXT;

WITH legacy_missions AS (
    SELECT
        p.game_id,
        p.slot_index,
        CASE p.secret_objective
            WHEN 'Conquer North America and Africa.' THEN
                jsonb_build_object('id', 'mission-na-africa', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('north-america', 'africa'))
            WHEN 'Conquer North America and Australia.' THEN
                jsonb_build_object('id', 'mission-na-australia', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('north-america', 'australia'))
            WHEN 'Conquer Asia and South America.' THEN
                jsonb_build_object('id', 'mission-asia-sa', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('asia', 'south-america'))
            WHEN 'Conquer Asia and Africa.' THEN
                jsonb_build_object('id', 'mission-asia-africa', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('asia', 'africa'))
            WHEN 'Conquer Europe, South America, and a third continent of your choice.' THEN
                jsonb_build_object('id', 'mission-europe-sa-third', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('europe', 'south-america'))
            WHEN 'Conquer Europe, Australia, and a third continent of your choice.' THEN
                jsonb_build_object('id', 'mission-europe-australia-third', 'type', 'conquer_continents', 'description', p.secret_objective, 'continents', jsonb_build_array('europe', 'australia'))
            WHEN 'Conquer 24 territories.' THEN
                jsonb_build_object('id', 'mission-24-territories', 'type', 'conquer_territories', 'description', p.secret_objective, 'territoryCount', 24)
            WHEN 'Conquer 18 territories with at least 2 armies each.' THEN
                jsonb_build_object('id', 'mission-18-territories-2', 'type', 'conquer_territories', 'description', p.secret_objective, 'territoryCount', 18, 'minArmiesPerTerritory', 2)
            WHEN 'Destroy all armies of Red Empire.' THEN
                jsonb_build_object('id', 'destroy-0', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 0)
            WHEN 'Destroy all armies of Yellow Republic.' THEN
                jsonb_build_object('id', 'destroy-1', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 1)
            WHEN 'Destroy all armies of Green Alliance.' THEN
                jsonb_build_object('id', 'destroy-2', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 2)
            WHEN 'Destroy all armies of Blue Legion.' THEN
                jsonb_build_object('id', 'destroy-3', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 3)
            WHEN 'Destroy all armies of Black Order.' THEN
                jsonb_build_object('id', 'destroy-4', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 4)
            WHEN 'Destroy all armies of Pink Phalanx.' THEN
                jsonb_build_object('id', 'destroy-5', 'type', 'destroy_player', 'description', p.secret_objective, 'targetPlayerIndex', 5)
        END AS mission
    FROM players p
    JOIN games g ON g.id = p.game_id
    WHERE g.use_missions = TRUE
      AND g.status IN ('ACTIVE', 'COMPLETED')
      AND p.secret_objective IS NOT NULL
)
INSERT INTO game_missions (game_id, slot_index, mission)
SELECT game_id, slot_index, mission
FROM legacy_missions
WHERE mission IS NOT NULL
ON CONFLICT (game_id, slot_index) DO NOTHING;

ALTER TABLE players DROP COLUMN IF EXISTS secret_objective;
DROP FUNCTION IF EXISTS get_player_secret_objective(UUID);

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
ALTER TABLE game_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_log ENABLE ROW LEVEL SECURITY;

-- Keep this schema script safe to re-apply when upgrading a project.
DROP POLICY IF EXISTS "games_select" ON games;
DROP POLICY IF EXISTS "games_insert" ON games;
DROP POLICY IF EXISTS "games_update" ON games;
DROP POLICY IF EXISTS "players_select" ON players;
DROP POLICY IF EXISTS "players_insert" ON players;
DROP POLICY IF EXISTS "players_update" ON players;
DROP POLICY IF EXISTS "game_missions_select" ON game_missions;
DROP POLICY IF EXISTS "territories_select" ON territories;
DROP POLICY IF EXISTS "territories_insert" ON territories;
DROP POLICY IF EXISTS "territories_update" ON territories;
DROP POLICY IF EXISTS "risk_cards_select" ON risk_cards;
DROP POLICY IF EXISTS "risk_cards_insert" ON risk_cards;
DROP POLICY IF EXISTS "risk_cards_update" ON risk_cards;
DROP POLICY IF EXISTS "game_log_select" ON game_log;
DROP POLICY IF EXISTS "game_log_insert" ON game_log;

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

-- Players: All authenticated users can read player rows.
-- Note: self-referential EXISTS queries on the same table cause infinite recursion in Postgres RLS.
CREATE POLICY "players_select" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT TO authenticated WITH CHECK (true);
-- Allow a user to update their own row, or any row in a game where it is currently that user's turn
-- (needed so the host can drive AI turns). Uses games table directly to avoid self-reference.
CREATE POLICY "players_update" ON players FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
    OR user_id IS NULL  -- AI slots: any participant can update
    OR EXISTS (
        SELECT 1 FROM games
        WHERE games.id = players.game_id
        AND games.current_player_index = players.slot_index
    )
);

CREATE POLICY "game_missions_select" ON game_missions FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM players p
        WHERE p.game_id = game_missions.game_id
        AND p.slot_index = game_missions.slot_index
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM players p
        JOIN games g ON g.id = p.game_id
        WHERE p.game_id = game_missions.game_id
        AND p.slot_index = game_missions.slot_index
        AND p.is_ai = TRUE
        AND g.host_user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM games g
        JOIN players participant ON participant.game_id = g.id
        WHERE g.id = game_missions.game_id
        AND g.status = 'COMPLETED'
        AND participant.user_id = auth.uid()
    )
);
REVOKE ALL ON game_missions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON game_missions TO authenticated;

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
-- 7. SECURITY DEFINER: Deal and selectively disclose missions
-- ============================================================
CREATE OR REPLACE FUNCTION deal_game_missions(p_game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    mission_pool JSONB[];
    selected_mission JSONB;
    player_slot INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM games
        WHERE id = p_game_id
        AND host_user_id = auth.uid()
        AND status = 'LOBBY'
        AND use_missions = TRUE
    ) THEN
        RAISE EXCEPTION 'Only the host can deal missions for a mission game in the lobby';
    END IF;

    IF (SELECT count(*) FROM players WHERE game_id = p_game_id) <> 6 THEN
        RAISE EXCEPTION 'A game must have six players before missions are dealt';
    END IF;

    SELECT array_agg(mission ORDER BY random())
    INTO mission_pool
    FROM unnest(ARRAY[
        '{"id":"mission-na-africa","type":"conquer_continents","description":"Conquer North America and Africa.","continents":["north-america","africa"]}'::jsonb,
        '{"id":"mission-na-australia","type":"conquer_continents","description":"Conquer North America and Australia.","continents":["north-america","australia"]}'::jsonb,
        '{"id":"mission-asia-sa","type":"conquer_continents","description":"Conquer Asia and South America.","continents":["asia","south-america"]}'::jsonb,
        '{"id":"mission-asia-africa","type":"conquer_continents","description":"Conquer Asia and Africa.","continents":["asia","africa"]}'::jsonb,
        '{"id":"mission-europe-sa-third","type":"conquer_continents","description":"Conquer Europe, South America, and a third continent of your choice.","continents":["europe","south-america"]}'::jsonb,
        '{"id":"mission-europe-australia-third","type":"conquer_continents","description":"Conquer Europe, Australia, and a third continent of your choice.","continents":["europe","australia"]}'::jsonb,
        '{"id":"mission-24-territories","type":"conquer_territories","description":"Conquer 24 territories.","territoryCount":24}'::jsonb,
        '{"id":"mission-18-territories-2","type":"conquer_territories","description":"Conquer 18 territories with at least 2 armies each.","territoryCount":18,"minArmiesPerTerritory":2}'::jsonb,
        '{"id":"destroy-0","type":"destroy_player","description":"Destroy all armies of Red Empire.","targetPlayerIndex":0}'::jsonb,
        '{"id":"destroy-1","type":"destroy_player","description":"Destroy all armies of Yellow Republic.","targetPlayerIndex":1}'::jsonb,
        '{"id":"destroy-2","type":"destroy_player","description":"Destroy all armies of Green Alliance.","targetPlayerIndex":2}'::jsonb,
        '{"id":"destroy-3","type":"destroy_player","description":"Destroy all armies of Blue Legion.","targetPlayerIndex":3}'::jsonb,
        '{"id":"destroy-4","type":"destroy_player","description":"Destroy all armies of Black Order.","targetPlayerIndex":4}'::jsonb,
        '{"id":"destroy-5","type":"destroy_player","description":"Destroy all armies of Pink Phalanx.","targetPlayerIndex":5}'::jsonb
    ]) AS missions(mission);

    DELETE FROM game_missions WHERE game_id = p_game_id;

    FOR player_slot IN 0..5 LOOP
        SELECT mission
        INTO selected_mission
        FROM unnest(mission_pool) AS candidates(mission)
        WHERE mission->>'type' <> 'destroy_player'
           OR (mission->>'targetPlayerIndex')::INTEGER <> player_slot
        ORDER BY random()
        LIMIT 1;

        IF selected_mission IS NULL THEN
            RAISE EXCEPTION 'Unable to assign a valid mission to player %', player_slot;
        END IF;

        INSERT INTO game_missions (game_id, slot_index, mission)
        VALUES (p_game_id, player_slot, selected_mission);

        mission_pool := array_remove(mission_pool, selected_mission);
        selected_mission := NULL;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_game_missions(p_game_id UUID)
RETURNS TABLE(slot_index INTEGER, mission JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM players
        WHERE game_id = p_game_id
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are not a participant in this game';
    END IF;

    RETURN QUERY
    SELECT gm.slot_index, gm.mission
    FROM game_missions gm
    JOIN games g ON g.id = gm.game_id
    JOIN players p ON p.game_id = gm.game_id AND p.slot_index = gm.slot_index
    WHERE gm.game_id = p_game_id
    AND (
        p.user_id = auth.uid()
        OR (p.is_ai = TRUE AND g.host_user_id = auth.uid())
        OR g.status = 'COMPLETED'
    )
    ORDER BY gm.slot_index;
END;
$$;

CREATE OR REPLACE FUNCTION get_destroy_mission_winner(p_game_id UUID, p_target_slot INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    winner_slot INTEGER;
    game_status TEXT;
    current_slot INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM players
        WHERE game_id = p_game_id
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'You are not a participant in this game';
    END IF;

    SELECT status, current_player_index
    INTO game_status, current_slot
    FROM games
    WHERE id = p_game_id;

    IF game_status <> 'ACTIVE' OR NOT (
        EXISTS (
            SELECT 1 FROM players
            WHERE game_id = p_game_id
            AND slot_index = current_slot
            AND user_id = auth.uid()
        )
        OR (
            EXISTS (
                SELECT 1 FROM players
                WHERE game_id = p_game_id
                AND slot_index = current_slot
                AND is_ai = TRUE
            )
            AND EXISTS (
                SELECT 1 FROM games
                WHERE id = p_game_id
                AND host_user_id = auth.uid()
            )
        )
    ) THEN
        RAISE EXCEPTION 'Only the current player or host may evaluate a mission win';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM players
        WHERE game_id = p_game_id
        AND slot_index = p_target_slot
        AND eliminated = TRUE
    ) THEN
        RETURN NULL;
    END IF;

    SELECT gm.slot_index
    INTO winner_slot
    FROM game_missions gm
    JOIN players claimant ON claimant.game_id = gm.game_id AND claimant.slot_index = gm.slot_index
    WHERE gm.game_id = p_game_id
    AND gm.mission->>'type' = 'destroy_player'
    AND (gm.mission->>'targetPlayerIndex')::INTEGER = p_target_slot
    AND claimant.eliminated = FALSE
    LIMIT 1;

    RETURN winner_slot;
END;
$$;

REVOKE ALL ON FUNCTION deal_game_missions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_game_missions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_destroy_mission_winner(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deal_game_missions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_game_missions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_destroy_mission_winner(UUID, INTEGER) TO authenticated;

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
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['games', 'players', 'territories', 'game_log'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = table_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
        END IF;
    END LOOP;
END;
$$;

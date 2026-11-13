export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          created_at: string;
          status: string;
          current_player_index: number;
          turn_phase: string;
          turn_number: number;
          trade_in_count: number;
          has_conquered_this_turn: boolean;
          use_missions: boolean;
          host_user_id: string | null;
          winner_id: string | null;
          winner_slot_index: number | null;
          last_move_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          status?: string;
          current_player_index?: number;
          turn_phase?: string;
          turn_number?: number;
          trade_in_count?: number;
          has_conquered_this_turn?: boolean;
          use_missions?: boolean;
          host_user_id?: string | null;
          winner_id?: string | null;
          winner_slot_index?: number | null;
          last_move_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          status?: string;
          current_player_index?: number;
          turn_phase?: string;
          turn_number?: number;
          trade_in_count?: number;
          has_conquered_this_turn?: boolean;
          use_missions?: boolean;
          host_user_id?: string | null;
          winner_id?: string | null;
          winner_slot_index?: number | null;
          last_move_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string | null;
          slot_index: number;
          display_name: string;
          color: string;
          armies_to_place: number;
          is_ai: boolean;
          eliminated: boolean;
          cards: Json;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id?: string | null;
          slot_index: number;
          display_name: string;
          color: string;
          armies_to_place?: number;
          is_ai?: boolean;
          eliminated?: boolean;
          cards?: Json;
        };
        Update: {
          id?: string;
          game_id?: string;
          user_id?: string | null;
          slot_index?: number;
          display_name?: string;
          color?: string;
          armies_to_place?: number;
          is_ai?: boolean;
          eliminated?: boolean;
          cards?: Json;
        };
        Relationships: [{
          foreignKeyName: "players_game_id_fkey";
          columns: ["game_id"];
          isOneToOne: false;
          referencedRelation: "games";
          referencedColumns: ["id"];
        }];
      };
      game_missions: {
        Row: {
          game_id: string;
          slot_index: number;
          mission: Json;
        };
        Insert: {
          game_id: string;
          slot_index: number;
          mission: Json;
        };
        Update: {
          game_id?: string;
          slot_index?: number;
          mission?: Json;
        };
        Relationships: [];
      };
      territories: {
        Row: {
          id: string;
          game_id: string;
          territory_id: string;
          owner_slot_index: number;
          army_count: number;
        };
        Insert: {
          id?: string;
          game_id: string;
          territory_id: string;
          owner_slot_index: number;
          army_count?: number;
        };
        Update: {
          id?: string;
          game_id?: string;
          territory_id?: string;
          owner_slot_index?: number;
          army_count?: number;
        };
        Relationships: [];
      };
      risk_cards: {
        Row: {
          id: string;
          game_id: string;
          player_id: string | null;
          territory_name: string | null;
          card_type: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id?: string | null;
          territory_name?: string | null;
          card_type: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string | null;
          territory_name?: string | null;
          card_type?: string;
        };
        Relationships: [];
      };
      game_log: {
        Row: {
          id: string;
          game_id: string;
          created_at: string;
          player_slot_index: number | null;
          message: string;
          action_type: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          created_at?: string;
          player_slot_index?: number | null;
          message: string;
          action_type: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          created_at?: string;
          player_slot_index?: number | null;
          message?: string;
          action_type?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      deal_game_missions: {
        Args: { p_game_id: string };
        Returns: undefined;
      };
      get_game_missions: {
        Args: { p_game_id: string };
        Returns: { slot_index: number; mission: Json }[];
      };
      get_destroy_mission_winner: {
        Args: { p_game_id: string; p_target_slot: number };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}

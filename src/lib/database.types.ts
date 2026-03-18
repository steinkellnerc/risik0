export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
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
          winner_id: string | null;
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
          winner_id?: string | null;
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
          winner_id?: string | null;
          last_move_at?: string;
        };
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
          secret_objective: string | null;
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
          secret_objective?: string | null;
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
          secret_objective?: string | null;
          eliminated?: boolean;
          cards?: Json;
        };
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

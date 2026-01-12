export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_user_actions: {
        Row: {
          action: string | null
          created_at: string | null
          id: number
          target_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: number
          target_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: number
          target_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bans: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_message_reads: {
        Row: {
          id: number
          message_id: number
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: number
          message_id: number
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: number
          message_id?: number
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string | null
          id: number
          is_read: boolean | null
          room_id: number | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          room_id?: number | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          room_id?: number | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: number
          joined_at: string | null
          room_id: number | null
          user_id: string | null
        }
        Insert: {
          id?: number
          joined_at?: string | null
          room_id?: number | null
          user_id?: string | null
        }
        Update: {
          id?: number
          joined_at?: string | null
          room_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          id: number
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          type?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
          source: string | null
          stacktrace: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
          source?: string | null
          stacktrace?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
          source?: string | null
          stacktrace?: string | null
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: number
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string | null
          id: number
          receiver_id: string | null
          sender_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          id: number
          status: string | null
          user_a: string | null
          user_b: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          status?: string | null
          user_a?: string | null
          user_b?: string | null
        }
        Relationships: []
      }
      game_start_logs: {
        Row: {
          actor_id: string
          context_id: string
          context_type: string
          created_at: string
          game_id: string | null
          game_name: string | null
          id: number
        }
        Insert: {
          actor_id: string
          context_id: string
          context_type: string
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: number
        }
        Update: {
          actor_id?: string
          context_id?: string
          context_type?: string
          created_at?: string
          game_id?: string | null
          game_name?: string | null
          id?: number
        }
        Relationships: []
      }
      match_exposure_log: {
        Row: {
          context: string | null
          exposed_at: string | null
          id: number
          target_id: string
          viewer_id: string
        }
        Insert: {
          context?: string | null
          exposed_at?: string | null
          id?: number
          target_id: string
          viewer_id: string
        }
        Update: {
          context?: string | null
          exposed_at?: string | null
          id?: number
          target_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      match_filters: {
        Row: {
          age_range: string | null
          id: number
          mode: string | null
          preferred_genre: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          id?: number
          mode?: string | null
          preferred_genre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          id?: number
          mode?: string | null
          preferred_genre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      match_recent_views: {
        Row: {
          id: number
          target_user_id: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: number
          target_user_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: number
          target_user_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      match_results_cache: {
        Row: {
          computed_at: string | null
          context: string
          reasons: Json
          score: number
          tags: Json
          target_id: string
          viewer_id: string
        }
        Insert: {
          computed_at?: string | null
          context?: string
          reasons: Json
          score: number
          tags: Json
          target_id: string
          viewer_id: string
        }
        Update: {
          computed_at?: string | null
          context?: string
          reasons?: Json
          score?: number
          tags?: Json
          target_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      match_scores: {
        Row: {
          calculated_at: string | null
          id: number
          similarity_score: number | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          calculated_at?: string | null
          id?: number
          similarity_score?: number | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          calculated_at?: string | null
          id?: number
          similarity_score?: number | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: number
          is_read: boolean | null
          message: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          is_read?: boolean | null
          message?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      party_activity_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: number
          post_id: number | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: number
          post_id?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: number
          post_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_activity_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "party_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      party_members: {
        Row: {
          id: number
          joined_at: string | null
          post_id: number | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          joined_at?: string | null
          post_id?: number | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          joined_at?: string | null
          post_id?: number | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_members_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "party_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      party_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: number
          post_id: number | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: number
          post_id?: number | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: number
          post_id?: number | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "party_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      party_posts: {
        Row: {
          control_level: string
          created_at: string
          creator_id: string
          description: string
          difficulty: string
          game_title: string
          id: number
          max_members: number
          party_title: string
          start_date: string
          start_time: string
          tags: Json | null
          voice_chat: string | null
        }
        Insert: {
          control_level: string
          created_at?: string
          creator_id?: string
          description: string
          difficulty: string
          game_title: string
          id?: number
          max_members: number
          party_title: string
          start_date: string
          start_time: string
          tags?: Json | null
          voice_chat?: string | null
        }
        Update: {
          control_level?: string
          created_at?: string
          creator_id?: string
          description?: string
          difficulty?: string
          game_title?: string
          id?: number
          max_members?: number
          party_title?: string
          start_date?: string
          start_time?: string
          tags?: Json | null
          voice_chat?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: number
          platform: string | null
          token: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          platform?: string | null
          token?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          platform?: string | null
          token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: number
          reviewer_id: string | null
          score_communication: number | null
          score_manner: number | null
          score_teamwork: number | null
          target_user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: number
          reviewer_id?: string | null
          score_communication?: number | null
          score_manner?: number | null
          score_teamwork?: number | null
          target_user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: number
          reviewer_id?: string | null
          score_communication?: number | null
          score_manner?: number | null
          score_teamwork?: number | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      steam_game_info: {
        Row: {
          app_id: number
          categories: Json[] | null
          created_at: string | null
          genres: string[] | null
          header_image: string | null
          name: string | null
          short_description: string | null
        }
        Insert: {
          app_id: number
          categories?: Json[] | null
          created_at?: string | null
          genres?: string[] | null
          header_image?: string | null
          name?: string | null
          short_description?: string | null
        }
        Update: {
          app_id?: number
          categories?: Json[] | null
          created_at?: string | null
          genres?: string[] | null
          header_image?: string | null
          name?: string | null
          short_description?: string | null
        }
        Relationships: []
      }
      steam_game_sync_logs: {
        Row: {
          app_id: number | null
          created_at: string | null
          id: number
          reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          app_id?: number | null
          created_at?: string | null
          id?: never
          reason?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          app_id?: number | null
          created_at?: string | null
          id?: never
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      steam_sync_logs: {
        Row: {
          id: number
          status: string | null
          synced_at: string | null
          synced_games_count: number | null
          user_id: string | null
        }
        Insert: {
          id?: number
          status?: string | null
          synced_at?: string | null
          synced_games_count?: number | null
          user_id?: string | null
        }
        Update: {
          id?: number
          status?: string | null
          synced_at?: string | null
          synced_games_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      steam_user_games: {
        Row: {
          app_id: number
          created_at: string | null
          id: number
          last_played: string | null
          name: string | null
          playtime_forever: number | null
          playtime_recent: number | null
          user_id: string | null
        }
        Insert: {
          app_id: number
          created_at?: string | null
          id?: number
          last_played?: string | null
          name?: string | null
          playtime_forever?: number | null
          playtime_recent?: number | null
          user_id?: string | null
        }
        Update: {
          app_id?: number
          created_at?: string | null
          id?: number
          last_played?: string | null
          name?: string | null
          playtime_forever?: number | null
          playtime_recent?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      steam_user_stats: {
        Row: {
          active_time_slots: string[]
          avg_weekly_playtime: number
          main_genres: string[]
          play_style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_time_slots?: string[]
          avg_weekly_playtime?: number
          main_genres?: string[]
          play_style: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_time_slots?: string[]
          avg_weekly_playtime?: number
          main_genres?: string[]
          play_style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      temperature_logs: {
        Row: {
          change: number | null
          created_at: string | null
          id: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          change?: number | null
          created_at?: string | null
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          change?: number | null
          created_at?: string | null
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tier_history: {
        Row: {
          changed_at: string | null
          current_tier: string | null
          id: number
          previous_tier: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          current_tier?: string | null
          id?: number
          previous_tier?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          current_tier?: string | null
          id?: number
          previous_tier?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string | null
          created_at: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          blocked_user_id?: string | null
          created_at?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          blocked_user_id?: string | null
          created_at?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_play_schedules: {
        Row: {
          created_at: string
          day_type: string
          id: number
          time_slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_type: string
          id?: never
          time_slot: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_type?: string
          id?: never
          time_slot?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          animal_type: string
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          nickname: string | null
          status_message: string | null
          steam_id: string | null
          temperature_score: number
          tier: string
          updated_at: string | null
        }
        Insert: {
          animal_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          nickname?: string | null
          status_message?: string | null
          steam_id?: string | null
          temperature_score: number
          tier?: string
          updated_at?: string | null
        }
        Update: {
          animal_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          nickname?: string | null
          status_message?: string | null
          steam_id?: string | null
          temperature_score?: number
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          comment: string | null
          created_at: string | null
          id: number
          reporter_id: string | null
          target_user_id: string | null
          type: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: number
          reporter_id?: string | null
          target_user_id?: string | null
          type?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: number
          reporter_id?: string | null
          target_user_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          notification_chat: boolean | null
          notification_party: boolean | null
          notification_push: boolean | null
          theme_mode: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          language?: string | null
          notification_chat?: boolean | null
          notification_party?: boolean | null
          notification_push?: boolean | null
          theme_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          notification_chat?: boolean | null
          notification_party?: boolean | null
          notification_push?: boolean | null
          theme_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_social_links: {
        Row: {
          created_at: string | null
          id: number
          platform: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          platform?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          platform?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_status: {
        Row: {
          status: Database["public"]["Enums"]["user_presence_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          status?: Database["public"]["Enums"]["user_presence_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          status?: Database["public"]["Enums"]["user_presence_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tags: {
        Row: {
          created_at: string | null
          id: number
          tag_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          tag_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          tag_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_traits: {
        Row: {
          cooperation: number
          exploration: number
          id: number
          leadership: number
          social: number
          strategy: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cooperation?: number
          exploration?: number
          id?: number
          leadership?: number
          social?: number
          strategy?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cooperation?: number
          exploration?: number
          id?: number
          leadership?: number
          social?: number
          strategy?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_presence_status: "online" | "away" | "dnd" | "offline"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_presence_status: ["online", "away", "dnd", "offline"],
    },
  },
} as const

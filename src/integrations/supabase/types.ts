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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      binder_cards: {
        Row: {
          binder_id: string
          card_id: string
          created_at: string
          id: string
          position: number
          reason: string | null
          user_id: string
        }
        Insert: {
          binder_id: string
          card_id: string
          created_at?: string
          id?: string
          position?: number
          reason?: string | null
          user_id?: string
        }
        Update: {
          binder_id?: string
          card_id?: string
          created_at?: string
          id?: string
          position?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "binder_cards_binder_id_fkey"
            columns: ["binder_id"]
            isOneToOne: false
            referencedRelation: "binders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binder_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binder_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      binders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          created_at: string
          grail_rank: number | null
          id: string
          illustrator: string | null
          image_url: string | null
          is_grail: boolean
          name: string
          number: string | null
          rarity: string | null
          set_id: string | null
          set_name: string | null
          slab_photo_path: string | null
          tcgdex_id: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          grail_rank?: number | null
          id?: string
          illustrator?: string | null
          image_url?: string | null
          is_grail?: boolean
          name: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          slab_photo_path?: string | null
          tcgdex_id: string
          user_id?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          grail_rank?: number | null
          id?: string
          illustrator?: string | null
          image_url?: string | null
          is_grail?: boolean
          name?: string
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          slab_photo_path?: string | null
          tcgdex_id?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      memories: {
        Row: {
          card_tcgdex_id: string | null
          created_at: string
          happened_on: string | null
          id: string
          is_private: boolean
          note: string | null
          photo_path: string | null
          place: string | null
          title: string
          user_id: string
          with_whom: string | null
        }
        Insert: {
          card_tcgdex_id?: string | null
          created_at?: string
          happened_on?: string | null
          id?: string
          is_private?: boolean
          note?: string | null
          photo_path?: string | null
          place?: string | null
          title: string
          user_id?: string
          with_whom?: string | null
        }
        Update: {
          card_tcgdex_id?: string | null
          created_at?: string
          happened_on?: string | null
          id?: string
          is_private?: boolean
          note?: string | null
          photo_path?: string | null
          place?: string | null
          title?: string
          user_id?: string
          with_whom?: string | null
        }
        Relationships: []
      }
      mori_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          payload: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      points_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          points: number
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          points: number
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          points?: number
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          onboarding_answers: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          onboarding_answers?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          onboarding_answers?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          note: string | null
          tcgdex_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          note?: string | null
          tcgdex_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          note?: string | null
          tcgdex_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_cards: {
        Row: {
          created_at: string | null
          grail_rank: number | null
          id: string | null
          illustrator: string | null
          image_url: string | null
          is_grail: boolean | null
          name: string | null
          number: string | null
          rarity: string | null
          set_id: string | null
          set_name: string | null
          slab_photo_path: string | null
          tcgdex_id: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          grail_rank?: number | null
          id?: string | null
          illustrator?: string | null
          image_url?: string | null
          is_grail?: boolean | null
          name?: string | null
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          slab_photo_path?: string | null
          tcgdex_id?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          grail_rank?: number | null
          id?: string | null
          illustrator?: string | null
          image_url?: string | null
          is_grail?: boolean | null
          name?: string | null
          number?: string | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          slab_photo_path?: string | null
          tcgdex_id?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      confirm_mori_proposal: {
        Args: { p_action: string; p_card_details?: Json; p_message_id: string }
        Returns: Json
      }
      set_card_grail: {
        Args: { p_card_id: string; p_rank: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      claps: {
        Row: {
          count: number
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          post_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          reviewed_at: string | null
          reviewer_user_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          post_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          post_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          body: string
          created_at: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          referrer: string
          viewer_user_id: string | null
          visitor_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          referrer?: string
          viewer_user_id?: string | null
          visitor_hash?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          referrer?: string
          viewer_user_id?: string | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          author_user_id: string
          content: string
          created_at: string
          cta_label: string
          cta_url: string
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          author_user_id: string
          content: string
          created_at?: string
          cta_label?: string
          cta_url?: string
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          author_user_id?: string
          content?: string
          created_at?: string
          cta_label?: string
          cta_url?: string
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_user_id: string
          body_slide: string
          conclusion_slide: string
          cover_image_url: string
          created_at: string
          excerpt: string
          goal: string
          id: string
          intro_slide: string
          is_anonymous: boolean
          is_unlisted: boolean
          learn_to_teach: string
          published_at: string | null
          quiz_url: string
          read_time_minutes: number
          reflection: string
          section_media: Json
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body_slide?: string
          conclusion_slide?: string
          cover_image_url?: string
          created_at?: string
          excerpt?: string
          goal?: string
          id?: string
          intro_slide?: string
          is_anonymous?: boolean
          is_unlisted?: boolean
          learn_to_teach?: string
          published_at?: string | null
          quiz_url?: string
          read_time_minutes?: number
          reflection?: string
          section_media?: Json
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body_slide?: string
          conclusion_slide?: string
          cover_image_url?: string
          created_at?: string
          excerpt?: string
          goal?: string
          id?: string
          intro_slide?: string
          is_anonymous?: boolean
          is_unlisted?: boolean
          learn_to_teach?: string
          published_at?: string | null
          quiz_url?: string
          read_time_minutes?: number
          reflection?: string
          section_media?: Json
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          affiliation: string
          avatar_url: string
          control_number: string
          created_at: string
          default_anonymous: boolean
          department: string
          email: string
          id: string
          interest_tags: string[]
          is_complete: boolean
          othernames: string
          phone_number: string
          surname: string
          title: string
          updated_at: string
          user_id: string
          username: string
          username_edits_used: number
          whatsapp_number: string
        }
        Insert: {
          affiliation?: string
          avatar_url?: string
          control_number?: string
          created_at?: string
          default_anonymous?: boolean
          department?: string
          email?: string
          id?: string
          interest_tags?: string[]
          is_complete?: boolean
          othernames?: string
          phone_number?: string
          surname?: string
          title?: string
          updated_at?: string
          user_id: string
          username?: string
          username_edits_used?: number
          whatsapp_number?: string
        }
        Update: {
          affiliation?: string
          avatar_url?: string
          control_number?: string
          created_at?: string
          default_anonymous?: boolean
          department?: string
          email?: string
          id?: string
          interest_tags?: string[]
          is_complete?: boolean
          othernames?: string
          phone_number?: string
          surname?: string
          title?: string
          updated_at?: string
          user_id?: string
          username?: string
          username_edits_used?: number
          whatsapp_number?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          id: string
          post_id: string
          progress_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          progress_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          progress_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      signup_otp_aliases: {
        Row: {
          alias_code: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          real_token: string
        }
        Insert: {
          alias_code: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          real_token: string
        }
        Update: {
          alias_code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          real_token?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          short_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          short_code?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          short_code?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_submissions: {
        Row: {
          accuracy_score: number | null
          ai_feedback: string
          clarity_score: number | null
          completeness_score: number | null
          created_at: string
          duration_seconds: number
          file_size_bytes: number
          graded_at: string | null
          grading_error: string
          id: string
          mime_type: string
          note: string
          post_id: string
          released_at: string | null
          storage_path: string
          student_user_id: string
          total_score: number | null
          transcript: string
        }
        Insert: {
          accuracy_score?: number | null
          ai_feedback?: string
          clarity_score?: number | null
          completeness_score?: number | null
          created_at?: string
          duration_seconds?: number
          file_size_bytes?: number
          graded_at?: string | null
          grading_error?: string
          id?: string
          mime_type?: string
          note?: string
          post_id: string
          released_at?: string | null
          storage_path: string
          student_user_id: string
          total_score?: number | null
          transcript?: string
        }
        Update: {
          accuracy_score?: number | null
          ai_feedback?: string
          clarity_score?: number | null
          completeness_score?: number | null
          created_at?: string
          duration_seconds?: number
          file_size_bytes?: number
          graded_at?: string | null
          grading_error?: string
          id?: string
          mime_type?: string
          note?: string
          post_id?: string
          released_at?: string | null
          storage_path?: string
          student_user_id?: string
          total_score?: number | null
          transcript?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "student" | "lecturer" | "admin" | "participant"
      report_reason:
        | "spam"
        | "inappropriate"
        | "copyright"
        | "misinformation"
        | "harassment"
        | "other"
      report_status: "pending" | "reviewed" | "dismissed" | "removed"
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
      app_role: ["student", "lecturer", "admin", "participant"],
      report_reason: [
        "spam",
        "inappropriate",
        "copyright",
        "misinformation",
        "harassment",
        "other",
      ],
      report_status: ["pending", "reviewed", "dismissed", "removed"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          target_user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_courses: {
        Row: {
          course_slug: string
          created_at: string
          post_id: string
        }
        Insert: {
          course_slug: string
          created_at?: string
          post_id: string
        }
        Update: {
          course_slug?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_courses_course_slug_fkey"
            columns: ["course_slug"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "blog_post_courses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_slug: string
        }
        Insert: {
          post_id: string
          tag_slug: string
        }
        Update: {
          post_id?: string
          tag_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["slug"]
          },
        ]
      }
      blog_post_view_log: {
        Row: {
          post_id: string
          viewed_on: string
          viewer_key: string
        }
        Insert: {
          post_id: string
          viewed_on?: string
          viewer_key: string
        }
        Update: {
          post_id?: string
          viewed_on?: string
          viewer_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_view_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_deleted: boolean
          is_published: boolean
          like_count: number
          published_at: string | null
          series_id: string | null
          slug: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          like_count?: number
          published_at?: string | null
          series_id?: string | null
          slug: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_deleted?: boolean
          is_published?: boolean
          like_count?: number
          published_at?: string | null
          series_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "blog_series"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_series: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_series_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          description: string | null
          is_admin_only: boolean
          name: string
          slug: Database["public"]["Enums"]["board_slug"]
          sort_order: number
        }
        Insert: {
          description?: string | null
          is_admin_only?: boolean
          name: string
          slug: Database["public"]["Enums"]["board_slug"]
          sort_order?: number
        }
        Update: {
          description?: string | null
          is_admin_only?: boolean
          name?: string
          slug?: Database["public"]["Enums"]["board_slug"]
          sort_order?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          author_id: string | null
          content: string
          course_slug: string
          created_at: string
          external_url: string | null
          file_path: string | null
          id: string
          is_deleted: boolean
          material_type: Database["public"]["Enums"]["material_type"]
          title: string
          tsv: unknown
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          course_slug: string
          created_at?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_deleted?: boolean
          material_type?: Database["public"]["Enums"]["material_type"]
          title: string
          tsv?: unknown
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          course_slug?: string
          created_at?: string
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_deleted?: boolean
          material_type?: Database["public"]["Enums"]["material_type"]
          title?: string
          tsv?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_course_slug_fkey"
            columns: ["course_slug"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["slug"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          description: string | null
          name: string
          semester_hint: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          code?: string | null
          description?: string | null
          name: string
          semester_hint?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          code?: string | null
          description?: string | null
          name?: string
          semester_hint?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      post_courses: {
        Row: {
          course_slug: string
          created_at: string
          post_id: string
        }
        Insert: {
          course_slug: string
          created_at?: string
          post_id: string
        }
        Update: {
          course_slug?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_courses_course_slug_fkey"
            columns: ["course_slug"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "post_courses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_view_log: {
        Row: {
          post_id: string
          viewed_on: string
          viewer_key: string
        }
        Insert: {
          post_id: string
          viewed_on?: string
          viewer_key: string
        }
        Update: {
          post_id?: string
          viewed_on?: string
          viewer_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_view_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          accepted_comment_id: string | null
          author_id: string | null
          board_slug: Database["public"]["Enums"]["board_slug"]
          comment_count: number
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          is_pinned: boolean
          like_count: number
          question_status: Database["public"]["Enums"]["question_status"] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          accepted_comment_id?: string | null
          author_id?: string | null
          board_slug: Database["public"]["Enums"]["board_slug"]
          comment_count?: number
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          like_count?: number
          question_status?:
            | Database["public"]["Enums"]["question_status"]
            | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          accepted_comment_id?: string | null
          author_id?: string | null
          board_slug?: Database["public"]["Enums"]["board_slug"]
          comment_count?: number
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          like_count?: number
          question_status?:
            | Database["public"]["Enums"]["question_status"]
            | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_accepted_comment_id_fkey"
            columns: ["accepted_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_board_slug_fkey"
            columns: ["board_slug"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          action: Database["public"]["Enums"]["rate_limit_action"]
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["rate_limit_action"]
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["rate_limit_action"]
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          name: string
          slug: string
        }
        Insert: {
          name: string
          slug: string
        }
        Update: {
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          course_code: string | null
          course_name: string
          created_at: string
          credits: number
          grade: Database["public"]["Enums"]["grade"]
          id: string
          is_excluded: boolean
          memo: string | null
          semester: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_code?: string | null
          course_name: string
          created_at?: string
          credits: number
          grade: Database["public"]["Enums"]["grade"]
          id?: string
          is_excluded?: boolean
          memo?: string | null
          semester: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_code?: string | null
          course_name?: string
          created_at?: string
          credits?: number
          grade?: Database["public"]["Enums"]["grade"]
          id?: string
          is_excluded?: boolean
          memo?: string | null
          semester?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_clear_user_ban: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_until: string
          bio: string
          comment_count: number
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          post_count: number
          role: Database["public"]["Enums"]["user_role"]
          total_count: number
          updated_at: string
          username: string
        }[]
      }
      admin_set_user_ban: {
        Args: { p_duration: string; p_reason: string; p_target_user_id: string }
        Returns: undefined
      }
      comment_depth: { Args: { p_comment_id: string }; Returns: number }
      get_current_profile: {
        Args: never
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_until: string
          bio: string
          created_at: string
          display_name: string
          id: string
          is_banned: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string
        }[]
      }
      increment_blog_post_view: {
        Args: { p_post_id: string; p_viewer_key: string }
        Returns: undefined
      }
      increment_post_view: {
        Args: { p_post_id: string; p_viewer_key: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_user_banned: { Args: never; Returns: boolean }
      prune_rate_limit_events: { Args: never; Returns: undefined }
      set_blog_post_courses: {
        Args: { p_course_slugs: string[]; p_post_id: string }
        Returns: undefined
      }
      set_blog_post_tags: {
        Args: { p_post_id: string; p_tags: string[] }
        Returns: undefined
      }
      set_post_courses: {
        Args: { p_course_slugs: string[]; p_post_id: string }
        Returns: undefined
      }
    }
    Enums: {
      audit_action:
        | "user_ban"
        | "user_unban"
        | "post_hard_delete"
        | "comment_hard_delete"
        | "role_promote"
        | "role_demote"
      board_slug: "free" | "qna" | "notice"
      grade:
        | "A+"
        | "A"
        | "B+"
        | "B"
        | "C+"
        | "C"
        | "D+"
        | "D"
        | "F"
        | "P"
        | "NP"
      material_type: "lecture" | "assignment" | "exam" | "link" | "other"
      question_status: "open" | "solved"
      rate_limit_action: "post_create" | "comment_create" | "like_toggle"
      user_role: "user" | "admin"
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
      audit_action: [
        "user_ban",
        "user_unban",
        "post_hard_delete",
        "comment_hard_delete",
        "role_promote",
        "role_demote",
      ],
      board_slug: ["free", "qna", "notice"],
      grade: ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "F", "P", "NP"],
      material_type: ["lecture", "assignment", "exam", "link", "other"],
      question_status: ["open", "solved"],
      rate_limit_action: ["post_create", "comment_create", "like_toggle"],
      user_role: ["user", "admin"],
    },
  },
} as const


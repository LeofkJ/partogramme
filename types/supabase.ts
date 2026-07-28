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
    PostgrestVersion: "12.2.0 (ec89f6b)"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      amnioticLiquid: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: Database["public"]["Enums"]["LiquidState"]
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: Database["public"]["Enums"]["LiquidState"]
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: Database["public"]["Enums"]["LiquidState"]
        }
        Relationships: [
          {
            foreignKeyName: "amnioticLiquid_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      BabyDescent: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "BabyDescent_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      BabyHeartFrequency: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "BabyHeartFrequency_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      Comment: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean
          partogrammeId: string
          value: string
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean
          partogrammeId: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean
          partogrammeId?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "Comment_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      Dilation: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "Dilation_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital: {
        Row: {
          city: string
          id: string
          isDeleted: boolean | null
          name: string
        }
        Insert: {
          city: string
          id: string
          isDeleted?: boolean | null
          name: string
        }
        Update: {
          city?: string
          id?: string
          isDeleted?: boolean | null
          name?: string
        }
        Relationships: []
      }
      MotherContractionDuration: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherContractionDuration_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      MotherContractionsFrequency: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherContractionsFrequency_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      MotherDiastolicBloodPressure: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherDiastolicBloodPressure_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      MotherHeartFrequency: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherHeartFrequency_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      MotherSystolicBloodPressure: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherSystolicBloodPressure_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      MotherTemperature: {
        Row: {
          created_at: string
          id: string
          isDeleted: boolean | null
          partogrammeId: string
          Rank: number | null
          value: number
        }
        Insert: {
          created_at: string
          id: string
          isDeleted?: boolean | null
          partogrammeId: string
          Rank?: number | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          isDeleted?: boolean | null
          partogrammeId?: string
          Rank?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "MotherTemperature_partogrammeId_fkey"
            columns: ["partogrammeId"]
            isOneToOne: false
            referencedRelation: "Partogramme"
            referencedColumns: ["id"]
          },
        ]
      }
      Partogramme: {
        Row: {
          admissionDateTime: string
          commentary: string
          hospitalId: string
          id: string
          isDeleted: boolean | null
          noFile: number
          nurseId: string
          patientFirstName: string | null
          patientLastName: string | null
          refDoctorId: string
          state: Database["public"]["Enums"]["PartogrammeState"]
          workStartDateTime: string | null
        }
        Insert: {
          admissionDateTime: string
          commentary: string
          hospitalId: string
          id: string
          isDeleted?: boolean | null
          noFile: number
          nurseId: string
          patientFirstName?: string | null
          patientLastName?: string | null
          refDoctorId: string
          state?: Database["public"]["Enums"]["PartogrammeState"]
          workStartDateTime?: string | null
        }
        Update: {
          admissionDateTime?: string
          commentary?: string
          hospitalId?: string
          id?: string
          isDeleted?: boolean | null
          noFile?: number
          nurseId?: string
          patientFirstName?: string | null
          patientLastName?: string | null
          refDoctorId?: string
          state?: Database["public"]["Enums"]["PartogrammeState"]
          workStartDateTime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Partogramme_hospitalId_fkey"
            columns: ["hospitalId"]
            isOneToOne: false
            referencedRelation: "hospital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Partogramme_nurseId_fkey"
            columns: ["nurseId"]
            isOneToOne: false
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
      Profile: {
        Row: {
          email: string | null
          id: string
          isDeleted: boolean | null
        }
        Insert: {
          email?: string | null
          id: string
          isDeleted?: boolean | null
        }
        Update: {
          email?: string | null
          id?: string
          isDeleted?: boolean | null
        }
        Relationships: []
      }
      userInfo: {
        Row: {
          address: string | null
          firstName: string
          hospitalId: string | null
          id: string
          isDeleted: boolean | null
          lastName: string
          mustChangePassword: boolean
          phone: string
          profileId: string
          refDoctorId: string | null
          role: Database["public"]["Enums"]["Role"]
        }
        Insert: {
          address?: string | null
          firstName: string
          hospitalId?: string | null
          id: string
          isDeleted?: boolean | null
          lastName: string
          mustChangePassword?: boolean
          phone?: string
          profileId: string
          refDoctorId?: string | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Update: {
          address?: string | null
          firstName?: string
          hospitalId?: string | null
          id?: string
          isDeleted?: boolean | null
          lastName?: string
          mustChangePassword?: boolean
          phone?: string
          profileId?: string
          refDoctorId?: string | null
          role?: Database["public"]["Enums"]["Role"]
        }
        Relationships: [
          {
            foreignKeyName: "userInfo_hospitalId_fkey"
            columns: ["hospitalId"]
            isOneToOne: false
            referencedRelation: "hospital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "userInfo_profileId_fkey"
            columns: ["profileId"]
            isOneToOne: true
            referencedRelation: "Profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_claim: { Args: { claim: string; uid: string }; Returns: string }
      get_claim: { Args: { claim: string; uid: string }; Returns: Json }
      get_claims: { Args: { uid: string }; Returns: Json }
      get_every_doctor: {
        Args: never
        Returns: {
          email: string | null
          id: string
          isDeleted: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "Profile"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_claim: { Args: { claim: string }; Returns: Json }
      get_my_claims: { Args: never; Returns: Json }
      is_claims_admin: { Args: never; Returns: boolean }
      set_claim: {
        Args: { claim: string; uid: string; value: Json }
        Returns: string
      }
    }
    Enums: {
      LiquidState:
        | "NONE"
        | "INTACT"
        | "CLAIR"
        | "MECONIAL"
        | "SANG"
        | "PUREE_DE_POIS"
      PartogrammeState:
        | "ADMITTED"
        | "IN_PROGRESS"
        | "TRANSFERRED"
        | "WORK_FINISHED"
      Role: "NURSE" | "DOCTOR" | "ADMIN"
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
      LiquidState: [
        "NONE",
        "INTACT",
        "CLAIR",
        "MECONIAL",
        "SANG",
        "PUREE_DE_POIS",
      ],
      PartogrammeState: [
        "ADMITTED",
        "IN_PROGRESS",
        "TRANSFERRED",
        "WORK_FINISHED",
      ],
      Role: ["NURSE", "DOCTOR", "ADMIN"],
    },
  },
} as const

export interface YoloVersion {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface YoloModule {
  id: number;
  name: string;
  type: string;
  config: any; 
  description: string | null;
  created_at: string;
  updated_at: string;
}

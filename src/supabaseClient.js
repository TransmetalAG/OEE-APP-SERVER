import { createClient } from "@supabase/supabase-js";

// URL de tu proyecto en Supabase
const supabaseUrl = "https://cpjuydgublhjvqkffhhm.supabase.co";

// Clave anónima (anon key) de tu proyecto
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwanV5ZGd1YmxoanZxa2ZmaGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjMzODQsImV4cCI6MjA3NDkzOTM4NH0.fG9F3tIGkBfzxl05LLMtoadxGBQlTWngQWuqceFFjzU
"; // 

// Crear cliente de conexión
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

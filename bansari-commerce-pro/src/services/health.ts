import { supabase } from "@/lib/supabase";

export async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from("products")
      .select("id")
      .limit(1);

    return {
      connected: !error,
      error,
    };
  } catch (err) {
    return {
      connected: false,
      error: err,
    };
  }
}
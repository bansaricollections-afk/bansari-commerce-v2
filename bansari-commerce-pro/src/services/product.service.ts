import { createClient } from "@/lib/supabase/server";

export async function getProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getFeaturedProducts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("featured", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getProductById(id: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

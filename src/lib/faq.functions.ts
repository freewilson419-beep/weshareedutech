import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const listPublishedFaqs = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("faq_items")
      .select("id,category,question,answer,sort_order")
      .eq("is_published", true)
      .order("category")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListFaqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("faq_items")
      .select("id,category,question,answer,sort_order,is_published,updated_at")
      .order("category").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const faqInput = z.object({
  category: z.string().min(1).max(60),
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(10_000),
  sort_order: z.number().int().min(0).max(9999).optional().default(0),
  is_published: z.boolean().optional().default(true),
});

export const adminCreateFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => faqInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error, data: row } = await supabaseAdmin.from("faq_items").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminUpdateFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => faqInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("faq_items").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("faq_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

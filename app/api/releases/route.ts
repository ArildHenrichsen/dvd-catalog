import { NextResponse } from "next/server";
import { releaseSchema } from "@/lib/validation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasWriteAccess } from "@/lib/write-auth";

export async function POST(req:Request){
  if(!await hasWriteAccess()) return NextResponse.json({error:"Skrivetilgang kreves. Aktiver token via /api/auth."},{status:401});
  const parsed=releaseSchema.safeParse(await req.json()); if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message||"Ugyldige data"},{status:400});
  const {data,error}=await getSupabaseAdmin().from("releases").insert(parsed.data).select("id").single(); if(error) return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data,{status:201});
}

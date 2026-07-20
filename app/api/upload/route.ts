import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hasWriteAccess } from "@/lib/write-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const allowed=new Set(["image/jpeg","image/png","image/webp"]);
export async function POST(req:Request){ if(!await hasWriteAccess())return NextResponse.json({error:"Skrivetilgang kreves"},{status:401}); const fd=await req.formData(); const file=fd.get("file"); if(!(file instanceof File))return NextResponse.json({error:"Ingen fil"},{status:400}); if(!allowed.has(file.type))return NextResponse.json({error:"Kun JPEG, PNG og WebP"},{status:400}); if(file.size>10*1024*1024)return NextResponse.json({error:"Maks filstørrelse er 10 MB"},{status:400}); const ext=file.type.split("/")[1].replace("jpeg","jpg"); const path=`${new Date().getFullYear()}/${randomUUID()}.${ext}`; const sb=getSupabaseAdmin(); const {error}=await sb.storage.from("covers").upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false}); if(error)return NextResponse.json({error:error.message},{status:500}); const signed=await sb.storage.from("covers").createSignedUrl(path,3600); return NextResponse.json({path,url:signed.data?.signedUrl}); }

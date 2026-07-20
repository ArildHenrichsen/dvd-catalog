import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { makeWriteCookie, writeCookieName } from "@/lib/write-auth";

export async function POST(req: Request){
  const {token}=await req.json(); const expected=process.env.APP_WRITE_TOKEN;
  if(!expected || typeof token!=="string" || token.length!==expected.length || !timingSafeEqual(Buffer.from(token),Buffer.from(expected))) return NextResponse.json({error:"Feil skrivetoken"},{status:401});
  const res=NextResponse.json({ok:true}); res.cookies.set(writeCookieName,makeWriteCookie(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30}); return res;
}

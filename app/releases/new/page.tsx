import { ReleaseForm } from "@/components/release-form";
import { getRelease } from "@/lib/releases";
export default async function NewReleasePage({searchParams}:{searchParams:Promise<{duplicate?:string}>}){ const {duplicate}=await searchParams; const source=duplicate?await getRelease(duplicate):undefined; const clone=source?{...source,id:"",created_at:"",updated_at:""}:undefined; return <><h1>{source?"Dupliser DVD":"Legg til DVD"}</h1><ReleaseForm initial={clone}/></>; }

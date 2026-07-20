import { notFound } from "next/navigation";
import { ReleaseForm } from "@/components/release-form";
import { getRelease } from "@/lib/releases";
export default async function EditPage({params}:{params:Promise<{id:string}>}){ const {id}=await params; const release=await getRelease(id); if(!release) notFound(); return <><h1>Rediger DVD</h1><ReleaseForm release={release}/></>; }

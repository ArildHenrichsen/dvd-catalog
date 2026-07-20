import { ReleaseForm } from "./release-form";
import type { Release } from "@/lib/types";
export function DuplicateForm({release}:{release:Release}){ return <ReleaseForm release={{...release,id:"",created_at:"",updated_at:""}} />; }

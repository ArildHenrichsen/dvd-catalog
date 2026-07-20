import { describe, expect, it } from "vitest";
import { releaseSchema } from "../lib/validation";
describe("releaseSchema",()=>{
  it("godtar en minimal DVD",()=>expect(releaseSchema.safeParse({original_title:"Alien"}).success).toBe(true));
  it("avviser tom tittel",()=>expect(releaseSchema.safeParse({original_title:" "}).success).toBe(false));
  it("avviser IMDb over 10",()=>expect(releaseSchema.safeParse({original_title:"Alien",imdb_score:"10.1"}).success).toBe(false));
});

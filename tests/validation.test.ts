import { describe, expect, it } from "vitest";
import { releaseSchema } from "../lib/validation";
describe("releaseSchema",()=>{
  it("godtar en minimal DVD",()=>expect(releaseSchema.safeParse({original_title:"Alien"}).success).toBe(true));
  it("avviser tom tittel",()=>expect(releaseSchema.safeParse({original_title:" "}).success).toBe(false));
  it("avviser IMDb over 10",()=>expect(releaseSchema.safeParse({original_title:"Alien",imdb_score:"10.1"}).success).toBe(false));
  it("normaliserer manuelle nøkkelord",()=>{
    const parsed = releaseSchema.safeParse({ original_title: "Alien", manual_keywords: "Action, action, Space Horror" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.manual_keywords).toEqual(["action", "space horror"]);
  });
});

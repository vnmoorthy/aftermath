// Voiceover for the 2-minute product video (gpt-4o-mini-tts), one file per shot: video/vo/<id>.mp3
import OpenAI from "openai"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const shots = JSON.parse(readFileSync("video/vo.json", "utf8"))
await Promise.all(shots.map(async (s: any) => {
  const out = `video/vo/${s.id}.mp3`
  if (existsSync(out)) return
  const r: any = await client.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "onyx", input: s.text, response_format: "mp3",
    instructions: "Cinematic movie-trailer narrator: deep, calm, awe-struck and a little ominous. Measured pace with dramatic pauses, warm and confident." } as any)
  writeFileSync(out, Buffer.from(await r.arrayBuffer())); console.log("vo", s.id)
}))
process.exit(0)

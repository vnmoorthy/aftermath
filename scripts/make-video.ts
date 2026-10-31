// Assembles the 2-minute AFTERMATH product video from screen recordings + the generated voiceover.
// Put clips in video/raw/ named after the "clip" ids in video/vo.json (01-teleport.mov, 02-talk.mov, ...).
// Optional video/cuts.json: { "01-teleport": 3.5 } = start offset (seconds) inside each clip.
// Usage: bun scripts/make-video.ts  ->  video/AFTERMATH-demo.mp4
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs"
const W = 1920, H = 1080, FPS = 30
const shots = JSON.parse(readFileSync("video/vo.json", "utf8"))
const cuts: Record<string, number> = existsSync("video/cuts.json") ? JSON.parse(readFileSync("video/cuts.json", "utf8")) : {}
const CAPTIONS: Record<string, string> = {
  "02-travel": "CHOOSE A DIRECTION  ·  FALL THROUGH THE WORMHOLE  ·  SEE YOUR ROUTE FROM EARTH",
  "03-arrive": "A BRAND-NEW AI WORLD FOR EVERY SCAN  ·  FIRST PERSON  ·  IT SPEAKS",
  "04-ghosts": "TALK TO THE AI, ITS GHOSTS AND ITS SURVIVORS",
  "05-meet": "SEE EVERYONE WHO LANDED ON YOUR WORLD",
  "06-network": "AGENT RELAY  ·  TERSE DURABLE ACTORS  ·  AN AI SOCIETY THAT NEVER SLEEPS",
  "07-mars": "MARS, THE REAL ONE  ·  REAL SCIENCE  ·  360° ARES BASE (BLENDER)",
  "08-vote": "THE VOTE  ·  THE PERSUASION REPORT  ·  SUPABASE ARCHIVE",
}
const font = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"].find(existsSync) || ""
const BG = "web/assets/planet-loop.mp4"
mkdirSync("video/build", { recursive: true })
const run = (args: string[]) => { const r = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", ...args]); if (r.exitCode) throw new Error(r.stderr.toString().slice(-800)) }
const probe = (f: string, entries: string) => Bun.spawnSync(["ffprobe", "-v", "error", "-select_streams", entries.startsWith("stream") ? "v:0" : "v", "-show_entries", entries, "-of", "csv=p=0", f]).stdout.toString().trim()
const hasAudio = (f: string) => Bun.spawnSync(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f]).stdout.toString().trim() !== ""
const findClip = (id: string) => { const f = existsSync("video/raw") ? readdirSync("video/raw").find(n => n.toLowerCase().startsWith(id.toLowerCase() + ".")) : null; return f ? `video/raw/${f}` : null }
// Text is drawn by PIL into full-frame transparent PNGs (this ffmpeg build has no drawtext).
const overlay = (name: string, spec: any) => { const p = `video/build/${name}-ov.png`; const r = Bun.spawnSync(["python3", "-I", "scripts/overlay-png.py", JSON.stringify(spec), p]); if (r.exitCode) throw new Error(r.stderr.toString()); return p }
const list: string[] = []
for (const s of shots) {
  const vo = `video/vo/${s.id}.mp3`
  const dur = Number(probe(vo, "format=duration")) + 0.6
  const out = `video/build/${s.id}.mp4`
  const fade = `fade=t=in:st=0:d=0.35,fade=t=out:st=${(dur - 0.35).toFixed(2)}:d=0.35`
  const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS}`
  if (s.clip === "TITLE" || s.clip === "END") {
    const title = s.clip === "TITLE"
    const ov = overlay(s.id, title
      ? { items: [{ text: "AFTERMATH", size: 160, y: 380, align: "center" }, { text: "THE UNIVERSE AI INHERITED", size: 36, y: 600, align: "center", color: "D8C8A0" }] }
      : { qr: "docs/play-qr.png", items: [{ text: "SCAN IT. THE UNIVERSE IS STILL RUNNING.", size: 62, y: 300, align: "center" }, { text: "github.com/vnmoorthy/aftermath  ·  Terse Durable Actors  ·  Agent Relay  ·  OpenAI  ·  Supabase", size: 30, y: 820, align: "center", color: "D8C8A0" }] })
    const vf = `[0:v]${cover},eq=brightness=-0.12[bg];[bg][2:v]overlay=0:0,${fade}[v]`
    run(["-stream_loop", "-1", "-i", BG, "-i", vo, "-loop", "1", "-i", ov, "-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-t", dur.toFixed(2), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", out])
  } else {
    const clip = findClip(s.clip)
    const src = clip || BG
    const w = Number(probe(src, "stream=width")), h = Number(probe(src, "stream=height"))
    const phone = h > w
    const start = String(cuts[s.clip] ?? (clip ? 0.8 : 0))
    const items: any[] = phone
      ? [{ text: (CAPTIONS[s.id] || "").split("  ·  ").join("\n"), size: 40, x: 90, y: 440 }]
      : [{ text: CAPTIONS[s.id] || "", size: 34, x: 60, y: H - 100 }]
    if (!clip) items.push({ text: "RECORD " + s.clip, size: 40, x: 60, y: 60, color: "FF4D5E" })
    const ov = overlay(s.id, { bar: !phone, items })
    const vf = phone // phone recording: blurred backdrop, phone in the right third, caption on the left
      ? `[0:v]${cover},boxblur=30:2,eq=brightness=-0.28[bg];[0:v]scale=-2:${H - 80},setsar=1,fps=${FPS}[ph];[bg][ph]overlay=x=W*0.66-w/2:y=40[c];[c][2:v]overlay=0:0,${fade}[v]`
      : `[0:v]${cover}[c];[c][2:v]overlay=0:0,${fade}[v]`
    const mixClip = !!clip && hasAudio(clip)
    const af = mixClip ? `[1:a]volume=1.0[vo];[0:a]volume=0.22[ga];[vo][ga]amix=inputs=2:duration=first:normalize=0[a]` : `[1:a]anull[a]`
    run(["-ss", start, "-stream_loop", "-1", "-i", src, "-i", vo, "-loop", "1", "-i", ov, "-filter_complex", `${vf};${af}`, "-map", "[v]", "-map", "[a]", "-t", dur.toFixed(2), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", out])
    console.log(s.id, clip ? `from ${clip}` : "PLACEHOLDER (clip missing)", `${dur.toFixed(1)} s`)
  }
  list.push(`file '${s.id}.mp4'`)
}
writeFileSync("video/build/list.txt", list.join("\n"))
run(["-f", "concat", "-safe", "0", "-i", "video/build/list.txt", "-c", "copy", "-movflags", "+faststart", "video/AFTERMATH-demo.mp4"])
console.log("video/AFTERMATH-demo.mp4", probe("video/AFTERMATH-demo.mp4", "format=duration"), "s")

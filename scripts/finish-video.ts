// Finishes the presenter's pitch recording into the submission video: a title card, burned-in captions
// (whisper-1 word timings), dead air trimmed at both ends, levelled audio, and an end card with the QR and sponsor stack.
// Usage: bun --env-file=.env scripts/finish-video.ts [video/raw/<file>]  ->  video/AFTERMATH-pitch.mp4
import OpenAI, { toFile } from "openai"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs"
const W = 1920, H = 1080, FPS = 30
const B = "video/build/pitch"
mkdirSync(B, { recursive: true })
const run = (args: string[]) => { const r = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", ...args]); if (r.exitCode) throw new Error(r.stderr.toString().slice(-800)) }
const probe = (f: string, entries: string) => Bun.spawnSync(["ffprobe", "-v", "error", "-select_streams", entries.startsWith("stream") ? "v:0" : "v", "-show_entries", entries, "-of", "csv=p=0", f]).stdout.toString().trim()
const hasAudio = (f: string) => Bun.spawnSync(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f]).stdout.toString().trim() !== ""
// Text is drawn by PIL into full-frame transparent PNGs (this ffmpeg build has no drawtext).
const overlay = (name: string, spec: any) => { const p = `${B}/${name}.png`; const r = Bun.spawnSync(["python3", "scripts/overlay-png.py", JSON.stringify(spec), p]); if (r.exitCode) throw new Error(r.stderr.toString()); return p }
const enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-ar", "48000", "-ac", "2"]

// 1. The input: an explicit path, else the newest video in video/raw/ that isn't one of the numbered demo clips.
const raw = existsSync("video/raw") ? readdirSync("video/raw").filter(n => /\.(mov|mp4|m4v|webm)$/i.test(n) && !/^\d\d-/.test(n)).map(n => `video/raw/${n}`) : []
const src = process.argv[2] || raw.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
if (!src || !existsSync(src)) { console.error("No pitch video found in video/raw/"); process.exit(1) }
if (!hasAudio(src)) { console.error(`${src} has no audio track`); process.exit(1) }
const total = Number(probe(src, "format=duration"))
console.log("input", src, `${total.toFixed(1)} s`)

// 2. Transcribe, for captions and to trim the dead air before the first word and after the last.
run(["-i", src, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", `${B}/voice.mp3`])
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const tr: any = await client.audio.transcriptions.create({ file: await toFile(readFileSync(`${B}/voice.mp3`), "voice.mp3"), model: "whisper-1", response_format: "verbose_json", timestamp_granularities: ["word", "segment"] } as any)
writeFileSync(`${B}/transcript.json`, JSON.stringify(tr, null, 1))
const words: { word: string; start: number; end: number }[] = tr.words || []
const t0 = words.length ? Math.max(0, words[0].start - 0.45) : 0
const t1 = words.length ? Math.min(total, words[words.length - 1].end + 0.9) : total
const dur = t1 - t0

// 3. Captions: the segment text keeps punctuation, the word list keeps timing; pair them, then cut short phrases.
const toks: { text: string; start: number; end: number }[] = []
let wi = 0
for (const seg of tr.segments || []) {
  const segToks = String(seg.text || "").trim().split(/\s+/).filter(Boolean)
  const segWords = []
  while (wi < words.length && words[wi].start < seg.end + 0.05) segWords.push(words[wi++])
  if (segToks.length === segWords.length) segToks.forEach((t, i) => toks.push({ text: t, start: segWords[i].start, end: segWords[i].end }))
  else segWords.forEach(w => toks.push({ text: w.word, start: w.start, end: w.end }))
}
while (wi < words.length) { const w = words[wi++]; toks.push({ text: w.word, start: w.start, end: w.end }) }
const caps: { text: string; start: number; end: number }[] = []
let cur: typeof toks = []
toks.forEach((t, i) => {
  cur.push(t)
  const next = toks[i + 1]
  const pause = next ? next.start - t.end > 0.45 : true
  if (pause || cur.length >= 7 || (cur.length >= 3 && /[.?!,;:]$/.test(t.text))) {
    caps.push({ text: cur.map(c => c.text).join(" "), start: cur[0].start - t0, end: t.end - t0 + 0.15 })
    cur = []
  }
})
caps.forEach((c, i) => { if (caps[i + 1] && c.end > caps[i + 1].start) c.end = caps[i + 1].start - 0.02 })
console.log(`${words.length} words, ${caps.length} captions, speech ${t0.toFixed(1)}–${t1.toFixed(1)} s`)

// 4. The pitch itself: framed for 1080p (vertical phone footage sits on a blurred backdrop), captions, levelled audio.
const vw = Number(probe(src, "stream=width")), vh = Number(probe(src, "stream=height"))
const capPngs = caps.map((c, i) => overlay(`cap-${String(i).padStart(3, "0")}`, { items: [{ text: c.text, size: 46, y: 950, align: "center", wrap: 1500, box: true, bottom: true }] }))
const base = vh > vw
  ? `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.3,setsar=1[bg];[0:v]scale=-2:${H},setsar=1[fg];[bg][fg]overlay=(W-w)/2:0`
  : `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`
let vf = `${base},fps=${FPS}[v0]`
caps.forEach((c, i) => { vf += `;[v${i}][${i + 1}:v]overlay=0:0:enable='between(t,${c.start.toFixed(2)},${c.end.toFixed(2)})'[v${i + 1}]` })
vf += `;[v${caps.length}]fade=t=in:st=0:d=0.3,fade=t=out:st=${(dur - 0.4).toFixed(2)}:d=0.4[v]`
const af = `[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.2,afade=t=out:st=${(dur - 0.4).toFixed(2)}:d=0.4[a]`
run(["-ss", t0.toFixed(2), "-t", dur.toFixed(2), "-i", src, ...capPngs.flatMap(p => ["-i", p]), "-filter_complex", `${vf};${af}`, "-map", "[v]", "-map", "[a]", ...enc, `${B}/main.mp4`])

// 5. Title and end cards over the Blender planet loop, then join everything.
const card = (name: string, seconds: number, spec: any) => {
  const ov = overlay(name, spec)
  const vfc = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS},eq=brightness=-0.14[bg];[bg][1:v]overlay=0:0,fade=t=in:st=0:d=0.4,fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4[v]`
  run(["-stream_loop", "-1", "-i", "web/assets/planet-loop.mp4", "-i", ov, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex", vfc, "-map", "[v]", "-map", "2:a", "-t", String(seconds), ...enc, `${B}/${name}.mp4`])
}
card("title", 3, { items: [{ text: "AFTERMATH", size: 160, y: 380, align: "center" }, { text: "THE UNIVERSE AI INHERITED", size: 36, y: 600, align: "center", color: "D8C8A0" }] })
card("end", 6, { qr: "docs/play-qr.png", items: [{ text: "SCAN IT. THE UNIVERSE IS STILL RUNNING.", size: 62, y: 300, align: "center" }, { text: "github.com/vnmoorthy/aftermath", size: 34, y: 790, align: "center" }, { text: "Terse Durable Actors  ·  Agent Relay  ·  OpenAI  ·  Supabase", size: 30, y: 850, align: "center", color: "D8C8A0" }] })
writeFileSync(`${B}/list.txt`, ["title", "main", "end"].map(n => `file '${n}.mp4'`).join("\n"))
run(["-f", "concat", "-safe", "0", "-i", `${B}/list.txt`, "-c", "copy", "-movflags", "+faststart", "video/AFTERMATH-pitch.mp4"])
const out = Number(probe("video/AFTERMATH-pitch.mp4", "format=duration"))
console.log("video/AFTERMATH-pitch.mp4", `${out.toFixed(1)} s`, out > 125 ? "(over 2:05: trim the take or speak a little faster)" : "")

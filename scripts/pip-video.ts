// Product demo with the presenter in a circle (bottom-left) over product footage timed to the pitch.
// Usage: bun --env-file=.env scripts/pip-video.ts video/raw/pitch.mov  ->  video/AFTERMATH-demo-pip.mp4
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
const W = 1920, H = 1080, FPS = 30, B = "video/build/pip", A = "web/assets/"
mkdirSync(B, { recursive: true })
const run = (args: string[]) => { const r = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", ...args]); if (r.exitCode) throw new Error(r.stderr.toString().slice(-600)) }
const src = process.argv[2] || "video/raw/pitch.mov"
const total = Number(Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).stdout.toString())
const enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-an"]
// [start, kind, source...] timed to the transcript of the pitch
const plan: [number, string, ...string[]][] = [
  [0, "video", A + "planet-loop.mp4"],
  [9.2, "phone", "video/build/shots/landing.png"],
  [21, "images", A + "verse-battery.webp", A + "verse-microverse.webp", A + "verse-nanoverse.webp"],
  [29.8, "video", A + "wormhole-loop.mp4"],
  [41.8, "images", A + "fp-ruins.webp", A + "fp-crystal.webp", A + "fp-desert.webp"],
  [60, "images", A + "verse-necroverse.webp", A + "verse-andromeda.webp"],
  [68.2, "images", A + "fp-jungle.webp", A + "fp-ocean.webp"],
  [75.9, "images", A + "fp-haunted.webp", A + "fp-haunted-ghost.webp"],
  [86.2, "still", "video/build/shots/stage.png"],
  [108.2, "pano", A + "mars-pano.webp"],
  [120, "still", "video/build/shots/stage-attract.png"],
]
const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`
const list: string[] = []
plan.forEach(([start, kind, ...files], i) => {
  const end = i + 1 < plan.length ? plan[i + 1][0] : total
  const dur = end - start
  const parts = kind === "images" ? files : [files[0]]
  parts.forEach((f, j) => {
    const d = dur / parts.length, out = `${B}/seg-${i}-${j}.mp4`, n = Math.ceil(d * FPS)
    const fade = `fade=t=in:st=0:d=0.4`
    if (kind === "video") run(["-stream_loop", "-1", "-i", f, "-t", d.toFixed(2), "-vf", `${cover},fps=${FPS},${fade}`, ...enc, out])
    else if (kind === "phone") run(["-loop", "1", "-i", "video/build/shots/stage.png", "-loop", "1", "-i", f, "-t", d.toFixed(2), "-filter_complex", `[0:v]${cover},boxblur=24:2,eq=brightness=-0.3[bg];[1:v]scale=-2:${H - 80}[ph];[bg][ph]overlay=(W-w)/2+260:40,fps=${FPS},${fade}`, ...enc, out])
    else if (kind === "pano") run(["-loop", "1", "-i", f, "-t", d.toFixed(2), "-vf", `scale=-2:${H},crop=${W}:${H}:x='(iw-${W})*t/${d.toFixed(2)}':y=0,fps=${FPS},${fade}`, ...enc, out])
    else run(["-loop", "1", "-i", f, "-t", d.toFixed(2), "-vf", `${cover},zoompan=z='min(zoom+0.0007,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=${W}x${H}:fps=${FPS},${fade}`, ...enc, out])
    list.push(`file 'seg-${i}-${j}.mp4'`)
  })
})
writeFileSync(`${B}/list.txt`, list.join("\n"))
run(["-f", "concat", "-safe", "0", "-i", `${B}/list.txt`, "-c", "copy", `${B}/bg.mp4`])
// circle mask + gold ring for the presenter
const D = 400
Bun.spawnSync(["python3", "-c", `
from PIL import Image, ImageDraw
D=${D}; m=Image.new('L',(D*4,D*4),0); ImageDraw.Draw(m).ellipse((8,8,D*4-8,D*4-8),fill=255); m.resize((D,D),Image.LANCZOS).save('${B}/mask.png')
r=Image.new('RGBA',(D*4,D*4),(0,0,0,0)); ImageDraw.Draw(r).ellipse((6,6,D*4-6,D*4-6),outline=(184,155,94,255),width=22); r.resize((D,D),Image.LANCZOS).save('${B}/ring.png')`])
// captions from the transcript segments
const tr = JSON.parse(readFileSync("video/build/pitch/transcript.json", "utf8"))
const caps = (tr.segments || []).map((s: any, i: number) => {
  const p = `${B}/cap-${i}.png`
  Bun.spawnSync(["python3", "scripts/overlay-png.py", JSON.stringify({ items: [{ text: String(s.text).trim(), size: 40, y: 1010, align: "center", wrap: 1300, box: true, bottom: true }] }), p])
  return { p, start: s.start, end: s.end }
})
const x = 56, y = H - D - 56
let fc = `[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=${D}:${D},format=rgba[cam];[2:v]format=gray[mk];[cam][mk]alphamerge[c];[0:v][c]overlay=${x}:${y}[v1];[v1][3:v]overlay=${x}:${y}[v2]`
caps.forEach((c: any, i: number) => { fc += `;[v${i + 2}][${i + 4}:v]overlay=0:0:enable='between(t,${c.start.toFixed(2)},${c.end.toFixed(2)})'[v${i + 3}]` })
fc += `;[v${caps.length + 2}]fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11[a]`
run(["-i", `${B}/bg.mp4`, "-i", src, "-loop", "1", "-i", `${B}/mask.png`, "-loop", "1", "-i", `${B}/ring.png`, ...caps.flatMap((c: any) => ["-i", c.p]),
  "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-movflags", "+faststart", "video/AFTERMATH-demo-pip.mp4"])
console.log("video/AFTERMATH-demo-pip.mp4", total.toFixed(1), "s")

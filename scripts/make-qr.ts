// Writes docs/play-qr.png for the current PUBLIC_URL (rerun whenever the tunnel URL changes).
import QRCode from "qrcode"
const url = (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "") + "/p"
await QRCode.toFile("docs/play-qr.png", url, { width: 520, margin: 2, color: { dark: "#0b0618", light: "#ffffff" } })
console.log("docs/play-qr.png ->", url)
process.exit(0)

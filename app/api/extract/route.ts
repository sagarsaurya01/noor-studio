import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'


const execAsync = promisify(exec)

// GET — return already-extracted files for a project (so page can reload them)
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const outputDir = path.join(process.cwd(), 'public', 'extracted', projectId)
  const framesDir = path.join(outputDir, 'frames')
  const clipsDir  = path.join(outputDir, 'clips')

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ frames: [], clips: [] })
  }

  const frames = fs.existsSync(framesDir)
    ? fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort()
        .map(f => `/extracted/${projectId}/frames/${f}`)
    : []

  const clips = fs.existsSync(clipsDir)
    ? fs.readdirSync(clipsDir).filter(f => f.endsWith('.mp4')).sort()
        .map(c => `/extracted/${projectId}/clips/${c}`)
    : []

  return NextResponse.json({ frames, clips })
}

// POST — download video, extract frames + clips, delete video
export async function POST(req: NextRequest) {
  try {
    const { videoUrl, projectId } = await req.json()
    if (!videoUrl || !projectId) {
      return NextResponse.json({ error: 'Missing videoUrl or projectId' }, { status: 400 })
    }

    // --- 1. Create output dirs inside public/ so Next.js serves them statically ---
    const outputDir = path.join(process.cwd(), 'public', 'extracted', projectId)
    const framesDir = path.join(outputDir, 'frames')
    const clipsDir  = path.join(outputDir, 'clips')
    fs.mkdirSync(framesDir, { recursive: true })
    fs.mkdirSync(clipsDir,  { recursive: true })

    // --- 2. Download the video (720p max to keep size reasonable) ---
    const tempDir       = os.tmpdir()
    const videoBase     = path.join(tempDir, `noor_video_${Date.now()}`)
    const videoTemplate = `${videoBase}.%(ext)s`

    await execAsync(
      `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${videoTemplate}" "${videoUrl}"`,
      { timeout: 300000 }
    )

    // Find the downloaded file (pick newest noor_video_ mp4)
    const videoFiles = fs.readdirSync(tempDir)
      .filter(f => f.startsWith('noor_video_') && f.endsWith('.mp4'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(tempDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    if (videoFiles.length === 0) {
      return NextResponse.json({ error: 'Could not download video' }, { status: 500 })
    }

    const videoPath = path.join(tempDir, videoFiles[0].name)

    // --- 3. Extract frames — 1 every 5 seconds, scaled to 640px wide ---
    const framePattern = path.join(framesDir, 'frame_%04d.jpg')
    await execAsync(
      `ffmpeg -i "${videoPath}" -vf "fps=1/5,scale=640:-2" -q:v 3 -y "${framePattern}"`,
      { timeout: 120000 }
    )

    // --- 4. Get video duration (ffprobe ships with ffmpeg) ---
    let duration = 0
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 10000 }
      )
      duration = parseFloat(stdout.trim()) || 0
    } catch { /* ignore — clips just won't be extracted */ }

    // --- 5. Extract 5-second B-roll clips every 30 seconds ---
    if (duration > 0) {
      const clipLength   = 5
      const clipInterval = 30
      const clipJobs: Promise<unknown>[] = []

      for (let start = 0; start + clipLength <= duration; start += clipInterval) {
        const label    = String(Math.floor(start)).padStart(4, '0')
        const clipPath = path.join(clipsDir, `clip_${label}s.mp4`)
        clipJobs.push(
          execAsync(
            `ffmpeg -ss ${start} -i "${videoPath}" -t ${clipLength} -c:v libx264 -preset ultrafast -crf 28 -c:a aac -y "${clipPath}"`,
            { timeout: 60000 }
          ).catch(() => null) // one clip failing shouldn't abort the whole job
        )
      }
      await Promise.all(clipJobs)
    }

    // --- 6. Clean up the big video file ---
    try { fs.unlinkSync(videoPath) } catch { /* best-effort */ }

    // --- 7. Return paths (served as /extracted/... by Next.js static layer) ---
    const frames = fs.existsSync(framesDir)
      ? fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort()
          .map(f => `/extracted/${projectId}/frames/${f}`)
      : []

    const clips = fs.existsSync(clipsDir)
      ? fs.readdirSync(clipsDir).filter(f => f.endsWith('.mp4')).sort()
          .map(c => `/extracted/${projectId}/clips/${c}`)
      : []

    return NextResponse.json({ frames, clips })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

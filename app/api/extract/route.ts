import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

function getProjectDir(projectId: string) {
  return path.join(os.tmpdir(), 'noor_extracted', projectId)
}

// GET — return already-extracted files for a project
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })

  const outputDir = getProjectDir(projectId)
  const framesDir = path.join(outputDir, 'frames')
  const clipsDir  = path.join(outputDir, 'clips')

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ frames: [], clips: [] })
  }

  const frames = fs.existsSync(framesDir)
    ? fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort()
        .map(f => `/api/files/${projectId}/frames/${f}`)
    : []

  const clips = fs.existsSync(clipsDir)
    ? fs.readdirSync(clipsDir).filter(f => f.endsWith('.mp4')).sort()
        .map(c => `/api/files/${projectId}/clips/${c}`)
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

    const outputDir = getProjectDir(projectId)
    const framesDir = path.join(outputDir, 'frames')
    const clipsDir  = path.join(outputDir, 'clips')
    fs.mkdirSync(framesDir, { recursive: true })
    fs.mkdirSync(clipsDir,  { recursive: true })

    // Download video to tmpdir
    const videoBase     = path.join(os.tmpdir(), `noor_video_${Date.now()}`)
    const videoTemplate = `${videoBase}.%(ext)s`

    await execAsync(
      `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best" --merge-output-format mp4 -o "${videoTemplate}" "${videoUrl}"`,
      { timeout: 300000 }
    )

    const videoFiles = fs.readdirSync(os.tmpdir())
      .filter(f => f.startsWith(`noor_video_${path.basename(videoBase).split('_')[2]}`) && f.endsWith('.mp4'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(os.tmpdir(), f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    // fallback: pick any newest noor_video_ mp4
    const allVideoFiles = fs.readdirSync(os.tmpdir())
      .filter(f => f.startsWith('noor_video_') && f.endsWith('.mp4'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(os.tmpdir(), f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)

    const picked = videoFiles.length > 0 ? videoFiles : allVideoFiles
    if (picked.length === 0) {
      return NextResponse.json({ error: 'Could not download video' }, { status: 500 })
    }

    const videoPath = path.join(os.tmpdir(), picked[0].name)

    // Extract frames — 1 every 5 seconds
    const framePattern = path.join(framesDir, 'frame_%04d.jpg')
    await execAsync(
      `ffmpeg -i "${videoPath}" -vf "fps=1/5,scale=640:-2" -q:v 3 -y "${framePattern}"`,
      { timeout: 120000 }
    )

    // Get duration
    let duration = 0
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 10000 }
      )
      duration = parseFloat(stdout.trim()) || 0
    } catch { /* ignore */ }

    // Extract 5-second clips every 30 seconds
    if (duration > 0) {
      const clipJobs: Promise<unknown>[] = []
      for (let start = 0; start + 5 <= duration; start += 30) {
        const label    = String(Math.floor(start)).padStart(4, '0')
        const clipPath = path.join(clipsDir, `clip_${label}s.mp4`)
        clipJobs.push(
          execAsync(
            `ffmpeg -ss ${start} -i "${videoPath}" -t 5 -c:v libx264 -preset ultrafast -crf 28 -c:a aac -y "${clipPath}"`,
            { timeout: 60000 }
          ).catch(() => null)
        )
      }
      await Promise.all(clipJobs)
    }

    try { fs.unlinkSync(videoPath) } catch { /* best-effort */ }

    const frames = fs.existsSync(framesDir)
      ? fs.readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort()
          .map(f => `/api/files/${projectId}/frames/${f}`)
      : []

    const clips = fs.existsSync(clipsDir)
      ? fs.readdirSync(clipsDir).filter(f => f.endsWith('.mp4')).sort()
          .map(c => `/api/files/${projectId}/clips/${c}`)
      : []

    return NextResponse.json({ frames, clips })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

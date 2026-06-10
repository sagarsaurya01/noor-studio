import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import ytdl from '@distube/ytdl-core'
import path from 'path'
import os from 'os'
import fs from 'fs'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Helpers ──────────────────────────────────────────────────────────────────

function cleanTranscript(items: { text: string }[]): string {
  const lines = items
    .map(i => i.text.replace(/\[.*?\]/gi, '').replace(/\(.*?\)/gi, '').trim())
    .filter(l => l.length > 1)

  // Remove consecutive duplicates
  const deduped: string[] = []
  for (const line of lines) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== line) {
      deduped.push(line)
    }
  }

  return deduped.join(' ').replace(/\s{2,}/g, ' ').trim()
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)

    // ── Step 1: Try YouTube transcript API (fast, no download) ──────────────
    if (videoId) {
      try {
        const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
        if (items && items.length > 0) {
          const transcript = cleanTranscript(items)
          const wordCount = transcript.split(' ').filter(Boolean).length
          if (wordCount >= 100) {
            return NextResponse.json({ transcript, method: 'captions' })
          }
        }
      } catch {
        // no captions — fall through to audio
      }
    }

    // ── Step 2: Fall back to ytdl audio download + Whisper ──────────────────
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from URL. Only YouTube URLs are supported for audio fallback.' },
        { status: 400 }
      )
    }

    const audioPath = path.join(os.tmpdir(), `noor_audio_${Date.now()}.mp3`)

    await new Promise<void>((resolve, reject) => {
      const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
        filter: 'audioonly',
        quality: 'lowestaudio',
      })
      const file = fs.createWriteStream(audioPath)
      stream.pipe(file)
      stream.on('error', reject)
      file.on('finish', resolve)
      file.on('error', reject)
    })

    return NextResponse.json({ audioPath, method: 'whisper' })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Innertube } from 'youtubei.js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID. Please paste a valid YouTube URL.' }, { status: 400 })
    }

    const yt = await Innertube.create({ retrieve_player: true })
    const info = await yt.getInfo(videoId)

    // Get caption tracks from player response
    const captionTracks = info.captions?.caption_tracks ?? []
    if (!captionTracks.length) {
      return NextResponse.json({
        error: 'This video has no captions. Please upload the audio file using the "Voice Note" upload option instead.',
      }, { status: 422 })
    }

    // Prefer English manual captions, then auto-generated, then first available
    const track = captionTracks.find((t: { language_code: string; kind?: string }) => t.language_code === 'en' && t.kind !== 'asr')
      ?? captionTracks.find((t: { language_code: string }) => t.language_code === 'en')
      ?? captionTracks[0]

    // Fetch the caption file (json3 format)
    const captionUrl = (track as { base_url: string }).base_url + '&fmt=json3'
    const captionRes = await fetch(captionUrl)
    if (!captionRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch captions.' }, { status: 500 })
    }

    const data = await captionRes.json() as {
      events?: Array<{ segs?: Array<{ utf8: string }> }>
    }

    const text = (data.events ?? [])
      .flatMap(e => e.segs ?? [])
      .map(s => s.utf8?.replace(/\n/g, ' ').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (text.length > 50) {
      return NextResponse.json({ transcript: text, method: 'captions' })
    }

    return NextResponse.json({
      error: 'Could not extract text from captions. Please try the "Voice Note" upload option instead.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

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

async function fetchCaptionsViaYouTubeAPI(videoId: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  // Get list of caption tracks
  const listRes = await fetch(
    `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
  )
  if (!listRes.ok) return null

  const listData = await listRes.json() as { items?: Array<{ id: string; snippet: { language: string; trackKind: string } }> }
  const items = listData.items ?? []

  // Prefer English captions, then any available
  const track = items.find(i => i.snippet.language === 'en' && i.snippet.trackKind !== 'asr')
    ?? items.find(i => i.snippet.language === 'en')
    ?? items[0]

  if (!track) return null

  // Download the caption track as plain text
  const captionRes = await fetch(
    `https://www.googleapis.com/youtube/v3/captions/${track.id}?tfmt=srt&key=${apiKey}`
  )
  if (!captionRes.ok) return null

  const srt = await captionRes.text()

  // Strip SRT timestamps and numbering, return plain text
  const text = srt
    .replace(/^\d+$/gm, '')
    .replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[.*?\]/gi, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return text.length > 50 ? text : null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID. Please paste a valid YouTube URL.' }, { status: 400 })
    }

    // Use YouTube Data API v3 to fetch captions (official, no bot detection)
    const transcript = await fetchCaptionsViaYouTubeAPI(videoId)
    if (transcript) {
      return NextResponse.json({ transcript, method: 'captions' })
    }

    // No captions available — ask user to upload audio instead
    return NextResponse.json({
      error: 'This video has no captions available. Please download the audio and use "Upload Audio File" instead, or switch to "Topic / Idea" mode.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

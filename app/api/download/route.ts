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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

async function fetchTranscriptFromPage(videoId: string): Promise<string | null> {
  // Fetch the YouTube watch page
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: BROWSER_HEADERS,
  })
  if (!pageRes.ok) return null
  const html = await pageRes.text()

  // Extract captionTracks from ytInitialPlayerResponse
  const match = html.match(/"captionTracks":(\[.*?\])/)
  if (!match) return null

  let tracks: Array<{ baseUrl: string; languageCode: string; kind?: string }> = []
  try {
    tracks = JSON.parse(match[1])
  } catch {
    return null
  }

  if (!tracks.length) return null

  // Prefer English, then first available
  const track = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr')
    ?? tracks.find(t => t.languageCode === 'en')
    ?? tracks[0]

  if (!track?.baseUrl) return null

  // Fetch the caption XML
  const captionRes = await fetch(track.baseUrl + '&fmt=json3', {
    headers: BROWSER_HEADERS,
  })
  if (!captionRes.ok) return null

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

    const transcript = await fetchTranscriptFromPage(videoId)
    if (transcript) {
      return NextResponse.json({ transcript, method: 'captions' })
    }

    return NextResponse.json({
      error: 'This video has no captions. Please upload the audio file using the "Voice Note" upload option instead.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

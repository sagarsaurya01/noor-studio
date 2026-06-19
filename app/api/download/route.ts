import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

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

function cleanTranscript(items: { text: string }[]): string {
  const lines = items
    .map(i => i.text.replace(/\[.*?\]/gi, '').replace(/\(.*?\)/gi, '').trim())
    .filter(l => l.length > 1)
  const deduped: string[] = []
  for (const line of lines) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== line) deduped.push(line)
  }
  return deduped.join(' ').replace(/\s{2,}/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

    const videoId = extractVideoId(url)
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID. Please paste a valid YouTube URL.' }, { status: 400 })
    }

    // Try youtube-transcript (fetches auto-generated or manual captions via timedtext API)
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
      if (items && items.length > 0) {
        const transcript = cleanTranscript(items)
        if (transcript.split(' ').filter(Boolean).length >= 50) {
          return NextResponse.json({ transcript, method: 'captions' })
        }
      }
    } catch {
      // no captions
    }

    // No captions — tell user to upload audio
    return NextResponse.json({
      error: 'This video has no captions. Please download the audio on your phone and upload it using the "Voice Note" or audio upload option.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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

    // Use Innertube (YouTube's internal app API) — not blocked by bot detection
    const yt = await Innertube.create({ retrieve_player: false })
    const info = await yt.getInfo(videoId)

    // Get transcript
    const transcriptData = await info.getTranscript()
    const segments = transcriptData?.transcript?.content?.body?.initial_segments ?? []

    const text = segments
      .map((s: { snippet?: { text?: string } }) => s.snippet?.text ?? '')
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (text.length > 50) {
      return NextResponse.json({ transcript: text, method: 'captions' })
    }

    return NextResponse.json({
      error: 'This video has no captions. Please upload the audio file using the "Voice Note" upload option instead.',
    }, { status: 422 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

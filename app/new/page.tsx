'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Phase = 'input' | 'transcribing' | 'transcript-ready' | 'generating' | 'done'
type InputMode = 'topic' | 'voice' | 'video' | 'video-file' | 'image' | 'pdf'
type FormatType = 'vertical' | 'landscape'

const VERTICAL_PLATFORMS = ['Instagram Reels', 'YouTube Shorts', 'LinkedIn'] as const
const LANDSCAPE_PLATFORMS = ['YouTube (Long-form)', 'LinkedIn Video', 'Facebook Video', 'Webinar'] as const
type VerticalPlatform = typeof VERTICAL_PLATFORMS[number]
type LandscapePlatform = typeof LANDSCAPE_PLATFORMS[number]
type Platform = VerticalPlatform | LandscapePlatform

const MODE_CONFIG: Array<{
  key: InputMode
  title: string
  desc: string
  icon: React.ReactNode
}> = [
  {
    key: 'topic',
    title: 'Topic / Idea',
    desc: 'Type a topic and get a full content package',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path d="M11 2C7.13 2 4 5.13 4 9c0 2.38 1.19 4.47 3 5.74V17h8v-2.26C16.81 13.47 18 11.38 18 9c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M8 20h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'voice',
    title: 'Voice Note',
    desc: 'Record your idea — Whisper AI transcribes it',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="8" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 11c0 3.87 3.13 7 7 7s7-3.13 7-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M11 18v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'video',
    title: 'Video Link',
    desc: 'Paste a YouTube, Instagram or TikTok link',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M16 9l4-2v8l-4-2V9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'video-file',
    title: 'Video File',
    desc: 'Upload a local .mp4, .mov, .avi, .mkv',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M14 9l5-3v10l-5-3V9z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M7 11V8M5.5 9.5H8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'image',
    title: 'Image',
    desc: 'Upload JPEG/PNG — Claude Vision analyses it',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="7.5" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 16l5-5 3.5 3.5L14 10l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'pdf',
    title: 'PDF',
    desc: 'Upload a PDF — extract text as content base',
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <path d="M13 2H5a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M13 2v6h6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M7 13h8M7 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function NewProjectPage() {
  const [mode, setMode] = useState<InputMode>('topic')
  const [formatType, setFormatType] = useState<FormatType>('vertical')
  const [topic, setTopic] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('input')
  const [transcript, setTranscript] = useState('')
  const [transcriptMethod, setTranscriptMethod] = useState('')
  const [genStep, setGenStep] = useState(0)
  const [error, setError] = useState('')
  const [platform, setPlatform] = useState<Platform>('Instagram Reels')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAudioDragging, setIsAudioDragging] = useState(false)
  const [intent, setIntent] = useState<string>('')
  const [imageAnalysis, setImageAnalysis] = useState<Record<string, unknown>>({})
  const [imageBase64, setImageBase64] = useState<string>('')
  const [imageMediaType, setImageMediaType] = useState<string>('')
  const [customBrief, setCustomBrief] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [posterPrompt, setPosterPrompt] = useState('')
  const [generatingPoster, setGeneratingPoster] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileDrop(e: React.DragEvent, type: 'file' | 'audio') {
    e.preventDefault()
    if (type === 'file') setIsDragging(false)
    else setIsAudioDragging(false)

    const f = e.dataTransfer.files?.[0]
    if (!f) return

    if (type === 'audio') {
      if (!f.type.startsWith('audio/')) { setError('Please drop an audio file (MP3, M4A, WAV)'); return }
      if (f.size > 24 * 1024 * 1024) { setError('Audio file too large. Maximum is 24MB.'); return }
      setAudioBlob(f)
      setError('')
    } else {
      setSelectedFile(f)
      setError('')
    }
  }

  const platforms = formatType === 'vertical' ? VERTICAL_PLATFORMS : LANDSCAPE_PLATFORMS

  function handleFormatChange(fmt: FormatType) {
    setFormatType(fmt)
    setPlatform(fmt === 'vertical' ? 'Instagram Reels' : 'YouTube (Long-form)')
  }

  // Step 1 — Get transcript from video link
  async function handleTranscribe() {
    setError('')
    setPhase('transcribing')

    try {
      const downloadRes = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      })
      const downloadData = await downloadRes.json()
      if (!downloadRes.ok) throw new Error(downloadData.error)

      if (downloadData.method === 'captions') {
        setTranscript(downloadData.transcript)
        setTranscriptMethod('Auto-captions')
        setPhase('transcript-ready')
      } else {
        // Need Whisper
        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioPath: downloadData.audioPath }),
        })
        const transcribeData = await transcribeRes.json()
        if (!transcribeRes.ok) throw new Error(transcribeData.error)
        setTranscript(transcribeData.transcript)
        setTranscriptMethod('Whisper AI')
        setPhase('transcript-ready')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
      setPhase('input')
    }
  }

  // Step 1 — Upload file (video-file or pdf mode)
  async function handleFileUpload() {
    if (!selectedFile) return
    setError('')
    setPhase('transcribing')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', mode === 'video-file' ? 'video' : 'pdf')

      const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTranscript(data.transcript)
      setTranscriptMethod(mode === 'video-file' ? 'Whisper AI' : 'PDF Extract')
      setPhase('transcript-ready')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPhase('input')
    }
  }

  // Step 1 — Analyse image (image mode)
  async function handleImageAnalyse() {
    if (!selectedFile) return
    setError('')
    setPhase('transcribing')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch('/api/analyze-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTranscript(data.description)
      setTranscriptMethod('Claude Vision')
      setImageAnalysis(data.analysis ?? {})
      setImageBase64(data.base64 ?? '')
      setImageMediaType(data.mediaType ?? 'image/jpeg')
      setPhase('transcript-ready')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image analysis failed')
      setPhase('input')
    }
  }

  // Voice recording
  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingSeconds(0)
      setAudioBlob(null)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow mic permission in your browser.')
    }
  }

  function handleStopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  async function handleVoiceTranscribe() {
    if (!audioBlob) return
    setError('')
    setPhase('transcribing')
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      const res = await fetch('/api/whisper', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(data.transcript)
      setTranscriptMethod('Whisper AI')
      setPhase('transcript-ready')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Voice transcription failed')
      setPhase('input')
    }
  }

  function handlePrimaryAction() {
    if (mode === 'topic') return handleGenerate('topic')
    if (mode === 'voice') return handleVoiceTranscribe()
    if (mode === 'video') return handleTranscribe()
    if (mode === 'video-file') return handleFileUpload()
    if (mode === 'image') return handleImageAnalyse()
    if (mode === 'pdf') return handleFileUpload()
  }

  // Step 2a — Poster recreation (image mode)
  async function handlePosterRecreate() {
    if (!imageBase64 || !intent) return
    setError('')
    setGeneratingPoster(true)
    try {
      const res = await fetch('/api/poster-recreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: imageBase64,
          mediaType: imageMediaType,
          analysis: imageAnalysis,
          intent,
          userBrief: intent === 'custom-brief' ? customBrief : '',
        }),
      })
      const data = await res.json() as { imageUrl?: string; prompt?: string; error?: string }
      if (!res.ok || !data.imageUrl) throw new Error(data.error ?? 'Failed to recreate poster')
      setPosterUrl(data.imageUrl)
      setPosterPrompt(data.prompt ?? '')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Poster recreation failed')
    } finally {
      setGeneratingPoster(false)
    }
  }

  // Step 2 — Generate scripts
  async function handleGenerate(inputMode: InputMode) {
    setError('')
    setPhase('generating')
    setGenStep(1)

    try {
      setGenStep(2)
      const body =
        inputMode === 'topic'
          ? { mode: 'topic', topic, platform, format_type: formatType, input_type: 'topic' }
          : { mode: 'video', transcript, videoUrl, platform, format_type: formatType, input_type: inputMode, angle_hint: intent }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setGenStep(3)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGenStep(4)
      setTimeout(() => router.push(`/project/${data.projectId}`), 400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setPhase(inputMode === 'topic' ? 'input' : 'transcript-ready')
      setGenStep(0)
    }
  }

  const primaryButtonLabel = () => {
    if (mode === 'topic') return 'Generate Content →'
    if (mode === 'voice') return 'Transcribe Voice →'
    if (mode === 'video') return 'Get Transcript →'
    if (mode === 'video-file') return 'Upload & Transcribe →'
    if (mode === 'image') return 'Analyse Image →'
    if (mode === 'pdf') return 'Extract Content →'
    return 'Continue →'
  }

  const isPrimaryDisabled = () => {
    if (mode === 'topic') return topic.trim().length <= 5
    if (mode === 'voice') return !audioBlob
    if (mode === 'video') return videoUrl.trim().length <= 10
    return !selectedFile
  }

  const fileAccept = () => {
    if (mode === 'video-file') return '.mp4,.mov,.avi,.mkv'
    if (mode === 'image') return '.jpg,.jpeg,.png,.webp'
    if (mode === 'pdf') return '.pdf'
    return ''
  }

  const genSteps = ['Analysing', 'Writing scripts', 'Building storyboard', 'Done']

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-700/20 rounded-full blur-[140px]" />
        <div className="glow-orb absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-800/15 rounded-full blur-[100px]" style={{ animationDelay: '3s' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.06] backdrop-blur-xl bg-black/60 px-8 py-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              <span className="relative text-sm font-black text-white tracking-tighter z-10">N</span>
            </div>
            <span className="font-bold text-white tracking-tight text-sm">
              <span className="gradient-text-white font-black">NOOR</span>
              <span className="text-zinc-600 font-medium ml-1">STUDIO</span>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors duration-150 group"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform"><path d="M10 7H2M5 3L1 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-8 py-16">

        {/* ───── GENERATING STATE ───── */}
        {phase === 'generating' && (
          <div className="text-center py-24 animate-slide-up">
            <div className="relative w-16 h-16 mx-auto mb-12">
              <div className="absolute inset-0 rounded-full border border-amber-500/20" />
              <div className="absolute inset-0 rounded-full border border-transparent border-t-amber-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border border-transparent border-t-amber-400/40 animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>

            <div className="flex items-center justify-center gap-0 mb-10">
              {genSteps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all duration-300 ${
                      genStep > i + 1
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : genStep === i + 1
                          ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/40'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-600'
                    }`}>
                      {genStep > i + 1 ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors duration-300 whitespace-nowrap ${
                      genStep > i + 1 ? 'text-emerald-500' : genStep === i + 1 ? 'text-amber-400' : 'text-zinc-700'
                    }`}>{s}</span>
                  </div>
                  {i < genSteps.length - 1 && (
                    <div className={`w-10 h-px mb-4 mx-1 transition-all duration-500 ${genStep > i + 1 ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
                  )}
                </div>
              ))}
            </div>

            <p className="text-zinc-500 text-sm font-medium">
              {genStep === 1 && 'Analysing your content...'}
              {genStep === 2 && 'Writing 3 unique script variations...'}
              {genStep === 3 && 'Building your visual storyboard...'}
              {genStep === 4 && 'Done! Redirecting you now...'}
            </p>
          </div>
        )}

        {/* ───── TRANSCRIBING STATE ───── */}
        {phase === 'transcribing' && (
          <div className="text-center py-24 animate-slide-up">
            <div className="relative w-20 h-20 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full border border-amber-500/15 animate-[pulse-ring_2.2s_ease-out_infinite]" />
              <div className="absolute inset-0 rounded-full border border-amber-500/10 animate-[pulse-ring_2.2s_ease-out_infinite_0.6s]" />
              <div className="absolute inset-0 rounded-full border border-transparent border-t-amber-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                {mode === 'image' ? (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="#fbbf24" strokeWidth="1.4"/><circle cx="7.5" cy="9" r="1.5" stroke="#fbbf24" strokeWidth="1.3"/><path d="M2 16l5-5 3.5 3.5L14 10l6 6" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : mode === 'pdf' ? (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M13 2H5a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round"/><path d="M13 2v6h6" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="8" y="2" width="6" height="12" rx="3" stroke="#fbbf24" strokeWidth="1.4"/><path d="M4 11c0 3.87 3.13 7 7 7s7-3.13 7-7" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 18v2" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/></svg>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {mode === 'image' ? 'Analysing Image' : mode === 'pdf' ? 'Extracting Content' : mode === 'voice' ? 'Transcribing Voice' : 'Transcribing Video'}
            </h2>
            <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
              {mode === 'image' ? 'Claude Vision is analysing your image...' : mode === 'pdf' ? 'Extracting text from your PDF...' : mode === 'voice' ? 'OpenAI Whisper is transcribing your voice note...' : 'Extracting spoken content from your video...'}
            </p>

            <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
              {(mode === 'image'
                ? ['Reading image pixels', 'Running visual analysis', 'Writing content description']
                : mode === 'pdf'
                ? ['Reading PDF file', 'Extracting text content', 'Preparing for generation']
                : mode === 'voice'
                ? ['Processing audio recording', 'Running Whisper speech recognition', 'Cleaning up transcript']
                : ['Downloading video audio', 'Running speech recognition', 'Cleaning up transcript']
              ).map((s, i) => (
                <div key={s} className="flex items-center gap-3 text-sm text-zinc-500 glass rounded-xl px-4 py-3">
                  <div
                    className="w-3.5 h-3.5 border border-amber-500/70 border-t-transparent rounded-full animate-spin shrink-0"
                    style={{ animationDelay: `${i * 0.35}s` }}
                  />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───── POSTER RECREATE STATE (image mode) ───── */}
        {phase === 'transcript-ready' && mode === 'image' && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Image Analysed</h2>
                <p className="text-zinc-500 text-sm mt-0.5">What do you want to do with this poster?</p>
              </div>
            </div>

            {/* Analysis summary */}
            {imageAnalysis.summary && (
              <div className="mb-6 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-bold">Poster Analysis</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{String(imageAnalysis.summary ?? '')}</p>
              </div>
            )}

            {/* Intent cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { id: 'same-poster', label: '🖼️ Same Poster', desc: 'Recreate exact same layout & design with your photo enhanced' },
                { id: 'custom-brief', label: '✏️ Custom Brief', desc: 'Tell me what to change — text, colors, layout' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setIntent(opt.id); setPosterUrl(''); setError('') }}
                  className={`p-4 rounded-xl border text-left transition-all ${intent === opt.id ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'}`}
                >
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom brief input */}
            {intent === 'custom-brief' && (
              <div className="mb-5">
                <textarea
                  value={customBrief}
                  onChange={(e) => setCustomBrief(e.target.value)}
                  placeholder="E.g. Change the background to dark blue, keep my photo, add text 'Sale 50% Off' at the top in bold white..."
                  rows={4}
                  className="w-full bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-3 text-zinc-300 text-sm leading-6 focus:outline-none focus:border-amber-500/40 resize-none"
                />
              </div>
            )}

            {/* Generated poster result */}
            {posterUrl && (
              <div className="mb-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">Generated Poster</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={posterUrl} alt="Recreated poster" className="w-full rounded-xl border border-white/[0.07]" />
                <div className="flex gap-2 mt-3">
                  <a href={posterUrl} download="poster.jpg" className="btn-primary text-sm px-4 py-2 rounded-xl">↓ Download</a>
                  <button onClick={() => { setPosterUrl(''); setIntent('') }} className="btn-ghost text-sm px-4 py-2 rounded-xl">Try Again</button>
                </div>
                {posterPrompt && (
                  <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{posterPrompt}</p>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('input'); setIntent(''); setPosterUrl(''); setError(''); setCustomBrief('') }}
                className="btn-ghost flex-1 text-zinc-400 font-medium py-3.5 rounded-xl text-sm"
              >
                ← Try Again
              </button>
              {!posterUrl && (
                <button
                  onClick={handlePosterRecreate}
                  disabled={!intent || generatingPoster || (intent === 'custom-brief' && customBrief.trim().length < 10)}
                  className="btn-primary flex-[2] text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {generatingPoster ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Recreating poster…
                    </span>
                  ) : intent === 'same-poster' ? '🖼️ Recreate Same Poster →' : intent === 'custom-brief' ? '✏️ Generate Custom Poster →' : 'Select an option above'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ───── TRANSCRIPT READY STATE ───── */}
        {phase === 'transcript-ready' && mode !== 'image' && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {mode === 'image' ? 'Image Analysed' : mode === 'pdf' ? 'Content Extracted' : mode === 'voice' ? 'Voice Transcribed' : 'Transcript Ready'}
                </h2>
                <p className="text-zinc-500 text-sm mt-0.5">
                  Extracted via <span className="text-amber-400 font-semibold">{transcriptMethod}</span>
                </p>
              </div>
            </div>

            {/* B-Roll hint strip — only for video modes */}
            {(mode === 'video' || mode === 'video-file') && (
              <div className="flex items-start gap-3 mb-7 p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.06]">
                <div className="shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="#fbbf24" strokeWidth="1.3"/><path d="M6 6l4 2-4 2V6z" fill="#fbbf24"/></svg>
                </div>
                <p className="text-xs text-amber-300 leading-relaxed">
                  <span className="font-semibold text-amber-200">B-Roll &amp; Frames</span> — after you generate, open the project and click{' '}
                  <span className="font-semibold text-white">Extract B-Roll</span> in the top bar to pull frames and clips from this video.
                </p>
              </div>
            )}

            {/* Content editor */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">
                  {mode === 'image' ? 'Image Analysis' : mode === 'pdf' ? 'Extracted Content' : 'Transcript'}
                </label>
                <span className="text-[10px] text-zinc-700 tabular-nums">{transcript.split(' ').length} words</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] focus-within:border-amber-500/40 transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(245,166,35,0.1)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={12}
                  className="w-full bg-white/[0.025] px-5 py-4 text-zinc-300 text-sm leading-7 focus:outline-none resize-none font-[var(--font-geist-mono)]"
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
              <p className="text-zinc-700 text-xs mt-2">You can edit the content above before generating</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0"><path d="M7 2L1.5 12h11L7 2z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3M7 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Intent selection */}
            <div className="mb-6">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] mb-3">What do you want to do with this?</p>
              <div className={`grid gap-2 ${formatType === 'landscape' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {formatType === 'vertical' ? (
                  <>
                    {[
                      { id: 'better-hook', label: '🎯 Better Hook', desc: 'Same vibe, stronger opening' },
                      { id: 'translate', label: '🌐 Translate & Rewrite', desc: 'Change language or style' },
                      { id: 'fresh-angle', label: '✨ Fresh Script', desc: 'New angle, same topic' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setIntent(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${intent === opt.id ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'}`}
                      >
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { id: 'better-hook', label: '🎯 Better Hook', desc: 'Stronger opening' },
                      { id: 'translate', label: '🌐 Translate', desc: 'Change language' },
                      { id: 'fresh-angle', label: '✨ Fresh Angle', desc: 'New perspective' },
                      { id: 'short-reel', label: '✂️ Make it Short', desc: 'Condense to a reel' },
                      { id: 'same-script', label: '📝 Same Script', desc: 'Better language' },
                      { id: 'key-points', label: '📌 Key Points', desc: 'Extract highlights' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setIntent(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${intent === opt.id ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20'}`}
                      >
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('input'); setTranscript(''); setError(''); setIntent('') }}
                className="btn-ghost flex-1 text-zinc-400 font-medium py-3.5 rounded-xl text-sm"
              >
                ← Try Again
              </button>
              <button
                onClick={() => handleGenerate(mode)}
                disabled={transcript.trim().length < 20 || !intent}
                className="btn-primary flex-[2] text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
              >
                {intent ? `Generate → ${[
                  { id: 'better-hook', label: 'Better Hook' },
                  { id: 'translate', label: 'Translate & Rewrite' },
                  { id: 'fresh-angle', label: 'Fresh Angle' },
                  { id: 'short-reel', label: 'Short Reel' },
                  { id: 'same-script', label: 'Same Script' },
                  { id: 'key-points', label: 'Key Points' },
                ].find(o => o.id === intent)?.label ?? intent}` : 'Select an option above'}
              </button>
            </div>
          </div>
        )}

        {/* ───── INPUT STATE ───── */}
        {phase === 'input' && (
          <div className="animate-slide-up">
            <div className="mb-10">
              <p className="text-[11px] font-bold tracking-[0.18em] text-amber-500 uppercase mb-3">New Project</p>
              <h1 className="text-4xl font-black tracking-tight mb-3">
                <span className="gradient-text-white">What are we</span>
                <br />
                <span className="gradient-text">creating today?</span>
              </h1>
              <p className="text-zinc-500 text-sm">One input. Noor does everything else.</p>
            </div>

            {/* Mode selector — 6 cards in 3+3 grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {MODE_CONFIG.slice(0, 3).map((m) => {
                const isSelected = mode === m.key
                return (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setError(''); setSelectedFile(null); setAudioBlob(null); if (isRecording) handleStopRecording() }}
                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'border-amber-500/50 bg-gradient-to-br from-amber-600/12 to-amber-600/6 shadow-lg shadow-amber-600/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]'
                    }`}
                  >
                    {isSelected && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full shadow-md shadow-amber-500/50" />
                      </>
                    )}
                    <div className={`mb-2.5 transition-colors duration-200 ${isSelected ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {m.icon}
                    </div>
                    <div className={`font-bold mb-1 text-xs transition-colors duration-200 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      {m.title}
                    </div>
                    <div className="text-zinc-600 text-[10px] leading-relaxed">{m.desc}</div>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-8">
              {MODE_CONFIG.slice(3).map((m) => {
                const isSelected = mode === m.key
                return (
                  <button
                    key={m.key}
                    onClick={() => { setMode(m.key); setError(''); setSelectedFile(null); setAudioBlob(null); if (isRecording) handleStopRecording() }}
                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'border-amber-500/50 bg-gradient-to-br from-amber-600/12 to-amber-600/6 shadow-lg shadow-amber-600/10'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.10] hover:bg-white/[0.04]'
                    }`}
                  >
                    {isSelected && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full shadow-md shadow-amber-500/50" />
                      </>
                    )}
                    <div className={`mb-2.5 transition-colors duration-200 ${isSelected ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {m.icon}
                    </div>
                    <div className={`font-bold mb-1 text-xs transition-colors duration-200 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      {m.title}
                    </div>
                    <div className="text-zinc-600 text-[10px] leading-relaxed">{m.desc}</div>
                  </button>
                )
              })}
            </div>

            {/* Format Type selector */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                Format
              </label>
              <div className="flex gap-2 p-1 bg-white/[0.025] border border-white/[0.06] rounded-xl w-fit">
                {([
                  { key: 'vertical' as FormatType, label: 'Vertical (Short-form)', icon: (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                  ) },
                  { key: 'landscape' as FormatType, label: 'Landscape (Long-form)', icon: (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                  ) },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleFormatChange(f.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      formatType === f.key
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-700/40'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform selector */}
            <div className="mb-8">
              <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                Platform
              </label>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => {
                  const isSelected = platform === p
                  return (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'border-amber-500/50 bg-amber-600/15 text-amber-300 shadow-sm shadow-amber-600/10'
                          : 'border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:border-white/[0.14] hover:text-zinc-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Topic input */}
            {mode === 'topic' && (
              <div className="mb-7">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                  What is your content about?
                </label>
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] focus-within:border-amber-500/40 transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]">
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Why 95% of Indian traders lose money in F&O"
                    rows={4}
                    className="w-full bg-white/[0.025] px-5 py-4 text-white placeholder-zinc-700 focus:outline-none resize-none text-sm leading-relaxed"
                  />
                </div>
                <p className="text-zinc-700 text-xs mt-2">Be specific — a better topic produces a better script</p>
              </div>
            )}

            {/* Voice recording */}
            {mode === 'voice' && (
              <div className="mb-7">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                  Record your idea
                </label>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 flex flex-col items-center gap-5">

                  {/* Mic button */}
                  <button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isRecording
                        ? 'bg-red-500/20 border-2 border-red-500/60 shadow-lg shadow-red-500/20'
                        : 'bg-amber-600/15 border-2 border-amber-500/40 hover:bg-amber-600/25 hover:border-amber-500/70 shadow-lg shadow-amber-600/10'
                    }`}
                  >
                    {isRecording && (
                      <div className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
                    )}
                    {isRecording ? (
                      /* Stop icon */
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <rect x="5" y="5" width="12" height="12" rx="2" fill="#f87171"/>
                      </svg>
                    ) : (
                      /* Mic icon */
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="2" width="6" height="13" rx="3" stroke="#fbbf24" strokeWidth="1.6"/>
                        <path d="M5 12c0 3.87 3.13 7 7 7s7-3.13 7-7" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round"/>
                        <path d="M12 19v3" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Status text */}
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-sm font-semibold">Recording…</span>
                      </div>
                      <span className="text-zinc-600 text-xs tabular-nums">
                        {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                      </span>
                      <p className="text-zinc-700 text-xs mt-1">Click the button to stop</p>
                    </div>
                  ) : audioBlob ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Recording saved!
                      </div>
                      <p className="text-zinc-600 text-xs">{recordingSeconds}s recorded · Click mic to re-record</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-zinc-400 text-sm font-medium">Click to start recording</p>
                      <p className="text-zinc-700 text-xs mt-1">Speak your content idea — Whisper AI will transcribe it</p>
                    </div>
                  )}

                  {/* Audio playback preview */}
                  {audioBlob && !isRecording && (
                    <audio
                      src={URL.createObjectURL(audioBlob)}
                      controls
                      className="w-full h-8 opacity-60"
                    />
                  )}

                  {/* Upload audio file */}
                  {!isRecording && (
                    <div className="w-full border-t border-white/[0.06] pt-4 flex flex-col items-center gap-2">
                      <p className="text-zinc-600 text-xs">— or upload an audio file —</p>
                      <label
                        onDragOver={(e) => { e.preventDefault(); setIsAudioDragging(true) }}
                        onDragLeave={() => setIsAudioDragging(false)}
                        onDrop={(e) => handleFileDrop(e, 'audio')}
                        className={`cursor-pointer w-full border-2 border-dashed rounded-xl px-4 py-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                          isAudioDragging
                            ? 'border-amber-500/70 bg-amber-500/[0.08]'
                            : audioBlob instanceof File
                              ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
                              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]'
                        }`}
                      >
                        {isAudioDragging ? (
                          <p className="text-amber-400 text-xs font-semibold">Drop audio file!</p>
                        ) : audioBlob instanceof File ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <p className="text-emerald-400 text-xs font-medium">{(audioBlob as File).name}</p>
                            <p className="text-zinc-600 text-[10px]">Click to change</p>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round"/></svg>
                            <p className="text-zinc-400 text-xs font-medium">Drag & drop or click to upload</p>
                            <p className="text-zinc-700 text-[10px]">MP3, M4A, WAV · Max 24MB</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            if (f.size > 24 * 1024 * 1024) { setError('Audio file too large. Maximum is 24MB.'); return }
                            setAudioBlob(f)
                            setError('')
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video URL input */}
            {mode === 'video' && (
              <div className="mb-7">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                  Paste video link
                </label>
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] focus-within:border-amber-500/40 transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(245,166,35,0.08)]">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 4H11a3 3 0 010 6H8.5M6.5 11H4a3 3 0 010-6h2.5M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white/[0.025] pl-11 pr-5 py-4 text-white placeholder-zinc-700 focus:outline-none text-sm"
                  />
                </div>
                <p className="text-zinc-700 text-xs mt-2">Supports YouTube, Instagram, TikTok, Facebook, Twitter</p>
              </div>
            )}

            {/* File upload — video-file, image, pdf modes */}
            {(mode === 'video-file' || mode === 'image' || mode === 'pdf') && (
              <div className="mb-7">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">
                  {mode === 'video-file' ? 'Upload Video File' : mode === 'image' ? 'Upload Image' : 'Upload PDF'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={fileAccept()}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setSelectedFile(f)
                    setError('')
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => handleFileDrop(e, 'file')}
                  className={`w-full border-2 border-dashed rounded-2xl px-6 py-10 text-center transition-all duration-200 cursor-pointer ${
                    isDragging
                      ? 'border-amber-500/70 bg-amber-500/[0.10] scale-[1.01]'
                      : selectedFile
                        ? 'border-amber-500/40 bg-amber-500/[0.06]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]'
                  }`}
                >
                  {isDragging ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 7l4-4 4 4" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <p className="text-amber-400 text-sm font-semibold">Drop it!</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4L15 5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span className="text-white text-sm font-semibold">{selectedFile.name}</span>
                      <span className="text-zinc-500 text-xs">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center text-zinc-600">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div>
                        <p className="text-zinc-300 text-sm font-medium">Drag & drop or click to browse</p>
                        <p className="text-zinc-600 text-xs mt-1">
                          {mode === 'video-file' ? 'MP4, MOV, AVI, MKV' : mode === 'image' ? 'JPEG, PNG, WebP' : 'PDF files'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0"><path d="M7 2L1.5 12h11L7 2z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3M7 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handlePrimaryAction}
              disabled={isPrimaryDisabled()}
              className="btn-primary w-full text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
            >
              {primaryButtonLabel()}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

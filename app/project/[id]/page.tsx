'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

type Script = { variation: number; hook: string; body: string; cta: string; intro?: string; sections?: Array<{ title: string; content: string }>; outro?: string }
type Scene = { scene: number; duration: string; visual: string; on_screen_text: string; broll_keyword: string; voiceover: string }
type Brief = { topic: string; angle: string; tone: string; target_audience: string }
type Project = {
  id: string; title: string; input_type: string; video_url?: string
  brief: Brief; scripts: Script[]; storyboard: Scene[]
  selected_script: number; status: string
  topic?: string; transcript?: string; platform?: string
  format_type?: 'vertical' | 'landscape'
}

type SocialCopy = {
  hashtags: string[]
  caption: string
  first_comment: string
}

const toneConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  educational:  { color: 'text-blue-400',   bg: 'bg-blue-500/8',   border: 'border-blue-500/20',   label: 'Educational' },
  promotional:  { color: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/20', label: 'Promotional' },
  storytelling: { color: 'text-pink-400',   bg: 'bg-pink-500/8',   border: 'border-pink-500/20',   label: 'Storytelling' },
  entertaining: { color: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/20', label: 'Entertaining' },
}

const REGEN_TONES = ['Educational', 'Entertaining', 'Storytelling', 'Promotional']

export default function ProjectPage() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<'scripts' | 'storyboard' | 'broll' | 'publish'>('scripts')
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [frames, setFrames] = useState<string[]>([])
  const [clips, setClips] = useState<string[]>([])
  const [extractError, setExtractError] = useState('')
  const [confirmReextract, setConfirmReextract] = useState(false)

  // Feature 3: Copy to clipboard
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Feature 4: Inline editing
  const [editingScript, setEditingScript] = useState<number | null>(null)
  const [draftScripts, setDraftScripts] = useState<Script[]>([])

  // Feature 5: Regenerate
  const [showRegenPanel, setShowRegenPanel] = useState(false)
  const [regenTone, setRegenTone] = useState('Educational')
  const [regenAngle, setRegenAngle] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')

  // Feature 6: Social copy
  const [socialCopy, setSocialCopy] = useState<SocialCopy | null>(null)
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialError, setSocialError] = useState('')
  const [copiedSocial, setCopiedSocial] = useState<string | null>(null)

  // Thumbnail generation
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [thumbnailPrompt, setThumbnailPrompt] = useState<string>('')
  const [thumbnailLoading, setThumbnailLoading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        setProject(data)
        setSelected(data.selected_script ?? 0)
        setDraftScripts(data.scripts ?? [])
        if (data.brief?.tone) {
          const matchedTone = REGEN_TONES.find(t => t.toLowerCase() === data.brief.tone.toLowerCase())
          if (matchedTone) setRegenTone(matchedTone)
        }
        // Check if B-roll was already extracted previously
        fetch(`/api/extract?projectId=${data.id}`)
          .then(r => r.json())
          .then(e => { setFrames(e.frames || []); setClips(e.clips || []) })
          .catch(() => {})
      })
  }, [id])

  async function saveSelection(index: number) {
    setSaving(true)
    setSelected(index)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_script: index, status: 'completed' }),
    })
    setSaving(false)
  }

  async function handleExtract() {
    if (!project?.video_url) return
    // If frames already exist, show confirmation first
    if (frames.length > 0 && !confirmReextract) {
      setConfirmReextract(true)
      return
    }
    setConfirmReextract(false)
    setExtractError('')
    setExtracting(true)
    setTab('broll')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: project.video_url, projectId: project.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFrames(data.frames || [])
      setClips(data.clips || [])
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  async function exportPDF() {
    if (!project) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const script = project.scripts[selected]
    const margin = 15; let y = 20
    const addText = (text: string, size: number, bold = false) => {
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const lines = doc.splitTextToSize(text, 180)
      doc.text(lines, margin, y); y += lines.length * (size * 0.4) + 4
    }
    addText('NOOR STUDIO', 20, true); addText(project.title, 16, true); y += 6
    addText('CONTENT BRIEF', 12, true)
    addText(`Topic: ${project.brief.topic}`, 10); addText(`Angle: ${project.brief.angle}`, 10)
    addText(`Tone: ${project.brief.tone}`, 10); addText(`Audience: ${project.brief.target_audience}`, 10)
    y += 6; addText('SELECTED SCRIPT', 12, true)
    if (project.format_type === 'landscape') {
      addText(`Intro: ${script.intro || ''}`, 10)
      ;(script.sections || []).forEach((s, idx) => {
        addText(`Section ${idx + 1} — ${s.title}: ${s.content}`, 10)
      })
      addText(`Outro: ${script.outro || ''}`, 10); addText(`CTA: ${script.cta}`, 10)
    } else {
      addText(`Hook (0-6s): ${script.hook}`, 10); addText(`Body: ${script.body}`, 10); addText(`CTA: ${script.cta}`, 10)
    }
    doc.addPage(); y = 20; addText('STORYBOARD', 14, true); y += 4
    project.storyboard.forEach((scene) => {
      if (y > 260) { doc.addPage(); y = 20 }
      addText(`Scene ${scene.scene} (${scene.duration})`, 11, true)
      addText(`Visual: ${scene.visual}`, 9); addText(`Text: ${scene.on_screen_text}`, 9)
      addText(`B-roll: ${scene.broll_keyword}`, 9); addText(`VO: ${scene.voiceover}`, 9); y += 4
    })
    doc.save(`${project.title.replace(/\s+/g, '_')}_noor_studio.pdf`)
  }

  // Feature 3: Copy script to clipboard
  async function copyScript(i: number, script: Script) {
    let text: string
    if (project?.format_type === 'landscape') {
      const sectionsText = (script.sections || []).map((s, idx) => `Section ${idx + 1} — ${s.title}:\n${s.content}`).join('\n\n')
      text = `Intro: ${script.intro}\n\n${sectionsText}\n\nOutro: ${script.outro}\n\nCTA: ${script.cta}`
    } else {
      text = `Hook: ${script.hook}\n\nBody: ${script.body}\n\nCTA: ${script.cta}`
    }
    await navigator.clipboard.writeText(text)
    setCopiedIdx(i)
    toast.success('Script copied to clipboard!')
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  // Feature 4: Save edited script
  async function saveEditedScript() {
    if (!project || editingScript === null) return
    setSaving(true)
    toast.loading('Saving changes...')
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scripts: draftScripts }),
    })
    const updated = await res.json()
    setProject(prev => prev ? { ...prev, scripts: updated.scripts } : null)
    setDraftScripts(updated.scripts)
    setEditingScript(null)
    setSaving(false)
    toast.success('Changes saved!')
  }

  function cancelEdit() {
    if (!project) return
    setDraftScripts(project.scripts)
    setEditingScript(null)
  }

  function updateDraft(i: number, field: keyof Script, value: string) {
    setDraftScripts(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const isLandscape = project?.format_type === 'landscape'

  // Feature 5: Regenerate scripts
  async function handleRegenerate() {
    if (!project) return
    setRegenerating(true)
    setRegenError('')
    try {
      // For new input modes, use 'video' mode (transcript-based) except for topic
      const apiMode = project.input_type === 'topic' ? 'topic' : 'video'
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: apiMode,
          topic: project.topic,
          transcript: project.transcript,
          videoUrl: project.video_url,
          platform: project.platform,
          tone_override: regenTone,
          angle_hint: regenAngle.trim() || undefined,
          project_id: project.id,
          format_type: project.format_type || 'vertical',
          input_type: project.input_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Reload project with updated scripts
      const updated = await fetch(`/api/projects/${id}`).then(r => r.json())
      setProject(updated)
      setDraftScripts(updated.scripts)
      setSelected(0)
      setShowRegenPanel(false)
      setRegenAngle('')
    } catch (err: unknown) {
      setRegenError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  // Feature 6: Generate social copy
  async function handleGenerateSocial() {
    if (!project) return
    setSocialLoading(true)
    setSocialError('')
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          brief: project.brief,
          scripts: [project.scripts[selected]],
          platform: project.platform || 'Instagram Reels',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSocialCopy(data)
    } catch (err: unknown) {
      setSocialError(err instanceof Error ? err.message : 'Failed to generate social copy')
    } finally {
      setSocialLoading(false)
    }
  }

  async function copySocialText(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedSocial(key)
    setTimeout(() => setCopiedSocial(null), 2000)
  }

  // Thumbnail generation via DALL-E 3
  async function handleGenerateThumbnail() {
    if (!project) return
    setThumbnailLoading(true)
    setThumbnailError('')
    setThumbnailUrl(null)
    try {
      const res = await fetch('/api/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          topic: project.brief.topic,
          angle: project.brief.angle,
          tone: project.brief.tone,
          platform: project.platform,
          format_type: project.format_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setThumbnailUrl(data.image_url)
      setThumbnailPrompt(data.prompt)
    } catch (err: unknown) {
      setThumbnailError(err instanceof Error ? err.message : 'Thumbnail generation failed')
    } finally {
      setThumbnailLoading(false)
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border border-transparent border-t-amber-500 animate-spin" />
          </div>
          <p className="text-zinc-600 text-sm font-medium">Loading project...</p>
        </div>
      </div>
    )
  }

  const tone = toneConfig[project.brief.tone] || { color: 'text-zinc-400', bg: 'bg-zinc-800/50', border: 'border-zinc-700/50', label: project.brief.tone }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb absolute -top-48 right-1/4 w-[600px] h-[600px] bg-amber-700/18 rounded-full blur-[140px]" />
        <div className="glow-orb absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-amber-800/12 rounded-full blur-[100px]" style={{ animationDelay: '3s' }} />
      </div>

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] px-8 py-0 backdrop-blur-xl bg-black/70">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors group">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform"><path d="M10 7H2M5 3L1 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Dashboard
            </Link>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-6 h-6 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800" />
                <span className="relative text-[11px] font-black text-white z-10">N</span>
              </div>
              <span className="text-xs font-bold text-zinc-400">Noor Studio</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2.5">
            {project?.input_type === 'video' && project?.video_url && (
              confirmReextract ? (
                <div className="flex items-center gap-1.5 glass border border-orange-500/25 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-zinc-300 font-medium">Re-extract? This overwrites existing frames.</span>
                  <button
                    onClick={handleExtract}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors px-2"
                  >Yes</button>
                  <span className="text-zinc-700 text-xs">/</span>
                  <button
                    onClick={() => setConfirmReextract(false)}
                    className="text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors px-2"
                  >No</button>
                </div>
              ) : (
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="btn-ghost flex items-center gap-2 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-40"
                >
                  {extracting ? (
                    <>
                      <span className="w-3.5 h-3.5 border border-amber-400/70 border-t-transparent rounded-full animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 5.5l3 1.5-3 1.5V5.5z" fill="currentColor"/></svg>
                      {frames.length > 0 ? 'Re-extract B-Roll' : 'Extract B-Roll'}
                    </>
                  )}
                </button>
              )
            )}

            {/* Feature 5: Regenerate button */}
            <button
              onClick={() => { setShowRegenPanel(prev => !prev); setRegenError('') }}
              className="btn-ghost flex items-center gap-2 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 7A5.5 5.5 0 0112.5 5M12.5 7A5.5 5.5 0 011.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10.5 3.5L12.5 5l-2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 10.5L1.5 9l2-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Regenerate
            </button>

            <button
              onClick={exportPDF}
              className="btn-ghost flex items-center gap-2 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Feature 5: Regenerate panel — inline below nav */}
      {showRegenPanel && (
        <div className="relative z-10 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl animate-slide-up">
          <div className="max-w-5xl mx-auto px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Tone selector */}
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-2.5">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {REGEN_TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setRegenTone(t)}
                      className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                        regenTone === t
                          ? 'border-amber-500/50 bg-amber-600/15 text-amber-300'
                          : 'border-white/[0.08] text-zinc-500 hover:border-white/[0.14] hover:text-zinc-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle input */}
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-2.5">Different angle? (optional)</label>
                <input
                  type="text"
                  value={regenAngle}
                  onChange={e => setRegenAngle(e.target.value)}
                  placeholder="e.g. Focus on beginners, use humour..."
                  className="input-glass w-full rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {regenError && <p className="text-red-400 text-xs">{regenError}</p>}
                <button
                  onClick={() => { setShowRegenPanel(false); setRegenError(''); setRegenAngle('') }}
                  className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="btn-primary flex items-center gap-2 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-40 disabled:transform-none"
                >
                  {regenerating ? (
                    <>
                      <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate Scripts'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-10">

        {/* Project Header */}
        <div className="mb-10 animate-slide-up">
          <div className="flex items-center gap-2 mb-5">
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${tone.bg} ${tone.color} ${tone.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tone.color.replace('text-', 'bg-')}`} />
              {tone.label}
            </span>
            <span className="text-[10px] text-zinc-600 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
              {project.input_type === 'video' ? 'From video link'
                : project.input_type === 'video-file' ? 'From video file'
                : project.input_type === 'image' ? 'From image'
                : project.input_type === 'pdf' ? 'From PDF'
                : 'From topic'}
            </span>
            {project.format_type && (
              <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold border ${
                project.format_type === 'landscape'
                  ? 'text-blue-400 bg-blue-500/[0.08] border-blue-500/20'
                  : 'text-zinc-500 bg-white/[0.03] border-white/[0.06]'
              }`}>
                {project.format_type === 'landscape' ? 'Landscape' : 'Vertical'}
              </span>
            )}
            {project.platform && (
              <span className="text-[10px] text-amber-400 bg-amber-500/[0.08] border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest font-bold">
                {project.platform}
              </span>
            )}
          </div>
          <h1 className="text-4xl font-black tracking-tight gradient-text-white leading-tight">{project.title}</h1>
        </div>

        {/* Brief card */}
        <div className="relative glass rounded-3xl overflow-hidden mb-8 card-hover">
          {/* Purple gradient right side */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-600/[0.07] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

          <div className="relative p-7">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-6">Content Brief</p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-6">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-2">Core Topic</p>
                <p className="text-white text-sm font-medium leading-relaxed">{project.brief.topic}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-2">Unique Angle</p>
                <p className="text-white text-sm font-medium leading-relaxed">{project.brief.angle}</p>
              </div>
              <div className="col-span-2 pt-5 border-t border-white/[0.05]">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-2">Target Audience</p>
                <p className="text-zinc-400 text-sm leading-relaxed">{project.brief.target_audience}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-white/[0.025] border border-white/[0.06] rounded-xl w-fit">
          {[
            { key: 'scripts',    label: 'Scripts' },
            { key: 'storyboard', label: 'Storyboard' },
            ...(project.input_type === 'video'
              ? [{ key: 'broll', label: 'B-Roll' }]
              : []),
            { key: 'publish', label: 'Publish' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'scripts' | 'storyboard' | 'broll' | 'publish')}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-700/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
              {t.key === 'broll' && frames.length > 0 && (
                <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full tabular-nums">
                  {frames.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Scripts tab ─── */}
        {tab === 'scripts' && (
          <div className="space-y-5 animate-fade-in">
            <p className="text-zinc-600 text-xs font-medium uppercase tracking-widest">Select the variation you want to use</p>
            {draftScripts.map((script, i) => {
              const isEditing = editingScript === i
              const isSelected = selected === i

              return (
                <div
                  key={i}
                  onClick={() => { if (!isEditing) saveSelection(i) }}
                  className={`relative border rounded-3xl transition-all duration-250 overflow-hidden group ${
                    isEditing ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'border-amber-500/40 shadow-2xl shadow-amber-600/12'
                      : 'border-white/[0.06] hover:border-white/[0.11]'
                  }`}
                >
                  {/* Selected bg gradient */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600/[0.09] via-transparent to-amber-600/[0.04] pointer-events-none" />
                  )}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isSelected ? 1 : undefined }} />

                  {/* Header row */}
                  <div className="flex items-center justify-between px-6 pt-6 pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                          : 'bg-white/[0.04] text-zinc-500 border-white/[0.08]'
                      }`}>
                        V{script.variation}
                      </span>
                      {isLandscape && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/8 border border-blue-500/15 px-2.5 py-1 rounded-full uppercase tracking-widest">
                          Long-form
                        </span>
                      )}
                      {isSelected && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          {saving ? 'Saving...' : 'Selected'}
                        </span>
                      )}
                    </div>

                    {/* Feature 3: Copy button + Feature 4: Edit button */}
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {/* Copy button — always visible */}
                      <button
                        onClick={() => copyScript(i, script)}
                        className="btn-ghost flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                      >
                        {copiedIdx === i ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 7.5V2a.5.5 0 01.5-.5h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                            Copy
                          </>
                        )}
                      </button>

                      {/* Edit toggle — only when this card is selected */}
                      {isSelected && !isEditing && (
                        <button
                          onClick={() => setEditingScript(i)}
                          className="btn-ghost flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2-5 5H2.5v-2l5-5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── LANDSCAPE SCRIPT LAYOUT ── */}
                  {isLandscape ? (
                    <>
                      {/* Intro panel */}
                      <div className="mx-6 mt-5 mb-4 rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-amber-500/8 border border-blue-500/20 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-blue-400 rounded-full" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Intro</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              value={script.intro || ''}
                              onChange={e => updateDraft(i, 'intro', e.target.value)}
                              rows={3}
                              className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-blue-100 font-bold"
                            />
                          ) : (
                            <p className="text-blue-100 font-semibold text-sm leading-relaxed">{script.intro}</p>
                          )}
                        </div>
                      </div>

                      {/* Sections */}
                      <div className="px-6 pb-4 space-y-3">
                        {(script.sections || []).map((section, si) => (
                          <div key={si} className="border border-white/[0.06] rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 text-[10px] font-black text-amber-400">{si + 1}</span>
                              <span className="text-sm font-bold text-white">{section.title}</span>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-zinc-300 text-sm leading-7">{section.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Outro */}
                      <div className="px-6 pb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-0.5 h-full bg-white/[0.06] rounded-full mt-0.5 self-stretch" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-2">Outro</p>
                            {isEditing ? (
                              <textarea
                                value={script.outro || ''}
                                onChange={e => updateDraft(i, 'outro', e.target.value)}
                                rows={3}
                                className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-zinc-300"
                              />
                            ) : (
                              <p className="text-zinc-300 text-sm leading-7">{script.outro}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CTA strip */}
                      <div className="mx-6 mb-6 p-4 bg-emerald-500/[0.07] border border-emerald-500/15 rounded-2xl">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em] mb-2">Call to Action</p>
                        {isEditing ? (
                          <textarea
                            value={script.cta}
                            onChange={e => updateDraft(i, 'cta', e.target.value)}
                            rows={2}
                            className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-emerald-300 font-semibold"
                          />
                        ) : (
                          <p className="text-emerald-300 text-sm font-semibold leading-relaxed">{script.cta}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* ── VERTICAL SCRIPT LAYOUT ── */}
                      {/* Hook panel */}
                      <div className="mx-6 mt-5 mb-5 rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-br from-amber-500/18 via-yellow-500/12 to-orange-500/8 border border-amber-500/20 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Hook · 0–6 Seconds</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              value={script.hook}
                              onChange={e => updateDraft(i, 'hook', e.target.value)}
                              rows={2}
                              className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-amber-100 font-bold"
                            />
                          ) : (
                            <p className="text-amber-100 font-bold text-base leading-relaxed">{script.hook}</p>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="px-6 pb-5">
                        <div className="flex items-start gap-4">
                          <div className="w-0.5 h-full bg-white/[0.06] rounded-full mt-0.5 self-stretch" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">Body</p>
                            {isEditing ? (
                              <textarea
                                value={script.body}
                                onChange={e => updateDraft(i, 'body', e.target.value)}
                                rows={4}
                                className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-zinc-300"
                              />
                            ) : (
                              <p className="text-zinc-300 text-sm leading-7">{script.body}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CTA strip */}
                      <div className="mx-6 mb-6 p-4 bg-emerald-500/[0.07] border border-emerald-500/15 rounded-2xl">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em] mb-2">Call to Action</p>
                        {isEditing ? (
                          <textarea
                            value={script.cta}
                            onChange={e => updateDraft(i, 'cta', e.target.value)}
                            rows={2}
                            className="input-glass rounded-xl px-3 py-2 text-sm w-full resize-none text-emerald-300 font-semibold"
                          />
                        ) : (
                          <p className="text-emerald-300 text-sm font-semibold leading-relaxed">{script.cta}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Feature 4: Edit action buttons */}
                  {isEditing && (
                    <div className="mx-6 mb-6 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={saveEditedScript}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-40 disabled:transform-none"
                      >
                        {saving ? (
                          <>
                            <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── B-Roll tab ─── */}
        {tab === 'broll' && (
          <div className="animate-fade-in">
            {/* Extracting */}
            {extracting && (
              <div className="text-center py-28 animate-slide-up">
                <div className="relative w-20 h-20 mx-auto mb-10">
                  <div className="absolute inset-0 rounded-full border border-amber-500/15 animate-[pulse-ring_2s_ease-out_infinite]" />
                  <div className="absolute inset-0 rounded-full border border-amber-500/10 animate-[pulse-ring_2s_ease-out_infinite_0.5s]" />
                  <div className="absolute inset-0 rounded-full border border-transparent border-t-amber-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="14" height="14" rx="2" stroke="#fbbf24" strokeWidth="1.4"/><path d="M16 9l5-3v12l-5-3V9z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Extracting B-Roll</h2>
                <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                  Downloading video and extracting frames &amp; clips...<br />
                  This takes 1–3 minutes depending on video length.
                </p>
                <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                  {['Downloading video (720p)', 'Extracting frames (1 per 5s)', 'Cutting B-roll clips'].map((s, i) => (
                    <div key={s} className="flex items-center gap-3 text-sm text-zinc-500 glass rounded-xl px-4 py-3">
                      <div className="w-3.5 h-3.5 border border-amber-500/70 border-t-transparent rounded-full animate-spin shrink-0" style={{ animationDelay: `${i * 0.4}s` }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {!extracting && extractError && (
              <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3 mb-6">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0"><path d="M7 2L1.5 12h11L7 2z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3M7 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <p className="text-red-400 text-sm">{extractError}</p>
              </div>
            )}

            {/* Empty state */}
            {!extracting && !extractError && frames.length === 0 && clips.length === 0 && (
              <div className="text-center py-28 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-600/[0.05] to-transparent rounded-3xl pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass border border-white/[0.08] mb-6 mx-auto">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="6" width="18" height="16" rx="3" stroke="#fbbf24" strokeWidth="1.4"/><path d="M20 10l6-4v16l-6-4v-8z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">No B-Roll Extracted Yet</h3>
                  <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                    Click <span className="text-amber-400 font-semibold">Extract B-Roll</span> in the top bar to download the video and pull out frames &amp; clips automatically.
                  </p>
                  <button
                    onClick={handleExtract}
                    className="btn-primary inline-flex items-center gap-2 text-white font-bold px-7 py-3 rounded-2xl text-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 5l3-2v8l-3-2V5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    Extract B-Roll Now
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {!extracting && (frames.length > 0 || clips.length > 0) && (
              <div className="space-y-12">
                {/* Stats strip */}
                <div className="flex items-center gap-4 p-4 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2xl">
                  <div className="w-8 h-8 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Extraction Complete</p>
                    <p className="text-xs text-zinc-500">{frames.length} frames · {clips.length} clips · Click any item to download</p>
                  </div>
                  <button
                    onClick={handleExtract}
                    className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors font-medium"
                  >
                    Re-extract
                  </button>
                </div>

                {/* Frames grid */}
                {frames.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">Frames</p>
                      </div>
                      <span className="text-[10px] text-zinc-700">{frames.length} images · 1 every 5 seconds</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {frames.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          download
                          className="group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-amber-500/40 transition-all duration-200 aspect-video bg-zinc-900"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`Frame ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-bold bg-amber-600/90 px-3 py-1.5 rounded-full backdrop-blur-sm">
                              Save
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2">
                            <span className="text-[10px] text-white/70 bg-black/60 px-1.5 py-0.5 rounded font-[var(--font-geist-mono)] backdrop-blur-sm">{String(i * 5)}s</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clips */}
                {clips.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">B-Roll Clips</p>
                      <span className="text-[10px] text-zinc-700">{clips.length} clips · 5 seconds each</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {clips.map((src, i) => {
                        const label = src.split('clip_')[1]?.replace('s.mp4', '') ?? String(i * 30)
                        return (
                          <div key={i} className="border border-white/[0.06] hover:border-amber-500/30 rounded-2xl overflow-hidden bg-zinc-950 transition-all duration-200 group card-hover">
                            <video
                              src={src}
                              controls
                              muted
                              loop
                              preload="metadata"
                              className="w-full aspect-video object-cover bg-black"
                            />
                            <div className="px-3 py-2.5 flex items-center justify-between border-t border-white/[0.05]">
                              <span className="text-[11px] text-zinc-600 font-[var(--font-geist-mono)]">@ {label}s</span>
                              <a
                                href={src}
                                download
                                className="text-[11px] text-amber-500 hover:text-amber-300 transition-colors font-semibold"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Storyboard tab ─── */}
        {tab === 'storyboard' && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-7 p-4 bg-amber-500/[0.06] border border-amber-500/15 rounded-2xl">
              <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/20 rounded-xl flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="11" rx="2" stroke="#fbbf24" strokeWidth="1.3"/><path d="M5.5 5l4 2.5-4 2.5V5z" fill="#fbbf24"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Based on Variation {selected + 1}</p>
                <p className="text-xs text-zinc-600">{project.storyboard.length} scenes · Ready to shoot</p>
              </div>
            </div>

            <div className="space-y-4">
              {project.storyboard.map((scene) => (
                <div key={scene.scene} className="relative border border-white/[0.06] hover:border-white/[0.10] rounded-3xl overflow-hidden transition-all duration-200 card-hover bg-white/[0.01]">
                  {/* Giant scene number watermark */}
                  <div className="absolute top-0 right-0 leading-none pointer-events-none select-none overflow-hidden h-full flex items-center pr-4">
                    <span className="text-[120px] font-black text-white/[0.03]">{scene.scene}</span>
                  </div>

                  {/* Scene header */}
                  <div className="relative flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/20 border border-amber-500/20">
                      <span className="text-xs font-black text-amber-400">{scene.scene}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{scene.duration}</span>
                    <div className="ml-auto">
                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/8 border border-blue-500/15 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        {scene.broll_keyword}
                      </span>
                    </div>
                  </div>

                  {/* Visual + Voiceover */}
                  <div className="relative grid grid-cols-2 divide-x divide-white/[0.05]">
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.12em] mb-3">Visual</p>
                      <p className="text-sm text-white leading-relaxed">{scene.visual}</p>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.12em] mb-3">Voiceover</p>
                      <p className="text-sm text-zinc-400 leading-relaxed italic">{scene.voiceover}</p>
                    </div>
                  </div>

                  {/* On-screen text */}
                  <div className="relative px-6 py-4 border-t border-white/[0.05] bg-gradient-to-r from-amber-500/[0.06] to-transparent">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.15em] mb-1.5">On-screen Text</p>
                    <p className="text-sm text-amber-300 font-semibold">{scene.on_screen_text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Publish tab (Feature 6) ─── */}
        {tab === 'publish' && (
          <div className="animate-fade-in space-y-6">

            {/* Platform badge + generate button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/[0.10] border border-amber-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest">
                  {project.platform || 'Instagram Reels'}
                </span>
                <span className="text-xs text-zinc-600">Using Variation {selected + 1}</span>
              </div>
              <button
                onClick={handleGenerateSocial}
                disabled={socialLoading}
                className="btn-primary flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:transform-none"
              >
                {socialLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2H5L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                    Generate Social Copy
                  </>
                )}
              </button>
            </div>

            {socialError && (
              <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0"><path d="M7 2L1.5 12h11L7 2z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3M7 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <p className="text-red-400 text-sm">{socialError}</p>
              </div>
            )}

            {/* Empty state */}
            {!socialCopy && !socialLoading && !socialError && (
              <div className="text-center py-20 glass rounded-3xl border border-white/[0.06]">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass border border-white/[0.08] mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Ready to publish?</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Generate platform-optimised captions, hashtags, and a first comment for your post.
                </p>
              </div>
            )}

            {/* Thumbnail Generator */}
            <div className="glass rounded-3xl border border-white/[0.06] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Thumbnail</p>
                  <p className="text-xs text-zinc-500 mt-0.5">AI-generated click-worthy thumbnail via DALL·E 3</p>
                </div>
                <button
                  onClick={handleGenerateThumbnail}
                  disabled={thumbnailLoading}
                  className="btn-primary flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:transform-none"
                >
                  {thumbnailLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : thumbnailUrl ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2H5L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                      Regenerate
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1l1.5 3.5H12l-3 2 1 3.5-3-2-3 2 1-3.5-3-2H5L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                      Generate Thumbnail
                    </>
                  )}
                </button>
              </div>

              {thumbnailError && (
                <div className="flex items-start gap-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0"><path d="M7 2L1.5 12h11L7 2z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6v3M7 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <p className="text-red-400 text-sm">{thumbnailError}</p>
                </div>
              )}

              {thumbnailLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm">Creating your thumbnail with DALL·E 3…</p>
                </div>
              )}

              {!thumbnailUrl && !thumbnailLoading && !thumbnailError && (
                <div className="flex items-center justify-center py-12 rounded-2xl border border-dashed border-white/[0.08]">
                  <div className="text-center">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-3 opacity-30"><rect x="2" y="6" width="28" height="20" rx="3" stroke="#fbbf24" strokeWidth="1.5"/><circle cx="10" cy="13" r="2.5" stroke="#fbbf24" strokeWidth="1.5"/><path d="M2 22l7-6 5 5 4-4 8 8" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                    <p className="text-zinc-600 text-xs">Click Generate Thumbnail to create your image</p>
                  </div>
                </div>
              )}

              {thumbnailUrl && !thumbnailLoading && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailUrl} alt="Generated thumbnail" className="w-full object-cover" />
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={thumbnailUrl}
                      download="thumbnail.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 9.5L2 5h3V1h3v4h3L6.5 9.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M1 11h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      Download
                    </a>
                    {thumbnailPrompt && (
                      <p className="text-zinc-600 text-xs leading-relaxed line-clamp-2 flex-1">{thumbnailPrompt}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Social copy results */}
            {socialCopy && (
              <div className="space-y-5">

                {/* Hashtags */}
                <div className="glass rounded-2xl border border-white/[0.06] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Hashtags</p>
                    <button
                      onClick={() => copySocialText('hashtags', socialCopy.hashtags.join(' '))}
                      className="btn-ghost flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    >
                      {copiedSocial === 'hashtags' ? (
                        <span className="text-emerald-400">Copied!</span>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 7.5V2a.5.5 0 01.5-.5h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {socialCopy.hashtags.map((tag, i) => (
                      <span key={i} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div className="glass rounded-2xl border border-white/[0.06] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Caption</p>
                    <button
                      onClick={() => copySocialText('caption', socialCopy.caption)}
                      className="btn-ghost flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    >
                      {copiedSocial === 'caption' ? (
                        <span className="text-emerald-400">Copied!</span>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 7.5V2a.5.5 0 01.5-.5h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={socialCopy.caption}
                    rows={4}
                    className="w-full bg-transparent text-zinc-300 text-sm leading-relaxed resize-none focus:outline-none select-all cursor-text"
                  />
                </div>

                {/* First comment */}
                <div className="glass rounded-2xl border border-white/[0.06] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">First Comment</p>
                    <button
                      onClick={() => copySocialText('first_comment', socialCopy.first_comment)}
                      className="btn-ghost flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    >
                      {copiedSocial === 'first_comment' ? (
                        <span className="text-emerald-400">Copied!</span>
                      ) : (
                        <>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 7.5V2a.5.5 0 01.5-.5h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={socialCopy.first_comment}
                    rows={4}
                    className="w-full bg-transparent text-zinc-300 text-sm leading-relaxed resize-none focus:outline-none select-all cursor-text"
                  />
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

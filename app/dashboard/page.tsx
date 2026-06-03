'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

type Project = {
  id: string
  title: string
  input_type: string
  created_at: string
  status: string
  video_url?: string
  thumbnail_url?: string
  platform?: string
}

const CARD_GRADIENTS = [
  'from-violet-600 via-purple-700 to-indigo-900',
  'from-blue-600 via-cyan-700 to-blue-900',
  'from-pink-600 via-rose-700 to-pink-900',
  'from-emerald-600 via-teal-700 to-emerald-900',
  'from-amber-600 via-orange-700 to-amber-900',
  'from-indigo-600 via-blue-700 to-indigo-900',
  'from-fuchsia-600 via-purple-700 to-fuchsia-900',
  'from-teal-600 via-emerald-700 to-teal-900',
]

// Extract YouTube video ID from any YouTube URL format
function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

// Unified smart thumbnail — works for both topic and video projects
// Priority: B-roll frame → YouTube thumb → Unsplash stock (thumbnail_url) → gradient
function CardThumbnail({ project, gradient }: { project: Project; gradient: string }) {
  const isVideo = project.input_type === 'video'
  const ytThumb = isVideo && project.video_url ? getYouTubeThumbnail(project.video_url) : null

  // Build the priority chain of image URLs to try
  const titleKeyword = project.title.split(' ').slice(0, 3).join(' ')
  const generatedUnsplash = `https://source.unsplash.com/800x450/?${encodeURIComponent(titleKeyword)}`

  const chain: string[] = []
  if (isVideo) chain.push(`/extracted/${project.id}/frames/frame_0001.jpg`)
  if (ytThumb)  chain.push(ytThumb)
  if (project.thumbnail_url) chain.push(project.thumbnail_url)
  else chain.push(generatedUnsplash)

  const [idx, setIdx]       = useState(0)
  const [allFailed, setAllFailed] = useState(chain.length === 0)

  function handleError() {
    if (idx + 1 < chain.length) {
      setIdx(idx + 1)
    } else {
      setAllFailed(true)
    }
  }

  return (
    <div className="relative h-[140px] overflow-hidden bg-zinc-900">
      {/* Gradient always rendered as base/fallback */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '120px' }} />
      </div>

      {/* Real image on top — moves through chain on each error */}
      {!allFailed && chain[idx] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={chain[idx]}
          src={chain[idx]}
          alt=""
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Bottom fade into card body */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  )
}

function TopicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C7.13 2 4 5.13 4 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0018 9c0-3.87-3.13-7-7-7z" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 21h4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="5" width="14" height="12" rx="2.5" stroke="white" strokeWidth="1.4"/>
      <path d="M16 8.5l5-3v11l-5-3v-5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading]   = useState(true)
  // confirmDelete: null = no confirm shown, string = project id awaiting confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
  }, [])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(id)
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(id)
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(null)
  }

  const totalCount     = projects.length
  const completedCount = projects.filter(p => p.status === 'completed').length
  const weekCount      = projects.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)).length

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ─────────────────── SIDEBAR ─────────────────── */}
      <aside className="w-[220px] shrink-0 border-r border-white/[0.06] bg-[#080808] flex flex-col h-full z-10">

        {/* Logo */}
        <div className="px-5 h-14 flex items-center border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-600 to-purple-800" />
              <span className="relative text-xs font-black text-white z-10">N</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-sm gradient-text-white tracking-tight">NOOR</span>
              <span className="text-zinc-600 font-medium text-xs">STUDIO</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-4 space-y-0.5 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm font-semibold text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Dashboard
          </div>
          <Link
            href="/new"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Project
          </Link>
        </nav>

        <div className="mx-4 my-4 border-t border-white/[0.05]" />

        {/* Stats */}
        <div className="px-4 shrink-0">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] mb-3 px-1">Overview</p>
          <div className="space-y-1">
            {[
              { label: 'Total Projects', value: totalCount,     color: 'text-white' },
              { label: 'Completed',      value: completedCount, color: 'text-emerald-400' },
              { label: 'This Week',      value: weekCount,      color: 'text-orange-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-zinc-500">{s.label}</span>
                <span className={`text-xs font-black tabular-nums ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Beta */}
        <div className="px-5 py-4 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.18em] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full uppercase">Beta</span>
            <span className="text-[10px] text-zinc-700">v0.1</span>
          </div>
        </div>
      </aside>

      {/* ─────────────────── MAIN ─────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Glow blobs */}
        <div className="pointer-events-none fixed overflow-hidden" style={{ left: 220, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="glow-orb absolute -top-48 left-1/3 w-[600px] h-[600px] bg-purple-700/18 rounded-full blur-[140px]" />
          <div className="glow-orb absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-800/10 rounded-full blur-[110px]" style={{ animationDelay: '3s' }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 shrink-0 border-b border-white/[0.06] backdrop-blur-xl bg-black/70 px-8 h-14 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Dashboard</p>
            <p className="text-[11px] text-zinc-600">
              {loading ? 'Loading...' : `${totalCount} project${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/new"
            className="btn-primary inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2 rounded-xl"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Project
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8">

          {loading ? (
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em] mb-6">All Projects</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
                    <Skeleton className="h-[140px] w-full bg-white/[0.05]" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-white/[0.05]" />
                      <Skeleton className="h-3 w-1/2 bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span className="text-[280px] font-black text-white/[0.012] leading-none">N</span>
              </div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass border border-white/[0.08] mb-6">
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <path d="M13 3C7.48 3 3 7.48 3 13s4.48 10 10 10 10-4.48 10-10S18.52 3 13 3z" stroke="#a855f7" strokeWidth="1.4"/>
                    <path d="M13 9v4M13 17v.5" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No projects yet</h3>
                <p className="text-zinc-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                  Create your first project — give Noor a topic or a video link.
                </p>
                <Link href="/new" className="btn-primary inline-flex items-center gap-2 text-white font-bold px-7 py-3 rounded-2xl text-sm">
                  Create First Project
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 6.5h9M7.5 3l3.5 3.5L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>

          ) : (
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em] mb-6">All Projects</p>

              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                {/* New Project card — always first */}
                <Link
                  href="/new"
                  className="group glass rounded-2xl border border-white/[0.07] border-dashed hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-250 flex flex-col items-center justify-center min-h-[240px] gap-3"
                >
                  <div className="w-11 h-11 rounded-xl glass border border-white/[0.09] group-hover:border-purple-500/30 flex items-center justify-center transition-all duration-200">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2v14M2 9h14" stroke="#52525b" strokeWidth="1.6" strokeLinecap="round"
                        className="group-hover:stroke-purple-400 transition-colors duration-200"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors duration-150">New Project</p>
                    <p className="text-[11px] text-zinc-700 mt-0.5">Topic or video link</p>
                  </div>
                </Link>

                {/* Project cards */}
                {projects.map((p, i) => {
                  const gradient  = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                  const isComplete = p.status === 'completed'
                  const dateStr   = new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  const isConfirming = confirmDelete === p.id
                  const isBeingDeleted = deleting === p.id

                  return (
                    <Link
                      key={p.id}
                      href={`/project/${p.id}`}
                      className="group glass rounded-2xl border border-white/[0.07] hover:border-white/[0.14] transition-all duration-250 card-hover flex flex-col overflow-hidden relative"
                    >
                      {/* Smart thumbnail */}
                      <div className="relative shrink-0">
                        <CardThumbnail project={p} gradient={gradient} />

                        {/* Status badge — always on top */}
                        <div className={`absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full backdrop-blur-sm z-10 ${
                          isComplete
                            ? 'bg-emerald-500/25 border border-emerald-400/30 text-emerald-300'
                            : 'bg-black/50 border border-white/10 text-zinc-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                          {p.status}
                        </div>

                        {/* Delete button — appears on hover, top-left of thumbnail */}
                        <div className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => handleDeleteClick(e, p.id)}
                            disabled={isBeingDeleted}
                            title="Delete project"
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150 disabled:opacity-40"
                          >
                            {isBeingDeleted ? (
                              <span className="w-3 h-3 border border-red-400/70 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Type icon bottom-left */}
                        <div className="absolute bottom-3 left-3 z-10 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center">
                          {p.input_type === 'topic' ? <TopicIcon /> : <VideoIcon />}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors duration-150 mb-2">
                          {p.title}
                        </h3>
                        <p className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                          <span className="capitalize">{p.input_type}</span>
                          <span className="w-0.5 h-0.5 bg-zinc-700 rounded-full" />
                          <span>{dateStr}</span>
                          {p.platform && (
                            <>
                              <span className="w-0.5 h-0.5 bg-zinc-700 rounded-full" />
                              <span className="truncate max-w-[80px]">{p.platform}</span>
                            </>
                          )}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-700 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all duration-150">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Project?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This action cannot be undone. The project and all its scripts will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={(e) => confirmDelete && handleDelete(e, confirmDelete)}
              disabled={!!deleting}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

function CardThumbnail({ project, gradient }: { project: Project; gradient: string }) {
  const isVideo = project.input_type === 'video'
  const ytThumb = isVideo && project.video_url ? getYouTubeThumbnail(project.video_url) : null
  const titleKeyword = project.title.split(' ').slice(0, 3).join(' ')
  const generatedUnsplash = `https://source.unsplash.com/800x450/?${encodeURIComponent(titleKeyword)}`
  const chain: string[] = []
  if (isVideo) chain.push(`/extracted/${project.id}/frames/frame_0001.jpg`)
  if (ytThumb) chain.push(ytThumb)
  if (project.thumbnail_url) chain.push(project.thumbnail_url)
  else chain.push(generatedUnsplash)

  const [idx, setIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(chain.length === 0)

  function handleError() {
    if (idx + 1 < chain.length) setIdx(idx + 1)
    else setAllFailed(true)
  }

  return (
    <div className="relative h-[160px] overflow-hidden bg-zinc-900 rounded-t-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {!allFailed && chain[idx] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={chain[idx]} src={chain[idx]} alt="" onError={handleError}
          className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent" />
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false) })
  }, [])

  async function handleDelete(id: string) {
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

  const totalCount = projects.length
  const completedCount = projects.filter(p => p.status === 'completed').length
  const weekCount = projects.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)).length

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] shrink-0 border-r border-white/[0.06] bg-[#080808] flex flex-col h-full">

        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center text-sm font-black shadow-lg shadow-purple-700/30">N</div>
            <div>
              <p className="font-black text-sm tracking-tight text-white">NOOR STUDIO</p>
              <p className="text-[10px] text-zinc-600">AI Content Engine</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-5 space-y-1">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] px-3 mb-2">Menu</p>

          <Link href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-600/15 border border-purple-500/20 text-sm font-semibold text-purple-300">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Dashboard
          </Link>

          <Link href="/new"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Project
          </Link>
        </nav>

        <Separator className="mx-4 my-5 bg-white/[0.05] w-auto" />

        {/* Stats */}
        <div className="px-3 space-y-1">
          <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.18em] px-3 mb-3">Overview</p>

          {[
            { label: 'Total Projects', value: loading ? '—' : totalCount, color: 'text-white', icon: '📁' },
            { label: 'Completed', value: loading ? '—' : completedCount, color: 'text-emerald-400', icon: '✅' },
            { label: 'This Week', value: loading ? '—' : weekCount, color: 'text-orange-400', icon: '🗓' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
              <span className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="px-5 py-4 border-t border-white/[0.05]">
          <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]">
            Beta v0.1
          </Badge>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Glow */}
        <div className="pointer-events-none fixed overflow-hidden" style={{ left: 240, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="absolute -top-48 left-1/3 w-[600px] h-[600px] bg-purple-700/15 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-800/10 rounded-full blur-[110px]" />
        </div>

        {/* Top bar */}
        <div className="relative z-10 shrink-0 border-b border-white/[0.06] backdrop-blur-xl bg-black/70 px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">Projects</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {loading ? 'Loading...' : `${totalCount} project${totalCount !== 1 ? 's' : ''} · ${completedCount} completed`}
            </p>
          </div>
          <Link href="/new"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-700/20">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Project
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-8">

          {/* Stats row */}
          {!loading && totalCount > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Projects', value: totalCount, sub: 'all time', color: 'from-purple-600/20 to-violet-600/10', border: 'border-purple-500/20', text: 'text-purple-300' },
                { label: 'Completed', value: completedCount, sub: 'fully done', color: 'from-emerald-600/20 to-teal-600/10', border: 'border-emerald-500/20', text: 'text-emerald-300' },
                { label: 'This Week', value: weekCount, sub: 'last 7 days', color: 'from-orange-600/20 to-amber-600/10', border: 'border-orange-500/20', text: 'text-orange-300' },
              ].map(s => (
                <Card key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl`}>
                  <CardContent className="p-5">
                    <p className="text-3xl font-black text-white">{s.value}</p>
                    <p className={`text-sm font-semibold mt-1 ${s.text}`}>{s.label}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div>
              <div className="flex gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 flex-1 rounded-2xl bg-white/[0.05]" />
                ))}
              </div>
              <Skeleton className="h-5 w-32 bg-white/[0.05] mb-6" />
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] overflow-hidden bg-white/[0.02]">
                    <Skeleton className="h-[160px] w-full bg-white/[0.05]" />
                    <div className="p-4 space-y-2.5">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full bg-white/[0.05]" />
                        <Skeleton className="h-5 w-20 rounded-full bg-white/[0.04]" />
                      </div>
                      <Skeleton className="h-4 w-full bg-white/[0.05]" />
                      <Skeleton className="h-3 w-2/3 bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 rounded-3xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" stroke="#a855f7" strokeWidth="1.5"/>
                  <path d="M16 11v5M16 19v1" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No projects yet</h2>
              <p className="text-zinc-500 text-sm mb-8 max-w-xs leading-relaxed">
                Create your first project — give Noor a topic or a video link and get a full content package.
              </p>
              <Link href="/new"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-purple-700/20">
                Create First Project
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          )}

          {/* Projects grid */}
          {!loading && projects.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.16em] mb-5">All Projects</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {/* New project card */}
                <Link href="/new"
                  className="group rounded-xl border-2 border-dashed border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/[0.03] transition-all duration-200 flex flex-col items-center justify-center min-h-[280px] gap-4">
                  <div className="w-12 h-12 rounded-xl border border-white/[0.10] group-hover:border-purple-500/30 bg-white/[0.03] flex items-center justify-center transition-all">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2v16M2 10h16" stroke="#52525b" strokeWidth="1.6" strokeLinecap="round"
                        className="group-hover:stroke-purple-400 transition-colors"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">New Project</p>
                    <p className="text-[11px] text-zinc-700 mt-0.5">Topic or video link</p>
                  </div>
                </Link>

                {/* Project cards */}
                {projects.map((p, i) => {
                  const gradient = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                  const isComplete = p.status === 'completed'
                  const dateStr = new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  const isBeingDeleted = deleting === p.id

                  return (
                    <Card key={p.id}
                      className="group rounded-xl border border-white/[0.08] hover:border-white/[0.16] bg-[#0a0a0a] transition-all duration-200 overflow-hidden cursor-pointer p-0"
                      onClick={() => window.location.href = `/project/${p.id}`}>

                      {/* Thumbnail */}
                      <div className="relative">
                        <CardThumbnail project={p} gradient={gradient} />

                        {/* Status badge */}
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                            isComplete
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-800/80 text-zinc-400 border border-white/10'
                          }`}>
                            {isComplete ? '✓ Done' : p.status}
                          </Badge>
                        </div>

                        {/* Input type badge */}
                        <div className="absolute top-3 left-3 z-10">
                          <Badge className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/60 text-zinc-400 border border-white/10 backdrop-blur-sm">
                            {p.input_type === 'topic' ? '💡 Topic' : p.input_type === 'video' ? '🎥 Video' : p.input_type === 'image' ? '🖼 Image' : '📄 PDF'}
                          </Badge>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id) }}
                          disabled={isBeingDeleted}
                          className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center"
                        >
                          {isBeingDeleted
                            ? <span className="w-3 h-3 border border-red-400/70 border-t-transparent rounded-full animate-spin" />
                            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                          }
                        </button>
                      </div>

                      {/* Card body */}
                      <CardContent className="p-4">
                        <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors mb-2">
                          {p.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                          <span>{dateStr}</span>
                          {p.platform && (
                            <>
                              <span>·</span>
                              <span className="text-purple-500 truncate max-w-[90px]">{p.platform}</span>
                            </>
                          )}
                        </div>

                        {/* View link */}
                        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
                          <span className="text-[11px] text-zinc-700">Click to open</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-700 group-hover:text-purple-400 transition-colors">
                            <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Project?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete this project and all its scripts. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Cancel
            </button>
            <button
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={!!deleting}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

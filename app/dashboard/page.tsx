'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^&\n?#]+)/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

function CardThumbnail({ project }: { project: Project }) {
  const isVideo = project.input_type === 'video'
  const ytThumb = isVideo && project.video_url ? getYouTubeThumbnail(project.video_url) : null
  const chain: string[] = []
  if (isVideo) chain.push(`/extracted/${project.id}/frames/frame_0001.jpg`)
  if (ytThumb) chain.push(ytThumb)
  if (project.thumbnail_url) chain.push(project.thumbnail_url)

  const [idx, setIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(chain.length === 0)

  function handleError() {
    if (idx + 1 < chain.length) setIdx(idx + 1)
    else setAllFailed(true)
  }

  return (
    <div className="relative h-[140px] overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Gold gradient fallback */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #1a1200 0%, #0e0a00 50%, #000 100%)'
      }} />
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span style={{ fontSize: 80, fontWeight: 900, color: '#f5a623', letterSpacing: -4 }}>N</span>
      </div>
      {!allFailed && chain[idx] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={chain[idx]} src={chain[idx]} alt="" onError={handleError}
          className="absolute inset-0 w-full h-full object-cover opacity-70" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: 'linear-gradient(to top, #0e0e0e, transparent)' }} />
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
    <div className="flex h-screen overflow-hidden" style={{ background: '#000', color: '#f0ede8' }}>

      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] shrink-0 flex flex-col h-full"
        style={{ background: '#080808', borderRight: '1px solid rgba(245,166,35,0.1)' }}>

        {/* Logo */}
        <div className="px-5 h-16 flex items-center" style={{ borderBottom: '1px solid rgba(245,166,35,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
              style={{ background: 'linear-gradient(135deg, #f5a623, #d4830f)', color: '#000', boxShadow: '0 4px 16px rgba(245,166,35,0.3)' }}>
              N
            </div>
            <div>
              <p className="font-black text-sm tracking-tight" style={{ color: '#f0ede8' }}>NOOR STUDIO</p>
              <p className="text-[10px]" style={{ color: '#6b6560' }}>AI Content Engine</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pt-5 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-2" style={{ color: '#3d3830' }}>Menu</p>

          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#f5a623' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            Dashboard
          </Link>

          <Link href="/new" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
            style={{ color: '#6b6560' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Project
          </Link>
        </nav>

        <Separator className="mx-4 my-5 w-auto" style={{ background: 'rgba(245,166,35,0.08)' }} />

        {/* Stats */}
        <div className="px-3 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] px-3 mb-3" style={{ color: '#3d3830' }}>Overview</p>
          {[
            { label: 'Total Projects', value: loading ? '—' : totalCount, color: '#f0ede8', icon: '🎬' },
            { label: 'Completed', value: loading ? '—' : completedCount, color: '#4ade80', icon: '✓' },
            { label: 'This Week', value: loading ? '—' : weekCount, color: '#f5a623', icon: '◆' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: s.color }}>{s.icon}</span>
                <span className="text-xs" style={{ color: '#6b6560' }}>{s.label}</span>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(245,166,35,0.08)' }}>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#f5a623' }}>
            Beta v0.1
          </span>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Gold glow */}
        <div className="pointer-events-none fixed overflow-hidden" style={{ left: 240, right: 0, top: 0, bottom: 0, zIndex: 0 }}>
          <div className="absolute -top-48 left-1/3 w-[600px] h-[600px] rounded-full blur-[160px]"
            style={{ background: 'rgba(245,166,35,0.06)' }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px]"
            style={{ background: 'rgba(245,166,35,0.04)' }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 shrink-0 px-8 h-16 flex items-center justify-between backdrop-blur-xl"
          style={{ borderBottom: '1px solid rgba(245,166,35,0.1)', background: 'rgba(0,0,0,0.8)' }}>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#f0ede8' }}>Projects</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#6b6560' }}>
              {loading ? 'Loading...' : `${totalCount} project${totalCount !== 1 ? 's' : ''} · ${completedCount} completed`}
            </p>
          </div>
          <Link href="/new" className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all btn-primary">
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
                { label: 'Total Projects', value: totalCount, sub: 'all time', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)', val: '#f5a623' },
                { label: 'Completed', value: completedCount, sub: 'fully done', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.15)', val: '#4ade80' },
                { label: 'This Week', value: weekCount, sub: 'last 7 days', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)', val: '#fbbf24' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <p className="text-3xl font-black" style={{ color: '#f0ede8' }}>{s.value}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: s.val }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#4a453f' }}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: 'rgba(245,166,35,0.05)' }} />
                ))}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,166,35,0.08)', background: '#0e0e0e' }}>
                    <Skeleton className="h-[140px] w-full" style={{ background: 'rgba(245,166,35,0.05)' }} />
                    <div className="p-4 space-y-2.5">
                      <Skeleton className="h-4 w-full" style={{ background: 'rgba(245,166,35,0.05)' }} />
                      <Skeleton className="h-3 w-2/3" style={{ background: 'rgba(245,166,35,0.04)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
                <span style={{ fontSize: 32, color: '#f5a623' }}>🎬</span>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f0ede8' }}>No projects yet</h2>
              <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#6b6560' }}>
                Create your first project — give Noor a topic or a video link and get a full content package.
              </p>
              <Link href="/new" className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl text-sm btn-primary">
                Create First Project →
              </Link>
            </div>
          )}

          {/* Projects grid */}
          {!loading && projects.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-5" style={{ color: '#3d3830' }}>All Projects</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                {/* New project card */}
                <Link href="/new"
                  className="group rounded-xl flex flex-col items-center justify-center min-h-[260px] gap-4 transition-all duration-200"
                  style={{ border: '2px dashed rgba(245,166,35,0.15)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,166,35,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(245,166,35,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,166,35,0.15)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                    style={{ border: '1px solid rgba(245,166,35,0.15)', background: 'rgba(245,166,35,0.04)' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: '#4a453f' }}>
                      <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: '#6b6560' }}>New Project</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#3d3830' }}>Topic or video link</p>
                  </div>
                </Link>

                {/* Project cards */}
                {projects.map((p) => {
                  const isComplete = p.status === 'completed'
                  const dateStr = new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  const isBeingDeleted = deleting === p.id

                  return (
                    <div key={p.id}
                      className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-200 relative card-hover"
                      style={{ border: '1px solid rgba(245,166,35,0.1)', background: '#0e0e0e' }}
                      onClick={() => window.location.href = `/project/${p.id}`}>

                      {/* Gold top line */}
                      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,166,35,0.4), transparent)' }} />

                      <CardThumbnail project={p} />

                      {/* Badges on image */}
                      <div className="absolute top-4 left-3 flex gap-1.5 z-10">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm"
                          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(245,166,35,0.2)', color: '#f5a623' }}>
                          {p.input_type === 'topic' ? '💡 Topic' : p.input_type === 'video' ? '🎥 Video' : p.input_type === 'image' ? '🖼 Image' : '📄 PDF'}
                        </span>
                      </div>

                      <div className="absolute top-4 right-3 flex gap-1.5 z-10">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm"
                          style={{
                            background: isComplete ? 'rgba(74,222,128,0.15)' : 'rgba(0,0,0,0.7)',
                            border: isComplete ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            color: isComplete ? '#4ade80' : '#6b6560'
                          }}>
                          {isComplete ? '✓ Done' : p.status}
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id) }}
                        disabled={isBeingDeleted}
                        className="absolute bottom-[calc(100px)] right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b6560' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6b6560'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
                        {isBeingDeleted
                          ? <span className="w-3 h-3 border border-red-400/70 border-t-transparent rounded-full animate-spin" />
                          : <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 3v6.5h3V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        }
                      </button>

                      {/* Card body */}
                      <div className="p-4">
                        <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-2 transition-colors"
                          style={{ color: '#f0ede8' }}>
                          {p.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] mb-3" style={{ color: '#4a453f' }}>
                          <span>{dateStr}</span>
                          {p.platform && (
                            <>
                              <span>·</span>
                              <span style={{ color: '#f5a623' }} className="truncate max-w-[90px]">{p.platform}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(245,166,35,0.08)' }}>
                          <span className="text-[11px]" style={{ color: '#3d3830' }}>Open project</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#3d3830' }}>
                            <path d="M2 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm" style={{ background: '#0e0e0e', border: '1px solid rgba(245,166,35,0.15)', color: '#f0ede8' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#f0ede8' }}>Delete Project?</DialogTitle>
            <DialogDescription style={{ color: '#6b6560' }}>
              This will permanently delete this project and all its scripts. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ color: '#6b6560', border: '1px solid rgba(245,166,35,0.15)' }}>
              Cancel
            </button>
            <button onClick={() => confirmDelete && handleDelete(confirmDelete)} disabled={!!deleting}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#dc2626', color: '#fff' }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

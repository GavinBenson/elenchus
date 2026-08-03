'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { STAGES, daysInStage, isAgingOffer, type Stage } from '@/lib/applicants-query'
import { applyStageMove, groupByStage, type BoardApplicant } from '@/lib/pipeline-board'
import { boardKeyboardCoordinates } from './keyboard-coordinates'
import { cn } from '@/lib/cn'

const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

function Card({
  applicant,
  now,
  dragging = false,
}: {
  applicant: BoardApplicant
  now: Date
  dragging?: boolean
}) {
  const aging = isAgingOffer(applicant, now)

  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-panel p-3 shadow-sm',
        aging && 'border-warn/50 bg-warn-bg',
        dragging && 'rotate-1 shadow-lg'
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar name={applicant.name} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{applicant.name}</span>
          <span className="block truncate text-xs text-ink-muted">
            {applicant.jobPostingTitle}
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn('text-xs', aging ? 'font-semibold text-warn' : 'text-ink-muted')}>
          {daysInStage(applicant.stageChangedAt, now)}d in stage
        </span>
        <Link
          href={`/applicants/${applicant.id}`}
          className="text-xs text-accent underline-offset-2 hover:underline"
          // Keeps a click on the link from starting a drag.
          onPointerDown={(event) => event.stopPropagation()}
        >
          Open
        </Link>
      </div>
    </div>
  )
}

function DraggableCard({ applicant, now }: { applicant: BoardApplicant; now: Date }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: applicant.id,
    attributes: {
      roleDescription: `${applicant.name}, currently in ${STAGE_LABELS[applicant.stage as Stage] ?? applicant.stage}`,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`board-card-${applicant.id}`}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn('cursor-grab touch-none focus:outline-2 focus:outline-accent', isDragging && 'opacity-40')}
    >
      <Card applicant={applicant} now={now} />
    </div>
  )
}

function Column({
  stage,
  applicants,
  now,
}: {
  stage: Stage
  applicants: BoardApplicant[]
  now: Date
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      data-testid={`board-column-${stage}`}
      className={cn(
        'flex min-w-[240px] flex-1 flex-col gap-2 rounded-xl border border-line bg-rail/50 p-2 transition-colors',
        isOver && 'border-accent bg-rail'
      )}
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <Badge stage={stage} />
        <span className="text-xs tabular-nums text-ink-muted">{applicants.length}</span>
      </div>

      {applicants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-2 py-6 text-center text-xs text-ink-muted">
          Nothing here
        </p>
      ) : (
        applicants.map((applicant) => (
          <DraggableCard key={applicant.id} applicant={applicant} now={now} />
        ))
      )}
    </div>
  )
}

export function PipelineBoard({ initialApplicants }: { initialApplicants: BoardApplicant[] }) {
  const [applicants, setApplicants] = useState(initialApplicants)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Pointer needs a small activation distance or a click on the "Open" link
  // registers as a drag. Keyboard dragging is a requirement, not a bonus: it
  // is both the accessible path and a far more stable Playwright path than
  // simulated mouse movement.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates })
  )

  const now = useMemo(() => new Date(), [])
  const columns = useMemo(() => groupByStage(applicants, now), [applicants, now])
  const dragging = applicants.find((applicant) => applicant.id === draggingId) ?? null

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)

    const id = String(event.active.id)
    const toStage = event.over?.id as Stage | undefined
    if (!toStage || !STAGES.includes(toStage)) return

    const previous = applicants
    const next = applyStageMove(previous, id, toStage, new Date())
    // applyStageMove returns the same array for a no-op (dropped back on its
    // own column), so there is nothing to persist.
    if (next === previous) return

    setError(null)
    setApplicants(next)

    try {
      const response = await fetch(`/api/applicants/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: toStage }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setApplicants(previous)
        setError(body?.error?.message ?? `Could not move that candidate (${response.status})`)
      }
    } catch {
      setApplicants(previous)
      setError('Could not move that candidate — the request failed.')
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id))
  }

  return (
    <div>
      {error ? (
        <p
          data-testid="board-error"
          role="alert"
          className="mb-3 rounded-lg border border-stage-rejected/40 bg-stage-rejected-bg px-3 py-2 text-sm text-stage-rejected"
        >
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <Column key={stage} stage={stage} applicants={columns[stage]} now={now} />
          ))}
        </div>

        <DragOverlay>
          {dragging ? <Card applicant={dragging} now={now} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

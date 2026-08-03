// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { PipelineBoard } from './PipelineBoard'
import type { BoardApplicant } from '@/lib/pipeline-board'

/**
 * dnd-kit is mocked down to the one thing this component actually owns: what
 * happens after a drop. Simulating real pointer or keyboard dragging in jsdom
 * tests dnd-kit's physics, not our optimistic-update-and-rollback logic, and
 * does it flakily — the design doc calls this the highest flake-risk feature
 * in the project. Real drag interaction is Epic 2's Playwright job.
 *
 * What this file proves: a successful drop persists and sticks, a rejected
 * drop rolls the card back and surfaces the error, and a no-op drop issues no
 * request at all.
 */
const { captured, refreshMock } = vi.hoisted(() => ({
  captured: { onDragEnd: null as ((event: DragEndEvent) => void) | null },
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode
    onDragEnd: (event: DragEndEvent) => void
  }) => {
    captured.onDragEnd = onDragEnd
    return <div>{children}</div>
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  useSensor: () => ({}),
  useSensors: () => [],
  KeyboardSensor: class {},
  PointerSensor: class {},
  closestCorners: () => [],
}))

const APPLICANTS: BoardApplicant[] = [
  {
    id: 'a1',
    name: 'Beatriz Alencar',
    email: 'beatriz@example.com',
    stage: 'applied',
    stageChangedAt: new Date('2026-07-30T00:00:00.000Z'),
    jobPostingTitle: 'Platform Engineer',
  },
  {
    id: 'a2',
    name: 'Marcus Oyelaran',
    email: 'marcus@example.com',
    stage: 'offer',
    stageChangedAt: new Date('2026-07-01T00:00:00.000Z'),
    jobPostingTitle: 'Senior QA Engineer',
  },
]

function drop(cardId: string, columnId: string) {
  return act(async () => {
    captured.onDragEnd!({ active: { id: cardId }, over: { id: columnId } } as DragEndEvent)
  })
}

const fetchMock = vi.fn()

beforeEach(() => {
  captured.onDragEnd = null
  fetchMock.mockReset()
  refreshMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PipelineBoard — rendering', () => {
  it('renders a column for every stage and a card for every applicant', () => {
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    for (const stage of ['applied', 'interview', 'offer', 'hired', 'rejected']) {
      expect(screen.getByTestId(`board-column-${stage}`)).toBeInTheDocument()
    }
    expect(screen.getByTestId('board-card-a1')).toBeInTheDocument()
    expect(screen.getByTestId('board-card-a2')).toBeInTheDocument()
  })

  it('places each card in the column for its stage', () => {
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    expect(screen.getByTestId('board-column-applied')).toContainElement(
      screen.getByTestId('board-card-a1')
    )
    expect(screen.getByTestId('board-column-offer')).toContainElement(
      screen.getByTestId('board-card-a2')
    )
  })
})

describe('PipelineBoard — dropping a card', () => {
  it('moves the card and persists the new stage', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'interview')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/applicants/a1/stage',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ stage: 'interview' }) })
    )
    expect(screen.getByTestId('board-column-interview')).toContainElement(
      screen.getByTestId('board-card-a1')
    )
  })

  it('revalidates server data after a successful move', async () => {
    // Without this the list view keeps rendering the old stage from its cached
    // server render, so the two screens disagree.
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'interview')

    expect(refreshMock).toHaveBeenCalled()
  })

  it('does not revalidate when the move was rejected', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => null })
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'interview')

    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('rolls the card back to its original column when the API rejects the move', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 'forbidden', message: 'Not allowed' } }),
    })
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'interview')

    expect(screen.getByTestId('board-column-applied')).toContainElement(
      screen.getByTestId('board-card-a1')
    )
    expect(screen.getByTestId('board-error')).toHaveTextContent('Not allowed')
  })

  it('rolls back and reports when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'interview')

    expect(screen.getByTestId('board-column-applied')).toContainElement(
      screen.getByTestId('board-card-a1')
    )
    expect(screen.getByTestId('board-error')).toBeInTheDocument()
  })

  it('clears a previous error once a later move succeeds', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => null })
    render(<PipelineBoard initialApplicants={APPLICANTS} />)
    await drop('a1', 'interview')
    expect(screen.getByTestId('board-error')).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await drop('a1', 'offer')

    expect(screen.queryByTestId('board-error')).not.toBeInTheDocument()
  })

  it('issues no request when a card is dropped back on its own column', async () => {
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await drop('a1', 'applied')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('issues no request when a card is dropped outside any column', async () => {
    render(<PipelineBoard initialApplicants={APPLICANTS} />)

    await act(async () => {
      captured.onDragEnd!({ active: { id: 'a1' }, over: null } as DragEndEvent)
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { boardKeyboardCoordinates } from './keyboard-coordinates'
import { STAGES } from '@/lib/applicants-query'

const COLUMN_WIDTH = 240
const CARD_WIDTH = 200

/** Five 240px columns laid out left to right starting at x=0. */
const droppableRects = new Map(
  STAGES.map((stage, index) => [
    stage,
    { left: index * COLUMN_WIDTH, width: COLUMN_WIDTH, top: 0, height: 600 },
  ])
)

const columnCentre = (index: number) => index * COLUMN_WIDTH + COLUMN_WIDTH / 2

/**
 * `cardLeft` is where the card currently sits on screen; `translate` is the
 * drag's accumulated offset. These are different spaces, and the getter must
 * return the second — returning a page position instead is a silent no-op that
 * only shows up in a real browser.
 */
function call(code: string, cardLeft: number, translate = { x: 0, y: 40 }) {
  const preventDefault = vi.fn()
  const result = boardKeyboardCoordinates(
    { code, preventDefault } as unknown as KeyboardEvent,
    {
      active: 'a1',
      currentCoordinates: translate,
      context: {
        collisionRect: { left: cardLeft, width: CARD_WIDTH, top: 40, height: 90 },
        droppableRects,
      },
    } as never
  )
  return { result, preventDefault }
}

/** A card sitting centred on the given column. */
const cardOn = (columnIndex: number) => columnCentre(columnIndex) - CARD_WIDTH / 2

describe('boardKeyboardCoordinates', () => {
  it('moves a whole column per press rather than a 25px nudge', () => {
    // The default getter's 25px step is why this exists: a 240px column takes
    // ten presses, and the first press looks like nothing happened.
    const { result } = call('ArrowRight', cardOn(0))
    expect(result).toEqual({ x: COLUMN_WIDTH, y: 40 })
  })

  it('returns a translate, not a page position', () => {
    // Same card position, but mid-drag with an existing offset: the result must
    // build on the accumulated translate rather than replace it.
    const { result } = call('ArrowRight', cardOn(1), { x: COLUMN_WIDTH, y: 40 })
    expect(result).toEqual({ x: COLUMN_WIDTH * 2, y: 40 })
  })

  it('moves left as well as right', () => {
    const { result } = call('ArrowLeft', cardOn(2), { x: COLUMN_WIDTH * 2, y: 40 })
    expect(result).toEqual({ x: COLUMN_WIDTH, y: 40 })
  })

  it('clamps at the last column instead of wrapping round to the first', () => {
    // Wrapping would move a card four stages backwards on what reads as a
    // single forward key press.
    expect(call('ArrowRight', cardOn(STAGES.length - 1)).result).toBeUndefined()
  })

  it('clamps at the first column', () => {
    expect(call('ArrowLeft', cardOn(0)).result).toBeUndefined()
  })

  it('ignores vertical keys', () => {
    expect(call('ArrowUp', cardOn(1)).result).toBeUndefined()
    expect(call('ArrowDown', cardOn(1)).result).toBeUndefined()
  })

  it('does not swallow the key event for keys it ignores', () => {
    expect(call('ArrowUp', cardOn(1)).preventDefault).not.toHaveBeenCalled()
    expect(call('ArrowRight', cardOn(1)).preventDefault).toHaveBeenCalled()
  })

  it('falls back to the nearest column when the card sits between two', () => {
    // Mid-drag the card can straddle a boundary; the first press must still do
    // something predictable rather than nothing.
    const straddling = COLUMN_WIDTH - CARD_WIDTH / 2 - 10
    const { result } = call('ArrowRight', straddling)
    const cardCentre = straddling + CARD_WIDTH / 2
    expect(result).toEqual({ x: columnCentre(1) - cardCentre, y: 40 })
  })

  it('returns nothing when the drag has no measured rect yet', () => {
    const result = boardKeyboardCoordinates(
      { code: 'ArrowRight', preventDefault: vi.fn() } as unknown as KeyboardEvent,
      {
        active: 'a1',
        currentCoordinates: { x: 0, y: 0 },
        context: { collisionRect: null, droppableRects },
      } as never
    )
    expect(result).toBeUndefined()
  })
})

import { KeyboardCode, type KeyboardCoordinateGetter } from '@dnd-kit/core'
import { STAGES } from '@/lib/applicants-query'

/**
 * dnd-kit's default keyboard handler nudges the dragged item 25px per key
 * press. A board column is around 250px wide, so moving a card one column over
 * takes roughly ten presses and the first press appears to do nothing — which
 * is what "keyboard dragging works" degrades into if you take the default.
 *
 * This getter moves a whole column per press instead: left/right step through
 * the five stages in order and land on the target column's centre, which is
 * what the collision detection then resolves against.
 *
 * Vertical keys are deliberately unhandled — columns are ordered by urgency
 * rather than by anything the user sets, so there is no meaningful "up" for a
 * card to move to.
 */
export const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context }
) => {
  const step =
    event.code === KeyboardCode.Right ? 1 : event.code === KeyboardCode.Left ? -1 : 0
  if (step === 0) return

  event.preventDefault()

  const { collisionRect, droppableRects } = context
  if (!collisionRect) return

  // Which column is the card currently over? Measured from the card's own
  // centre rather than from any remembered index, so a mid-drag scroll or a
  // pointer-then-keyboard handoff cannot desynchronise it.
  const cardCentreX = collisionRect.left + collisionRect.width / 2
  const columns = STAGES.flatMap((stage) => {
    const rect = droppableRects.get(stage)
    return rect ? [{ stage, rect }] : []
  })
  if (columns.length === 0) return

  let currentIndex = columns.findIndex(
    ({ rect }) => cardCentreX >= rect.left && cardCentreX <= rect.left + rect.width
  )
  if (currentIndex === -1) {
    // Card centre is between or outside columns: fall back to the nearest one
    // so the first key press still does something predictable.
    currentIndex = columns.reduce((nearest, { rect }, index) => {
      const centre = rect.left + rect.width / 2
      const nearestCentre =
        columns[nearest].rect.left + columns[nearest].rect.width / 2
      return Math.abs(centre - cardCentreX) < Math.abs(nearestCentre - cardCentreX)
        ? index
        : nearest
    }, 0)
  }

  const target = columns[currentIndex + step]
  // Clamped, not wrapped: wrapping from Rejected back to Applied would move a
  // card four stages backwards on what reads as a one-step key press.
  if (!target) return

  // `currentCoordinates` is the drag's accumulated translate, not a position
  // on the page, so the return value has to be a translate too. Returning the
  // target column's absolute centre here silently does nothing: the card moves
  // by a few pixels and stays over the column it started in.
  const targetCentreX = target.rect.left + target.rect.width / 2
  return {
    ...currentCoordinates,
    x: currentCoordinates.x + (targetCentreX - cardCentreX),
  }
}

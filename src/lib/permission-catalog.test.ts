import { describe, it, expect } from 'vitest'
import { PERMISSION_CATALOG, describePermission } from './permission-catalog'
import { PERMISSION_KEYS } from '../../prisma/seed'

/**
 * The roles matrix renders prose describing what each permission controls. The
 * prose is only useful if it is true and complete, and nothing else in the
 * codebase would notice if a permission were added to the seed and never
 * described — the screen would quietly print "Not documented." forever.
 */
describe('permission catalog', () => {
  it('describes every permission the seed creates', () => {
    const described = PERMISSION_CATALOG.map((permission) => permission.key)
    expect(described.sort()).toEqual([...PERMISSION_KEYS].sort())
  })

  it('does not describe permissions that do not exist', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(PERMISSION_KEYS).toContain(permission.key)
    }
  })

  it('gives every permission a label and a description', () => {
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.label.length).toBeGreaterThan(0)
      expect(permission.description.length).toBeGreaterThan(0)
    }
  })

  it('flags that stage changes sit behind delete_applicant', () => {
    // This is the surprising gate in the system, and the matrix exists partly
    // to surface it. If the API is ever corrected to use its own key, this
    // test should fail and the caveat should be removed with it.
    expect(describePermission('delete_applicant')?.caveat).toMatch(/stage/i)
  })

  it('returns undefined for an unknown key rather than throwing', () => {
    expect(describePermission('not_a_permission')).toBeUndefined()
  })
})

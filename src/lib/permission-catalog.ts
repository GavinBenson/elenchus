/**
 * What each permission key actually controls, written from the routes that
 * check it rather than from its name. The roles matrix is only useful if the
 * descriptions are true, so each one was derived by grepping for the key.
 *
 * If a route's gate changes, this file is wrong until it is updated — that is
 * the cost of describing behaviour in prose, and it is worth it here because a
 * bare list of snake_case keys tells a reader nothing.
 */
export type PermissionInfo = {
  key: string
  label: string
  description: string
  /** Set when the key gates something its name does not suggest. */
  caveat?: string
}

export const PERMISSION_CATALOG: PermissionInfo[] = [
  {
    key: 'view_all_employees',
    label: 'View employees',
    description: 'Read the employee roster and any employee’s detail page.',
  },
  {
    key: 'edit_employees',
    label: 'Edit employees',
    description: 'Create, update and delete employee records.',
  },
  {
    key: 'edit_job_postings',
    label: 'Edit postings',
    description: 'Create and update job postings, and add or edit applicants.',
  },
  {
    key: 'delete_applicant',
    label: 'Delete applicants',
    description: 'Delete an applicant record.',
    caveat:
      'Also required to move an applicant between pipeline stages — the most routine action in the app sits behind a destructive-sounding key.',
  },
  {
    key: 'manage_roles',
    label: 'Manage roles',
    description: 'Read and create roles and permissions in the admin area.',
  },
]

export function describePermission(key: string): PermissionInfo | undefined {
  return PERMISSION_CATALOG.find((permission) => permission.key === key)
}

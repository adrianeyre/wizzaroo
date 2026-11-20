/**
 * What a reply served the Admin, recorded in each Admin access log row: one value for each reply path that logs, so a
 * Family can tell, in the log and in its export, a progress read from a list or from a change that replied with the
 * Child (pen test D2, #270). A new reply path that serves the Admin a Child's data adds its own value here and in the
 * schema, never reuses another's.
 */
export const adminAccessServedKinds = [
  // GET /api/children/:childId/progress: the Child's progress.
  "child-progress.opened",
  // GET /api/school-children: every Child's progress in the Admin's reach.
  "school-children-progress.listed",
  // GET /api/admin/families: each Family's Children, by id and nickname.
  "families.listed",
  // GET /api/parents: each Parent's Children, by id, nickname and Year.
  "parents.listed",
  // GET /api/admin/deletion-requests: each request's Child, by nickname.
  "deletion-requests.listed",
  // PUT /api/children/:childId: the Child, after a change to their details.
  "child.changed",
  // PUT /api/children/:childId/limits: the Child's limits and Teacher locks, after a change to the limits.
  "child-limits.changed",
  // PUT /api/children/:childId/teacher-locks: the Child's limits and Teacher locks, after a change to the locks.
  "child-teacher-locks.changed",
  // PUT /api/children/:childId/classmate-visits: the Child, after a change to Classmate visits.
  "child-classmate-visits.changed",
  // PUT /api/children/:childId/birth: the Child, after their birth month and year are given.
  "child-birth.given",
  // PUT /api/children/:childId/school: the Child, after a move to another School.
  "child-school.changed",
] as const;

export type AdminAccessServed = (typeof adminAccessServedKinds)[number];

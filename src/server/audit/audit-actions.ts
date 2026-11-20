export const auditActions = [
  "sign-in.succeeded",
  "sign-in.failed",
  "sign-out",
  "two-factor.turned-on",
  "two-factor.turned-off",
  "two-factor.turn-off-refused",
  "passkey.added",
  "passkey.removed",
  "password.changed",
  "password.created",
  "password.removed",
  "password.reset",
  "email-address.changed",
  "family-device.created",
  "family-device.revoked",
  "picture-password.set",
  "school.created",
  "school.deleted",
  "school.classmate-visits-changed",
  "teacher.created",
  "teacher.year-groups-changed",
  "parent.created",
  "family-join.agreed",
  "family-join.turned-down",
  "adult.deactivated",
  "invite.sent",
  "password-reset.sent-by-staff",
  "child.created",
  "child.school-changed",
  "child.deleted",
  "family.deleted",
  "deletion-request.created",
  "deletion-request.confirmed",
  "password-reset.requested",
  "password-reset.rate-limited",
  "sign-in.rate-limited",
  "sign-out.other-browsers",
  // The Admin's changes to another Family's Child, its Family Chest or a School, with no values (#288).
  "school.changed",
  "child.stars-awarded",
  "family-chest.coins-awarded",
  "child.changed",
  "child.limits-changed",
  "child.teacher-locks-changed",
  "child.classmate-visits-changed",
  "child.birth-given",
] as const;

export type AuditAction = (typeof auditActions)[number];

export const auditActorTypes = ["user", "family-device", "none"] as const;

export type AuditActorType = (typeof auditActorTypes)[number];

export const auditTargetTypes = [
  "user",
  "school",
  "child",
  "family",
  "family-device",
  "passkey",
  "deletion-request",
] as const;

export type AuditTargetType = (typeof auditTargetTypes)[number];

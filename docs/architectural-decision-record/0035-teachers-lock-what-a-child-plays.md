# Teachers lock what a Child plays, and their locks outrank the Parents'

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Teachers could see the Children in their Year Groups but never change how they played ([0026](./0026-schools-and-teachers.md)). The owner now wants Teachers to have the same Island controls as Parents, so a class can be kept to what is being taught, and wants a Parent never to turn back on anything a Teacher turned off. The owner also wants single Games, not just whole Regions, to be turned off.

A Child's play is now shaped by two layers of switches:

- **The Parents' choices**, as before: daily time, sound, Islands opened early or locked, Regions turned off, Regions with every Game open, and now **Games turned off**. They stay in `children.synced_limits`, and only the Child's Parents and the Admin change them.
- **Teacher locks**: Islands locked, Regions turned off and Games turned off. They live in their own table, `child_teacher_locks`, one row per Child. A Teacher whose Year Groups at their School include the Child, and the Admin, change them through `PUT /api/children/:childId/teacher-locks`.

**Teacher locks only take away.** A Teacher can't open an Island early or open every Game in a Region, because that would be acting on a Family's home play the other way. Wherever either layer turns something off, it is off: an Island a Teacher locked stays locked even if a Parent opened it early, and a Game a Teacher turned off stays off even when its Region has every Game open. A Game that is turned off shows on the map as locked with "Turned off by a grown-up", and doesn't count towards the Stars needed for the next one.

A Parent's dashboard shows each Teacher lock as an off switch they can't move, marked "Locked by their Teacher". A Teacher's dashboard shows their own layer, with a note wherever the Parents have turned the same thing off at home. The API merges both layers into the `ChildLimits` that the dashboards and Family Devices read. The Parents' route refuses a body that carries `teacherLocks` and always keeps the stored Teacher locks, so neither side can overwrite the other.

Row-level security ([0027](./0027-row-level-security-through-a-reach-role.md)) gives `child_teacher_locks` two policies: the Child's Family reads its rows, so they reach Family Devices, and only the Admin or a Teacher who reaches the Child reads and writes them. The Child's own row in `children` stays read-only to Teachers.

## Considered Options

- **Teacher locks inside `synced_limits`**: one column and no migration, but Teachers would need to update the `children` row, which the reach role deliberately doesn't let them do. Every Parent save would also have to carry the Teacher's part back unchanged.
- **One shared set of switches that either side can flip**: simplest to show, but a Parent could undo a Teacher's choice with one tap, which is exactly what the owner asked to prevent.
- **Teachers able to open things too**: gives Teachers more say over home play than Parents expect, and raises the question of which side wins when a Teacher opens something a Parent locked. Left out until someone asks for it.
- **Game switches only in the Teacher dashboard**: Parents asked for single Games too, and one switch per Game on both dashboards keeps them the same.

## Consequences

- Amends [0026](./0026-schools-and-teachers.md): a Teacher's reach is still read-only everywhere else, but they can now lock Islands, turn Regions off and turn Games off for the Children in their Year Groups. The Teacher dashboard gets a "Class Islands" section.
- Amends [0025](./0025-one-island-per-year-group.md): Parents can also turn single Games off, and Teacher locks sit on top of the Parent's Island, Region and Game switches.
- A Family Device that last synced before this keeps working: missing Game switches and Teacher locks read as none.
- Teacher locks are part of a Family's data export, without the Teacher's user id.

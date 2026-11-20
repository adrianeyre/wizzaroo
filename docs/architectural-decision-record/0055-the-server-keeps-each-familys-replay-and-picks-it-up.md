# The server keeps each Family's replay and picks it up where it left off

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

[ADR 0004](0004-offline-play-records-events-the-server-decides.md) decides that the server replays a Family's events and is the only place that works out Mastery, Stars and the Family Chest. Until now it replayed every one of them, ordered by the device's own clock, on every upload, every opening of play, every Parent's dashboard and every class list a Teacher or the Admin opened. Section 4 of `wizzaroo.md` means that history to last six years. Pen-test F4 measured the cost: it grew with the history (#318), with the square of it when a device gave each event a day of its own (#319), and while one Family's replay ran, the server's one thread kept every other Family waiting (#320). Nothing recorded when the cost had to be looked at again.

## Decision

- **Every record the replay reads is numbered as it is written.** A play event, a Star award and a Family Chest coin award each take the next number from the `replay_sequence` sequence, in a trigger, after it locks its Family's row until the writing transaction ends. So a Family's records commit in the order of their numbers, and whoever has seen number n has seen every record of that Family numbered below it. The trigger runs as the owner, since a Teacher's or a Family Device's reach can't lock its Family's row, and reads and writes nothing else.
- **The replay reads them in that order.** That is the order they reached the server. An upload is stored in the order its events happened, so one device's play is replayed as it was played. When two devices sync play from the same days, the later sync is replayed after the earlier one, not woven into it by date. The records kept before this decision were numbered in the order the replay read them until now.
- **The server keeps what each Family's replay works out.** It keeps it in memory, since the server is one process, for the 1,000 Families replayed most recently. A request replays only the records numbered since. A replay that is kept starts from scratch only when its starting point changes: the Family is made again, a Child's Character is made or changes, a Child's kept Games change, or a record it read is changed or deleted. A second trigger marks the Family's row for that last case.
- **Only committed records are kept.** A transaction that writes records and replays in the same breath, as an upload does, gets an answer that counts them, but the kept replay stops before them. The first number a transaction handed out is noted for that transaction alone, and the next request after it commits picks them up. A transaction that is rolled back leaves nothing behind.
- **Adding a day costs the same however long the history is.** A Skill's practice is kept as its days, their dates in order, and apart from them the dates whose practice counts towards Mastery, which alone decide its schedule. So a device's dates no longer set how much work the server does for each event.

## Considered options

- **Keep replaying everything, but faster:** linear instead of quadratic, but still every event on every request, for six years.
- **Keep the replay in Postgres:** it would survive a restart, but every upload would write the whole of a Family's practice history back, and the reach roles would need a table of their own to read and write. A restart replays each Family once, the next time it is asked for, and the database time that takes doesn't hold the thread.
- **Keep ordering by the device's clock, with checkpoints by date:** an event dated before a checkpoint, which a device can always send, would replay from the start again, so a device would still set the cost.
- **Refuse, or ignore, events dated too long ago:** it would bound the dates, but drop play from a device that has been offline a while, and decide something about Children's play that ADR 0004 left to them.
- **Workers or a second process:** the thread would be free, but the database and every Family's requests would still pay for the replay.

## Consequences

- Two devices syncing play from the same days can end with a slightly different Star balance, or an Item a few events later, than if they had synced in date order. ADR 0004 already lets the balance stop at zero rather than take back what a Child holds; it is a currency that isn't money.
- A server restart, or a record changed or deleted behind the replay, makes that Family's next request read its whole history again. Postgres's row-level security checks each row it reads, which costs about 30 µs a row, so a Family with 100,000 events waits about 3 seconds once. The thread isn't held while it waits.
- Every way of writing a record is numbered, the owner's and a restore's included, so a test or a fixture that inserts records directly is replayed as an upload would be. `pg_dump` and `pg_restore` keep the numbers, since the triggers are made after the data is loaded.
- What the replay keeps is held in the server's memory: a few hundred kilobytes for a Family with years of play, and at most 1,000 Families.
- Look at this again if the server ever runs as more than one process, since each would keep its own replays, or if a Family's history passes a million records.

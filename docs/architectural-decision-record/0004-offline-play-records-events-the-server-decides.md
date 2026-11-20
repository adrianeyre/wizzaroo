# Offline play records events, and the server alone decides the outcome

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Children must be able to play when the home server or tunnel is down. A Family Device never syncs _state_. It appends events (Question answered, Activity finished, Item bought) to a local outbox, and uploads them idempotently when the API can be reached. The server replays the events and is the only place that works out Mastery, Placement, Star balances and the Family Chest. The device works out a provisional version so play feels instant, and the server's version replaces it after each sync.

- **When something happened** is the device's clock at the time of the event. A "day" for a mastery rule is the device's local date. The server also stores when it received each event, as a sanity check, and holds the device's clock to it (below). Within those bounds, children altering the clock isn't treated as a threat.
- **Spending Stars offline is allowed.** If two devices together spend more than a Child had, the server honours every purchase and the balance stops at zero. Taking back an Item a Child already holds is worse than a small overspend of a currency that isn't money.

- **The outbox must survive.** On iPhone and iPad, Safari deletes a website's stored data after 7 days without a visit unless the site is installed to the home screen, so an Apple Family Device must be installed. On every browser the app requests persistent storage (`navigator.storage.persist`), syncs whenever it is online so little is ever waiting, and warns the Parent if the storage isn't persistent.

## What the server sets aside

Added after the second pen-test round (pen test F3, #324, #325, #326). The upload still stores every event it can stand behind, and lets go of the rest the way it lets go of a deleted Child's play (#283): it answers `200` with how many it let go, and the device forgets the batch, so nothing jams the outbox. An event is let go when:

- it happened, by the device's clock, more than an hour after the server received it, or more than 400 days before. 400 days is how long a Family Device's credential lasts unused ([ADR 0005](./0005-family-devices-and-picture-passwords.md), #301), so no signed-in device can still be holding anything older;
- its local date is later than the UK's tomorrow, or more than 401 days before the UK's today, a day either side for a device in any time zone;
- it is a finished Check with more outcomes than that Check's paper asks, or a right answer given in under 200 ms.

Time spent counts each Session for no more than a day and is summed in a type no number of Sessions overflows. A Check History lists a Check by when it finished, and never later than when the server received it. An event id is bound to its owner and its body: the same event sent again is harmless, and an id already stored for another Family, or with another body, is refused with `409` naming it, storing nothing of the upload, and the device gives it a new id and sends it again.

## When this decision ends

Added after the second pen-test round (pen test F3, #327). Within the bounds above, the server still takes the play a device states as it comes: every Activity and right answer it sends earns Stars and counts towards Mastery, the Trophies Classmates see in a Child's Room follow from those Stars, and the time spent a Parent's daily limit is meant to hold is counted, and limited, on each device by its own clock. Forging that is a Child cheating their own game, and the Family's Teacher and Classmates read the result.

That is acceptable **only until a second School is added**: the compliance gate in section 11 of [`wizzaroo.md`](../product-requirements-document/wizzaroo.md), which the server holds behind `SECOND_SCHOOL_GATE_MET`. A second School brings Teachers who don't know the Family and read Mastery and Check scores as evidence of what a Child can do, and Classmates in more Families who see the Trophies. Before the gate is met, this decision is replaced, by a new ADR or an amendment here, with one or more of:

- **bounding what a day can hold:** the Activities, right answers and Stars one Child's local date can earn, and the time spent one day can count, so a hundred Activities in one go earn no more than a real day's play;
- **holding a device's dates closer to `received_at`:** refusing a `localDate` or `happenedAt` further from when the event arrived than a device offline for a few days would give, instead of the 400 days above;
- **keeping what others read apart from what the device states:** a Teacher's Mastery and Check scores, and the Trophies Classmates see, worked out only from play the server can stand behind, while the Family's own game keeps the device's version;
- **holding a daily limit on the server:** time beyond the Child's limit for a day not counted, whatever the device's clock says.

**Review:** re-read on **31 March 2027**, with [ADR 0005](./0005-family-devices-and-picture-passwords.md), whether or not the second School is near. Record the answer here; "no change" is a valid answer, and silence is not.

## Considered Options

- **Syncing state between device and server**, merging conflicting copies of progress and inventory. Rejected: merging state is hard to get right, whereas events merge naturally and give spaced repetition the history it needs anyway.
- **An online-only app with an outage screen.** Rejected: a home-server or tunnel outage would stop the Children playing.

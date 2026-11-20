# Parents give Stars and follow Quests from an Awards page

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The owner asked for an **Awards** page on the Parent page, in the sidebar's Your Family group, showing the Children's tiles at the top and then, for the chosen Child: their Stars with a 3D picture of Stars, a way for a Parent to give them 5, 10 or 15 Stars, at most 15 a day; the Family Chest in 3D with how full it is; and every Island's Quest, by Year, with what the Child has done and what is still to do, a line about each step.

Until now only the Admin could give Stars (`POST /api/admin/children/:childId/star-awards`), and a Parent could see neither the Family Chest nor a Child's Quests.

## What a Parent can give

- **5, 10 or 15 Stars at a time, and at most 15 a Child a day**, between all of the Child's Parents. The sizes and the limit are `parentStarAwardSizes` and `mostParentStarsADay` in `src/curriculum/rewards.ts`, which the page and the server both read. A day is the UK date the server's clock gives, the same `wizzaroo_today()` the policies use, so it starts at midnight UK time.
- **They are Stars to spend, like the Admin's.** A Parent's award is one more `star_awards` row and replays as the same `stars-awarded` record ([ADR 0055](./0055-the-server-keeps-each-familys-replay-and-picks-it-up.md)), so it reaches every Family Device when it next goes online and, like the Admin's, unlocks no Game.
- **The Admin's awards don't count towards the 15.** `star_awards.given_by_parent` says which rows a Parent gave; only those are added up for the day.
- **No nudge** ([ADR 0010](./0010-rewards-without-nudges.md)): the limit holds the adults, not the Child. The Child sees no daily prompt, nothing builds a streak and nothing is lost for a day without Stars.

## How it is held

- **`POST /api/children/:childId/star-awards`** (reach `parent`) takes `{ stars: 5 | 10 | 15 }` and answers with the Child's Awards. It takes the Child's row `FOR UPDATE` before adding up the day's awards, so two Parents giving Stars at the same moment are counted one after the other, and refuses an award that would pass 15 with a `409`. Any other number is a `400`, and a Child outside the Parent's own Family a `404`, as with every Parent route.
- **Row-level security holds a Parent to the rest.** `star_awards_given_by_parent` lets the reach insert only a row marked `given_by_parent`, of 5, 10 or 15 Stars, naming the caller themselves as `awarded_by_user_id`, for a Child of the caller's own Family. A Family Device's reach names no adult, so it can give none. The daily limit isn't in the policy, since a policy can't read its own table without recursing, and a `SECURITY DEFINER` trigger for it would be one more function every reach could call; the route's row lock holds it instead.
- **No Audit Log entry.** The Audit Log records the Admin's changes to other Families ([ADR 0041](./0041-security-actions-are-kept-in-an-audit-log.md)); a Parent's changes to their own Children, such as their limits, aren't logged, and the `star_awards` row already keeps who gave what, and when.

## What the page shows

- **`GET /api/children/:childId/awards`** (reach `parent`) answers with the Child's Stars, the Stars their Parents gave today, the Family Chest's count and the Child's Quest progress, all from the Family's replay.
- **Stars.** Three gold Stars turn gently in 3D, bevelled extrusions on their own small stage (`src/client/parent/award-stages.tsx`), and spin once when Stars are given. Beside them are the Child's Stars to spend and a choice of 5, 10 or 15, defaulting to 5, with sizes that would pass the day's limit disabled, a meter of the day's Stars and how many more can be given.
- **The Family Chest** is the same 3D chest the Children see, spilling one coin for each Activity in it, with the count out of 30, a meter and how many more Activities fill it.
- **Quests**, one card per Island in the Islands' order, each with its Year, its Quest's title, how many of its 30 steps are done and whether it is finished, under way or not started. The Quest under way opens to show what is still to do, each step with its hint and whether it can be done now, and what is done, each with what happened. A step that ends with a question names the curriculum statement it asks about. An Island locked for the Child says so.
- **3D only where it can be drawn.** The 3D stages, and the Family Chest's scene they borrow, are a separate module loaded only when the page draws them, so the Parent page's other sections don't carry them. (three.js itself is already in the chunk the Parent page shares with the game.) A browser that can't draw WebGL shows flat pictures instead, and with reduced motion asked for the Stars stand still.

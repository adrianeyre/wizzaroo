# Every Island is open by default

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0071](./0071-islands-above-a-childs-year-are-explored-but-not-played-by-default.md): only the Islands for the Child's own Year and below are open to play by default; the ones above can still be travelled to and explored, and a Parent opens them early.

Until now a Child could visit the Island for their own Year and every one below it, and the Islands above were locked until a Parent opened them early ([ADR 0025](./0025-one-island-per-year-group.md)). The owner asked for a Child to be able to visit every Island by default.

## What changes

- **Every Island is open, whatever the Child's Year.** `buildIslandsOnMap` in `src/curriculum/island-access.ts` marks every Island as open by default, so the World Map, the Parent's Islands page, the Teacher's view and the Awards page all show every Island open.
- **Locks still close one.** A Parent locks an Island from the Islands page, which adds it to `lockedIslandIds` as before, and a Teacher's lock still closes it whatever the Parent chooses ([ADR 0035](./0035-teachers-lock-what-a-child-plays.md)). A locked Island still shows its landscape, and tapping a Region shows the padlock and "Ask a grown-up to open this Island".
- **Nothing to migrate.** The synced limits keep `unlockedIslandIds` for Islands a Parent opened early before; with every Island open it changes nothing, and locking such an Island drops it from the list. The Parent page no longer lists "Islands you've opened early".
- **The Home Island is still the Child's own Year's.** A Child still starts there, and the Islands page marks it "Open: (name)'s own Year"; every other open Island is marked "Open".
- **Games still play their Island's Year.** An Island's Games teach that Island's Year whatever the Child's own, and each Region still opens its Games one at a time as Stars are earned.

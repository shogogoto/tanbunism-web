# Adventure prototype

Separate `/game` menu; `g g` navigates there. Review XP/Lv stays separate from
dungeon clears. Knowledge choices call the existing exposure API; combat reuses
QuizAttempt, including real answers, reports, previews, and XP invalidation.

First playable slice: resource-scoped dungeon, three knowledge paths, 65% encounter
chance, turn-based correct-answer damage, wrong-answer player damage, five moves
per event (including finishing the final encounter), three enemies per clear.
Player Lv affects HP/attack/defense. No in-dungeon healing. Adventure rights recover
at each clock :00/:30 boundary, capacity one; ongoing HP/kills persist between events. Retreat loses
the run, never learning XP. Dungeon clearing counts laps, not resource levels.

Numbers are provisional balancing constants, not a finalized level design.
The entrance is a menu: Adventure, Status, Items. Adventure resumes the current
dungeon; new destinations appear only after explicitly opening the destination picker.
Items are a placeholder, not implemented weapons.

This is a single-player prototype: **game snapshots are saved server-side per account**
at `/game/state`. HP, progress, clears and the frozen knowledge/quiz order survive
device changes. Refresh/focus reads the latest state; revision checks reject stale
overwrites. Enter/resume saves the snapshot and consumes the clock slot in one
atomic Cypher query. Returning to the menu does not retreat. Old local progress
can be explicitly imported once, before the first server save; it is not deleted.
`run.readIds` is the ordered route of knowledge chosen with Seen, not a set or
recommendation order. Its last item is the current location; an empty route means
the entrance. Event rest resets only the event's move count, never this route.
The route panel connects entrance and visited knowledge, highlights the current
location and combat/rest phase, and opens the shared detail preview on click.
Long routes show the latest three locations and expand to the complete route.
Dungeon progress and the named player's HP/attack/defense are separate panels.
Encounters open a floating dialog with distinct enemy/player HP, the quiz and
damage feedback. Escape/close only hides the dialog; reopening resumes the battle,
not a retreat. Long quizzes scroll inside the viewport-bounded dialog.
Retreat/finishing still discards this run's route; it is not a historical archive.
Admin user management can clear only that
user's waiting time, never HP/laps/XP or accumulate rights. The game refreshes
access every 15 seconds, on focus, and at the next clock boundary.
Use only existing prepared quizzes (no generation when opening a dungeon).
Currently loads up to 100 knowledge items per resource; no route-aware quiz
recommendations yet. Global UI hotkeys continue to work; input/dialog guards apply.

Combat rules still run on the client; the snapshot endpoint is not an anti-cheat
system. Learning answers/exposures and game saves are separate requests: a failed
game save never removes recorded learning XP. No competitive rewards should use
these snapshots until server-authoritative combat is implemented.

Next slices: server-authoritative combat and replay protection;
path-linked encounters and occasional detours; choosing a captured quiz weapon
on clearing, MP and attack turns; capped global-accuracy weapon damage; larger
Power dungeon game-only rewards; skill allocation; quiz-type-specific timers;
multiple enemies. No extra game XP is mixed into learning XP.

# Adventure prototype

Separate `/game` menu; `g g` navigates there. Review XP/Lv stays separate from
dungeon clears. Knowledge choices call the existing exposure API; combat reuses
QuizAttempt, including real answers, reports, previews, and XP invalidation.

First playable slice: resource-scoped dungeon, three knowledge paths, 65% encounter
chance, turn-based correct-answer damage, wrong-answer player damage, five moves
per event (including finishing the final encounter), three enemies per clear.
Player Lv affects HP/attack/defense. No in-dungeon healing. An event recovers after
30 minutes, capacity one; ongoing HP/kills persist between events. Retreat loses
the run, never learning XP. Dungeon clearing counts laps, not resource levels.

Numbers are provisional balancing constants, not a finalized level design.
This is a single-player prototype: **game state is localStorage per account/device**,
not authoritative or synchronized. Knowledge/answers/XP remain server-side.
Use only existing prepared quizzes (no generation when opening a dungeon).
Currently loads up to 100 knowledge items per resource; no route-aware quiz
recommendations yet. Global UI hotkeys continue to work; input/dialog guards apply.

Next slices: server-authoritative adventure state and concurrency/replay protection;
path-linked encounters and occasional detours; choosing a captured quiz weapon
on clearing, MP and attack turns; capped global-accuracy weapon damage; larger
Power dungeon game-only rewards; skill allocation; quiz-type-specific timers;
multiple enemies. No extra game XP is mixed into learning XP.

# Adventure prototype

Separate `/game` menu; `g g` navigates there. Review XP/Lv stays separate from
dungeon clears. Knowledge choices call the existing exposure API; combat reuses
QuizAttempt, including real answers, reports, previews, and XP invalidation.

First playable slice: resource-scoped dungeon, three knowledge paths, 65% encounter
chance, turn-based correct-answer damage, wrong-answer player damage, five moves
per event (including finishing the final encounter), three enemies per clear.
Player Lv grants allocation points; stats only grow through allocation. No in-dungeon healing. Adventure rights recover
at each clock :00/:30 boundary, capacity one; ongoing HP/kills persist between events.
An active outing automatically calls the server's atomic `/game/state/recover`
when a clock slot becomes available (including after reopening). Remaining steps
are replaced with five, never added; HP, enemy HP, current place and deadlines
are untouched. Recovery consumes one shared slot and also refills parked outings.
No active outing means the right stays available for entry. Admin resets use the
same automatic refill. Revision/slot locks prevent two devices from double-refilling.
The map retains the current place's region label. “領域の敵” opens a responsive
list for each discovered band, including stable icons, HP, attack and quiz type.
`content.regionEnemies` pins the prepared quiz-index enemy pool when a band is
first entered; each enemy uses its pinned quiz on every appearance. Combat and
the list share that pool, with provisional HP/attack scaling by region, not player Lv.
Legacy bands lazily derive their pool from the existing frozen dungeon content;
no new quiz generation is triggered by opening the list.
Dungeon switching parks the run on the server, never resetting HP or learning XP.
Dungeon clearing counts laps, not resource levels.

Numbers are provisional balancing constants, not a finalized level design.
Game tabs are removed. The map's lower-left player HP opens a floating stat editor
without navigating or leaving fullscreen. Escape closes only that editor.
The entrance offers status/item buttons; legacy `/game/status` and `/game/item`
links open the corresponding floating panel over the adventure. Recovery status
appears next to the map's remaining-step HUD (or at the entrance).
Adventure resumes the current
dungeon; new destinations appear only after explicitly opening the destination picker.
Items are a placeholder, not implemented weapons.
The adventure entrance also offers previous dungeons, including uncleared visits.
The server keeps a deduplicated recent-first `visitedDungeons` list across retreat,
defeat and clearing, even when an older client omits the field. Legacy active runs
and cleared dungeon IDs seed the list; past abandoned runs were not stored and
cannot be reconstructed. The picker shows currently available resources only.
Choosing a past dungeon only changes the destination. New entry and resuming a
five-move rest consume an adventure right; switching back to a paused outing with
moves remaining does not. Switching is disabled during combat and answer feedback.
Empty or unavailable history is shown explicitly instead of hiding the section.
Desktop (including the collapsed sidebar) and mobile navigation share the
adventure-access cache and show a green dot while adventure is available.
The dot hides when access is consumed, unknown, or its refresh fails, and returns
when the server-clock slot recovers. Logged-out navigation makes no access request.

This is a single-player prototype: **game snapshots are saved server-side per account**
at `/game/state`. HP, progress, clears and the frozen knowledge/quiz order survive
device changes. Refresh/focus reads the latest state; revision checks reject stale
overwrites. Enter/resume saves the snapshot and consumes the clock slot in one
atomic Cypher query. Returning to the menu does not retreat. Old local progress
can be explicitly imported once, before the first server save; it is not deleted.
`maps[resourceId]` stores discovered places, their immutable five-place achievement
bands, actual traversed edges and current location. `dungeons[resourceId]` stores
parked runs and pinned content. These are DB snapshots, not browser-local progress.
Old ordered routes migrate into connected detour edges: they cannot retrospectively
be described as knowledge relations. `run.readIds` remains a bounded travel log;
revisits cost one move but never create another place or change its region.
The spatial map highlights the current place, offers travel to adjacent discovered
places, scrolls to the current location, and opens the shared detail preview.
Active adventure uses the available page width and most viewport height. Unexplored
choices appear on that same map; selecting a place opens a floating knowledge/terms
panel, with explicit move confirmation. Dungeon/player status and adventure actions
float over the map rather than forming a separate card list. The current place uses
the shared profile avatar. Mouse dragging and native touch scrolling pan the map;
zoom buttons and a current-location button provide alternative navigation.
Optional app fullscreen uses the shared modal dialog (not the browser Fullscreen
API), hides the surrounding shell and exits with Escape or its fullscreen toggle.
This changes presentation only, not HP, moves, deadlines or saved dungeon state.
Only the current sentence's existing detail graph/cache is loaded for actual
same-resource relation choices; the whole resource graph is not preloaded.
Knowledge relationships use solid map edges; game detours use dashed edges.
The initial entrance still offers up to three searched knowledge items. The current
slice also offers a detour from the existing knowledge pool. Random detour frequency
and enemy distribution are not finalized. Clearing/defeat resets the next run to the
entrance, while its discovered map remains.
Dungeon progress and the named player's HP/attack/defense are separate panels.
Encounters open a floating dialog with distinct enemy/player HP, the quiz and
damage feedback. Escape/close only hides the dialog; reopening resumes the battle,
not a retreat. Long quizzes scroll inside the viewport-bounded dialog.
Admin user management can clear only that
user's waiting time, never HP/laps/XP or accumulate rights. The game refreshes
access every 15 seconds, on focus, and at the next clock boundary.
Use only existing prepared quizzes (no generation when opening a dungeon).
Initially loads up to 100 knowledge items per resource and adds related knowledge
as encountered; no route-aware quiz recommendations yet. Global UI hotkeys continue
to work; input/dialog guards apply.

Combat rules still run on the client; the snapshot endpoint is not an anti-cheat
system. Learning answers/exposures and game saves are separate requests: a failed
game save never removes recorded learning XP. No competitive rewards should use
these snapshots until server-authoritative combat is implemented.

Next slices: persist fixed enemy sets per achievement region, widen prepared quiz
populations by five at each achievement increase via a bounded queue, and gate NEW
exploration until preparation finishes (known places remain traversable).
The current slice records regions but does NOT implement that preparation gate or
region-based enemies yet. Also pending: protect the default single-resource StudyPlan;
server-authoritative combat and replay protection; choosing a captured quiz weapon
on clearing, MP and attack turns; capped global-accuracy weapon damage; larger
Power dungeon game-only rewards; skill allocation; quiz-type-specific timers;
multiple enemies. No extra game XP is mixed into learning XP.

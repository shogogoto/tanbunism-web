# Adventure prototype

Gambit capacity comes from `/game/gambits/capacity`, not a browser-only level
calculation. The menu displays available slots and the next unlock level; admin
can change the level interval. Older over-capacity lists remain editable so users
can remove rows, but cannot be saved until within the available limit.

Skill definitions include fixed/percentage amounts, duration and stack limit for
buffs/debuffs. Effects start on the next turn, have independent expiry when stacked,
and disappear when combat ends. Battle UI derives temporary stats without mutating
allocation, freezes them while displaying the resolved turn, and shows remaining
effect turns. Item definitions continue referencing these same skills.

Poison damage is displayed separately after each enemy's normal result, clamps at
one remaining HP, and grants no automatic defeat/XP. `characterAssets.ts` registers
six transparent WebP enemy/boss illustrations alongside the existing line icons.
The material picker filters normal enemies/bosses/icons; character art uses larger
avatars in battles. Generation prompts are in `public/game-assets/README.md`.

Boss nodes appear on the map immediately beyond the place that unlocks each
five-achievement milestone (within the current 20-band cap). Their anchors use the
shared milestone list and `PLACES_PER_REGION`, not fixed coordinates or row numbers.
Challenges cost one step and start from that endpoint or its treasure chest.
Milestone-row chests move past the boss so the cards never overlap. The legacy
`/game/boss` list remains available for direct links. Victories unlock that resource
for specialty creation; ordinary three-enemy clears do not. Owned specialties
remain available when unequipped. The Specialties tab manages equipment and fusion.

The stat editor and admin balance controls include MP and MP-per-point. Live and
practice encounter setup refill MP; next turns do not. The game menu's Gambits tab
stores up to ten ordered conditions: HP/MP below a percentage, enemy count, or
always. One usable action executes automatically at turn end, independent of
ordinary quiz correctness. Insufficient MP, inventory and unavailable specialty
sources skip to the next rule within unlocked slots. A specialty can ask one quiz
per source resource with a separate timer per question. MP/items are consumed once
per action; receipts keep retries idempotent. Defeat and retreat do not execute an action.
The old manual specialty endpoints remain for already-open older clients.

Admin game tabs include Skills, Items and Enemies. Their shared catalog persists
server-side with reference validation. Skill tables have one field per column and
type-specific add buttons. The Skill Usage tab grants player skills and configures
specialty quiz policy independently of effects. Items reference skills, including
recovery and equipment effects, without granting direct use. Skills select short
animation presets, shared by admin previews and battle results. Reduced-motion
preferences disable decorative animations.
Enemies use configurable names, icons and attack skills without changing quiz
sets. The searchable icon picker provides 22 existing vector assets. Practice uses
the selected player's gambits and an isolated catalog snapshot, never live writes.

Admin game balance ends with practice battle setup, after the settings save button.
Enemy HP/attack and roster settings share one generation preview inside the
practice setup, with one set of Power/achievement inputs. Practice defaults to
generating from those conditions and the current unsaved balance via the server
simulation API, then passes that result to the shared practice API. Comparison
snapshots keep their original enemy stats and fixed quiz counts; selecting a trial
also selects it for practice. Clearing comparisons clears the selectable trials. Actual dungeon
populations and real player allocations/appearance remain available as separate
sources.

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
list for each discovered band, including its enemy roster, live HP/attack and
each enemy's fixed quiz set.
Neo4j's user/resource-scoped `DungeonRegion` nodes explicitly pin the cumulative
prepared quiz IDs available at each achievement level, five additional quizzes
per level. The API validates and migrates legacy snapshot pools on first entry.
`content.regionQuizPools` and `content.regionEnemies` remain synchronized
projections for combat rendering. Each region has a configurable number of
enemy types; the mother-pool quizzes are assigned without duplication to each
enemy's fixed quiz set. Encounters draw a configurable count from that roster,
then select one quiz from each enemy's set per turn. HP/attack use Power and the
average relationship count in that fixed set, not player Lv. Legacy bands migrate their pool from
the saved enemy list (or the existing frozen quiz content); opening the list never
triggers quiz generation. Later-prepared quizzes expand only newly entered bands.
Superusers can normalize a user's saved active and parked enemy sets from the
admin user list; the operation refuses to run during combat and does not change
the captured populations or adventure progress.
Dungeon switching parks the run on the server, never resetting HP or learning XP.
Dungeon clearing counts laps, not resource levels.

Each region occupies one horizontal row, starting at the entrance and extending
in discovery order. New candidates come from the frontier region's last place,
even after the player travels back to another location. A new region starts at
the entrance. Mobile uses the same rows with panning. Admin's dungeon table has
an explicit `領域を整列` migration action for old saved roads; it preserves
place regions, current location, quiz assignments, and player progress.

Dungeon and StudyPlan views read the same persisted preparation state. Both poll
current status; failure and exhausted candidates are shown separately from live
generation. Dungeon preparation provides an explicit retry action instead of
leaving an insufficient quiz count labelled as preparing forever.

Numbers are provisional balancing constants, not a finalized level design.
Game tabs are removed. `/game` is the map; `/game/status` and `/game/item`
open floating panels over the same mounted adventure. The upper-left HP opens
the stat editor without leaving fullscreen. `s` opens status, including from the
fullscreen map. Inside the menu, Ctrl+1–5 select the numbered status, items,
achievements, gambits and specialties tabs. Input fields and overlaid battle/detail
dialogs are excluded. Back closes the panel and Forward
reopens it. Escape/close returns to the map's history entry; direct panel links
replace their entry with `/game` on close. Legacy `/game/adventure` redirects to
`/game`. Recovery, current location, discovered count and achievement appear
below the remaining-step HUD on the right; the header retains the dungeon title.
Adventure resumes the current
dungeon; new destinations appear only after explicitly opening the destination picker.
The gold HUD opens `/game/shop`; the item HUD opens `/game/item`. Both panels
stay over the mounted map. Each live enemy defeat awards 10 gold times its
one-based region; turn receipts prevent retry rewards. Purchases, equipping,
item consumption and daily rewards are server-owned and revision-checked, and
ordinary snapshot writes retain that economy even for older clients.
Each completed five-place region exposes a treasure chest beyond its last place,
including existing maps. Visiting from that last place opens it without spending
a move, even at zero moves. The revision-checked `/game/chests/open` endpoint
atomically grants the configured contents and records a permanent receipt in
`economy.opened_chests[resourceId][region]`. Opened boxes stay on the map and show
what they contained. Admin game balance controls gold, HP potions and step potions
per box; changes apply to unopened boxes only. Treasure is a facility, not a
knowledge place, so it never increases achievement or enters quiz populations.
The initial catalog offers bronze/steel swords (+3/+8 attack, 100/300 gold) and
HP potions (+20 HP, 30 gold). Owned weapons can be equipped or removed outside
combat; the bonus is shared by live combat, stat allocation previews and practice.
Admin separates item definitions from `shop` listings (`item_id`, price, enabled).
Legacy item prices migrate on read only when `shop` is absent; an explicit empty
shop remains empty. Non-sale items remain usable when already owned. Skills have
no material selector in admin; items and enemies own their art selection. Skill
deletions are staged until Save and can be undone. Item/enemy references block
deletion; player/specialty usage bindings are removed with a deleted definition.
Completing the saved default “今日” knowledge set awards one step potion per
Japan-calendar day, automatically on exposure or the next game state read.
It restores up to three of the five shared moves, without consuming the clock
slot or healing; rest returns to exploration. Empty daily sets award nothing.
Step potions are earned from review rather than sold. Rest shows a review link
and an inventory shortcut. All prices and reward quantities are provisional.
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

New encounters request the server's scheduled combat protocol. The backend owns
action order, question assignment, enemy HP, damage and defeat rewards; the frontend
renders its forecast left to right and submits one answer per action. Speed is a
point-allocated stat. Admin can select linear or square-root speed scaling; the
chosen formula is fixed for each encounter. Forecast generation does not advance
the battle or reroll ties. Old in-progress battles retain the legacy batched UI.
Practice uses the same server scheduler/resolver with unsaved admin settings and
isolated state. Specialty quizzes retain their separate end-action flow.

Next slices: choosing a captured quiz weapon on clearing, MP and attack turns;
capped global-accuracy weapon damage; larger Power dungeon game-only rewards;
skill allocation; quiz-type-specific timers;
multiple enemies. No extra game XP is mixed into learning XP.

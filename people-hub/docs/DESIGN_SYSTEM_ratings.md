# Tarabut People Hub — Rating Design System

Status: current as of the review-screen consistency work. Applies to every screen
where a performance or values rating is shown or captured.

Audience: a developer building or maintaining review screens. This documents the
reusable components, the visual rules, and the reasoning, so new screens stay
consistent without re-deriving the decisions.

## 1. Purpose
The Hub captures two ratings per item: an employee self-rating and a manager rating.
The interface must make three things obvious at a glance, without relying on colour
alone: which control the user interacts with, which rating is the employee's own
(reflective, personal), and which is the manager's (official, final). The manager
rating is the official record; the employee rating is reflective input. Visual weight
follows that meaning.

## 2. Colour semantics (app-wide)
- Purple (var(--purple), #6252DB): interaction, selection, primary actions.
- Bold purple with elevation: the official manager assessment. (A deep-eggplant idea
  was rejected; the manager treatment is bold purple plus a shadow, distinguished from
  the flat selected button by elevation, icon, and badge, not a new colour.)
- Teal (#69F7C3): success, completion, submitted states, positive feedback. Never
  means "manager".
- Amber: warnings. Red: errors.
Neutral/semantic colours are provisional pending Marketing; prefer CSS variables.

## 3. Official rating labels
Always use exactly: 1 Poor · 2 Base · 3 Intermediate · 4 Advanced · 5 Rock Star.
Implemented as a RATING_LABELS map. Averaged annual/quarterly scores are shown as a
number only (an average does not map cleanly to one band).

## 4. Components
In src/modules/performance/RatingBadges.tsx ("use client"). DISPLAY components for a
rating's origin and value; not the interactive control. Icons from lucide-react.

4.1 EmployeeRatingCard — reflective. White bg, 1.5px solid var(--purple) border,
var(--purple-dark) text, lucide User icon, "Employee review" badge, number + official
label. Optional comment prop shown beneath in purple-dark at reduced opacity; card
grows to full width with a comment. Props: score?, label?, comment?, size?("sm"|"md").

4.2 ManagerRatingCard — official. Solid var(--purple) fill, white text, subtle
elevation, lucide ShieldCheck icon, "Manager" badge, number + official label. Optional
comment shown inside the same purple card in rgba(255,255,255,0.88); grows to full
width with a comment. Distinguished from the flat, light selected button by fill,
elevation, icon, and badge, so it never competes with the buttons. Same prop shape.

4.3 RatingComparison — read-only side-by-side (moderation, summaries, history) where
both ratings appear and there are no live buttons. Renders the two cards side by side
with a neutral connector: "Different perspectives" when scores differ, "Aligned" when
they match. Never colour-codes right/wrong; prompts discussion. Props: employeeScore?,
managerScore?, size?. Do NOT use on a live scoring screen where the current user's own
rating is already shown by the buttons (it would duplicate their rating); there, show
only the other party's card as reference.

## 5. Grouped rating unit (scoring screens)
On quarterly (ReviewForm.tsx) and values (ValuesReviewForm.tsx), the current user's
rating, optional definition, and comment are wrapped in one grouped unit so they read
as a single voice, mirroring the manager card and fixing the asymmetry that otherwise
leaves the comment orphaned.
- Container: background #F7F5FD, 1px solid #D9D3F5 border, 12px radius, 16px padding.
- Label row: lucide User icon + badge "Your rating" (viewer is employee) or "Employee
  rating" (viewer is manager).
- Buttons (5.1) on white so they read as interactive inside the tinted unit.
- (Values only) selected level's behavioural definition, quiet grey panel (#F0F1F3,
  muted text). Quarterly shows no definition yet (performance anchors still placeholder).
- Comment input: white bg, 1px #D9D3F5 border, clearly editable.
Order per item: grouped unit (buttons, definition, comment) → on a manager's scoring
view, the employee's EmployeeRatingCard reference (with comment) plus a quiet
"Different perspectives, worth discussing." note when scores differ → on the employee's
completed view, the ManagerRatingCard official rating (with comment).

5.1 Interactive rating buttons — five (1..5), number above official label. Unselected:
white bg, 1px solid var(--border). Selected: var(--purple-subtle) bg, 1.5px solid
var(--purple) border, var(--purple-dark) text, subtle shadow, translateY(-2px).
Deliberately NOT solid bold purple: a row of solid purple competes with the official
manager card. Identity is carried by the display cards, not by making buttons solid.

## 6. States
Hover: pointer cursor and the existing 0.18s transition; any hover tint must not mimic
selected. Focus: keep the native focus ring; do not remove outlines. Selected: as 5.1.
Disabled/locked: non-selected controls drop to ~0.5 opacity, default cursor, selected
value stays legible. Locking is driven by review status and role, not the design layer.

## 7. Accessibility
The employee/manager distinction never relies on colour alone; each is carried by at
least two of fill, border, typography, icon, badge, spacing, elevation. Employee: white
fill, purple outline, User icon, "Employee review"/"Your rating" badge. Manager: solid
purple fill, white text, ShieldCheck icon, "Manager" badge, elevation. A colour-blind
user still distinguishes them by outline-vs-filled, icon, and label.

## 8. Mobile
Buttons use flex:1 and compress; keep the number prominent and let the label shrink or
wrap rather than truncating the number. Cards with comments grow to full width and
stack. RatingComparison should stack the two cards vertically on narrow viewports.

## 9. Where used / to be used
Applied: quarterly, values. To apply as built: year-end (shows assembled scores and
narrative, not per-item 1..5 selection, so the button pattern does not apply; use the
cards for any displayed ratings), moderation, HR dashboard, employee profile, review
history.

## 10. Known follow-ups
- Quarterly behavioural definitions/per-level descriptions not yet shown: the five
  department performance guides still hold placeholder anchors. Once the real content
  is seeded (it exists in the performance master spreadsheet, per department), the
  grouped unit should show the definition for the employee's department guide, matching
  values.
- Provisional colours and Founders Grotesk webfont licence remain pre-production.

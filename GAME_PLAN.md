Build a Telegram Web Game Similar to Car Jam: Escape Puzzle
Goal

Build a Telegram Web App game for casual players age 6 to 12.

The game should feel similar to Car Jam / escape puzzle games:

simple to understand
satisfying to interact with
short levels
fast retry loop
colorful and friendly
touch-first UX
Tech Stack
Frontend language: TypeScript
Frontend framework: SvelteKit
Backend language: Python
Backend framework: FastAPI
Deployment: Vercel
Main Product Requirements

Create a puzzle game where:

the player sees a blocked parking/grid puzzle
vehicles can only move in allowed directions
the player must clear a path and solve the level
levels are short, easy to restart, and progressively harder
user progress is saved
the game runs inside Telegram Web Apps
the UI is suitable for children age 6–12
High-Level Implementation Instructions
1. Create project structure

Create a monorepo with this structure:

/frontend   -> SvelteKit app
/backend    -> FastAPI app
/shared     -> shared schemas, constants, docs, level JSON

Add:

TypeScript config for frontend
Python project config for backend
linting and formatting
environment variable support
README files for setup and deployment
2. Build frontend shell in SvelteKit

Implement the frontend app with:

SvelteKit + TypeScript
mobile-first layout
Telegram WebApp bootstrap
simple app routing
global state for player session and game state

Create these main screens:

loading screen
home screen
level select screen
gameplay screen
win popup / victory screen
daily reward popup
settings screen

Requirements:

large touch targets
minimal text
colorful kid-friendly visuals
responsive layout for Telegram mobile webview
3. Integrate Telegram Web App SDK

Implement Telegram Web App support.

Tasks:

detect if app is running inside Telegram
initialize Telegram Web App SDK on startup
expand web app on launch
read Telegram init data
send init data to backend for validation
store authenticated session in frontend state
support fallback local dev mode outside Telegram

Expected behavior:

when opened inside Telegram, the player is auto-authenticated
when opened outside Telegram, developer mode can simulate a user
4. Build backend auth in FastAPI

Implement backend authentication using Telegram init data validation.

Tasks:

create /auth/telegram endpoint
validate Telegram init data securely
create or update user record
return signed session token
protect gameplay/progress endpoints with auth middleware

User model fields:

internal id
telegram_user_id
username
display_name
avatar_url if available
language_code
created_at
last_seen_at

Do not overcomplicate auth.
Use a simple, secure token/session pattern suitable for MVP.

5. Implement puzzle engine

Build the core gameplay system.

Rules:

board is a grid
each vehicle has:
id
position
length
orientation (horizontal or vertical)
type
vehicles move only along their orientation
vehicles cannot overlap
invalid moves are rejected
level is solved when target vehicle reaches exit

Implement:

board state model
move validation
collision detection
win detection
level reset
undo last move
move counter
optional hint hooks for future use

The engine should be deterministic and testable.

6. Define level schema

Create a JSON schema for levels in /shared or /shared/levels.

Each level should include:

level_id
board_width
board_height
exit position
target vehicle id
vehicle list
star thresholds
theme id
hint metadata placeholder

Vehicle schema:

id
x
y
length
orientation
role/type
color or skin key

Add validation for level JSON files.

7. Add first playable level pack

Create at least:

10 tutorial/easy levels first
structure to support 30 launch levels

Difficulty goals:

first levels must be solvable in seconds
no frustration spike in first 10 levels
gradually introduce blockers and tighter layouts

Also implement:

restart level
next level
back to map
star score based on move count
save completion state
8. Build gameplay UI

Implement the gameplay screen.

Include:

puzzle board
move counter
restart button
undo button
home/back button
level indicator
optional hint button placeholder
sound toggle

UX rules:

interactions must feel immediate
animations should be short and satisfying
invalid move feedback should be clear
victory feedback should be celebratory but not overwhelming

Prioritize touch usability over fancy visuals.

9. Add player progression

Implement backend and frontend support for progress.

Required features:

fetch player progress
mark level completed
unlock next level
save best move count / best star rating
resume progress on next session

Suggested backend endpoints:

GET /me
GET /progress
POST /progress/complete
GET /levels
GET /levels/{id}

Frontend should:

fetch progress after login
show locked/unlocked levels
persist current session state cleanly
10. Implement daily reward

Add a simple retention feature.

Requirements:

player can claim one reward per day
track streak count
reward can be coins, stars, or cosmetic currency placeholder
frontend shows claim popup on eligible login

Suggested endpoints:

GET /rewards/daily
POST /rewards/daily/claim

Keep logic simple and abuse-resistant.

11. Implement leaderboard

Create a basic leaderboard.

Scope for MVP:

global leaderboard
metric can be total stars or levels completed

Suggested endpoints:

GET /leaderboard/global
optional: GET /leaderboard/friends

Frontend should show:

player rank if available
top entries
simple child-friendly presentation

Do not build a complicated social system for MVP.

12. Add sound and feedback

Implement basic feedback systems.

Audio:

move sound
blocked move sound
victory sound
mute toggle

Visual feedback:

smooth vehicle motion
button tap response
success animation on level clear
reward claim animation
subtle invalid move feedback

Keep assets lightweight and web-friendly.

13. Add analytics event hooks

Implement simple analytics events in frontend and/or backend.

Track:

app_open
login_success
level_start
move_made
level_restart
level_complete
hint_used if button exists later
daily_reward_claimed
session_end if feasible

Purpose:

identify tutorial drop-off
measure level difficulty
see where children stop playing

For MVP, lightweight event logging is enough.

14. Make UI safe and appropriate for kids

Apply these product rules throughout implementation:

use minimal reading
prefer icons + short labels
avoid dark patterns
avoid pressure tactics
avoid complicated menus
avoid chat features
avoid unsafe outbound links
avoid ads in MVP
use friendly colors and large buttons
make retrying easy and non-punishing

Design for children who may have limited patience and reading ability.

15. Prepare Vercel deployment

Deploy both apps to Vercel.

Frontend:

standard SvelteKit deployment

Backend:

FastAPI deployed in a Vercel-compatible way
expose API routes cleanly
configure environment variables

Add:

production env config
preview env config
CORS configuration
Telegram app URL configuration support

Document deployment steps clearly in README.

Required Deliverables
Frontend deliverables

Implement:

SvelteKit app shell
Telegram integration
home screen
level select screen
gameplay screen
victory popup
daily reward popup
settings screen
sound toggle
progress sync
leaderboard screen
Backend deliverables

Implement:

FastAPI app
Telegram auth endpoint
user/profile endpoints
progress endpoints
level content endpoints
daily reward endpoints
leaderboard endpoint
simple persistence layer
auth middleware
Shared deliverables

Implement:

level schema
level JSON files
constants
validation helpers
API contract docs
MVP Acceptance Criteria

The MVP is complete when:

A user can open the game inside Telegram.
The app authenticates the user with Telegram data.
The player can play at least 10 working levels.
Vehicles move correctly and collisions are prevented.
Win condition works.
Progress is saved.
Completed levels unlock the next level.
Daily reward can be claimed once per day.
Leaderboard data is viewable.
The game is usable on mobile and feels suitable for ages 6–12.
Frontend and backend are both deployable on Vercel.
Implementation Priorities

Implement in this order:

Priority 1
project setup
Telegram integration
backend auth
puzzle engine
first playable gameplay screen
Priority 2
levels
progress save/load
level select
win flow
restart/undo
Priority 3
daily reward
leaderboard
sounds
analytics hooks
UI polish
Non-Goals for MVP

Do not spend time yet on:

multiplayer
chat
monetization
advanced cosmetics
seasonal events
complex backend admin panels
complex friend systems
procedural generation
Coding Style Instructions
keep code modular and readable
keep gameplay logic separate from UI
keep API contracts explicit
use typed schemas everywhere possible
write tests for puzzle engine and auth-critical logic
avoid overengineering
prefer simple, production-usable implementations
Final instruction to Codex

Implement the MVP end-to-end with clean structure and clear separation between:

frontend app
game engine
backend API
persistence
Telegram integration

Start with a playable vertical slice first, then expand to progression and retention features.
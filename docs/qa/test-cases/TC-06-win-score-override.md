# TC-06 — Win score override

**Area:** Win rules  
**Type:** Manual

## Setup

Default pack win target is 500.

## Steps

1. On the host, set **Win at** to a low number (e.g. 10). Award a round that crosses it. Main game should end (or go to lightning if lightning is on).
2. **Restart game**. Confirm **Win at** is still the overridden value (not reset to 500). Names stay; scores reset.
3. Clear **Win at** (blank). Award freely; no auto-win. **End game** still freezes a winner or tie from current scores.

## Expected

Pack `win.targetPoints` is a default only. Host override sticks through Restart (`hostTargetPoints`).

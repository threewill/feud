# TC-07 — Lightning round toggle

**Area:** Lightning  
**Type:** Manual

## Setup

October sample pack has lightning questions and `lightning.enabled: false`.

## Steps

1. Fresh load: **Lightning round** checkbox is off (but enabled, because questions exist).
2. Check **Lightning round**. **End game** (or hit the win score) names a leading family and enters lightning, not a final winner overlay only.
3. Uncheck **Lightning round**. **End game** freezes winner/tie without Fast Money.
4. With lightning on, **Restart game**. Checkbox stays on.

## Expected

Host checkbox overrides `lightning.enabled` and sticks through Restart. If a pack has **no** lightning questions, the checkbox is disabled.

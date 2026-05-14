---
version: 1
updated: 2026-05-14
note: |
  PLACEHOLDER content. Roel's team's real use-case writeup goes here.
  The numbers, scope, and rollout below are illustrative defaults for a
  mid-sized Dutch P&C insurer. Swap the entire file when Roel provides
  the actual content; bump `version` when you do.
---

# The use-case: a voicebot for customer contact

## Problem

Our company is a mid-sized Dutch property-and-casualty insurer. Our customer contact centre handles around five hundred thousand inbound calls per year. Roughly a quarter of those are simple status enquiries: where is my claim, when will my pay-out arrive, has my premium gone through. Another fifteen percent are policy FAQ — coverage questions, deductibles, what's included. These calls are repetitive, low-complexity, and reasonably scriptable, yet they take human agents three to five minutes each and cost us between three and five euros per call. Meanwhile the truly complex, emotional, or high-value conversations — a customer who just crashed their car, a difficult fraud signal, a vulnerable claimant — wait in the queue behind people asking what their excess is.

## Solution

A voicebot that handles two scopes in phase one: claims status enquiries and policy FAQ. Customers call the existing service number, the bot answers, identifies them, handles the simple ask, and either resolves the call or warm-transfers to a human with full context. Crucially, the bot never tries to handle a first-notice-of-loss or anything emotional — those go straight to a human from the first detected signal.

## Why voice and not a chatbot

Three reasons. First, our customer base skews older than the digital average for the Netherlands; voice is their preferred channel and pushing them to chat reduces NPS. Second, voice handles emotional and time-pressured contact better than chat — a frustrated customer types worse than they talk. Third, we already operate a phone number; adding voice AI in front of it is a non-disruptive UX change rather than launching a new channel.

## Expected impact

In phase one we target a thirty-percent deflection rate on the two in-scope call types, which is at the low end of what comparable Dutch insurers have reported publicly. That's roughly sixty thousand calls per year handled end-to-end by the bot, saving on the order of two-hundred-thousand euros annually in agent time, against a build-and-run cost we estimate at sixty to eighty thousand in year one. We are not promising NPS gains — the goal is NPS-neutral while freeing human agents for the calls that actually need them. We will measure deflection rate, NPS for bot-handled calls, NPS for transferred calls, and average wait time for human-handled calls as the four leading indicators.

## Risks and limits

The biggest risk is misclassification — a vulnerable or emotional caller getting kept on the bot when they need a human. We mitigate with conservative routing: any detected emotional cue, any sentence the bot is not confident it understood, any complex claim type, and we transfer. Second risk is regulatory — the Dutch financial regulator AFM requires clear duty-of-care for vulnerable consumers, and we will not roll out without sign-off from compliance and a documented escalation path. Third risk is brand — a bad voicebot interaction reflects badly on us. Mitigation is a hard scope, a phased rollout, and clear opt-out ("press zero for a person, any time"). What we are explicitly *not* doing in phase one: claims intake, sales, complaints handling, anything with material financial decisions.

## Rollout

Phase one is a three-to-six-month pilot on claims status only, routed to ten percent of inbound. Phase two adds policy FAQ and ramps to fifty percent. Phase three, contingent on phase two metrics, considers broader scopes. Each phase has explicit go and no-go criteria on deflection rate, NPS deltas, and complaint volume. We start with claims status because it is the highest-volume, lowest-complexity, lowest-emotional-risk slice — the cleanest learning ground.

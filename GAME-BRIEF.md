# Small game brief

Copy this template into your next game project or paste it into a Codex chat.

- **Player experience** — What should the player do and how should it feel?
- **Scope** — What is the smallest playable version? What can wait?
- **Acceptance criteria** — Given a starting state and an input, what should happen next?
- **Verification** — Which command checks the rules? What should someone try in the browser?
- **Decisions** — Which choices can the agent make, and which should it bring back to you?

## Implement and review

1. Inspect the project and run the existing checks to establish a baseline.
2. Pick one acceptance criterion. Make the smallest change that satisfies it and add or update a test when it can capture the behavior.
3. Run the checks again. For a player-facing change, also try the relevant action in the browser.
4. Review the diff against the brief. Report what changed, what passed, and anything still unverified. Hand the playable change back for feedback.

Kickoff prompt: “Implement the first unchecked criterion in this brief. Follow the project instructions, run the relevant checks, and report the result and any decisions you made.”

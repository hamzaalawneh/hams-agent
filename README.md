# Hams Agent: Test Call

The in-browser test call where you first hear the agent you designed. Built with React, TypeScript and Vite.

**Live:** https://hams-agent.vercel.app/

## Run it

```bash
yarn
yarn dev
```

## How I approached it

I focused on making it work first, and work well: every requirement delivered, even where the code wasn't as clean as I'd like yet. Once it worked, I went back and cleaned it up. Given the time budget, I'd rather ship something that works than something beautiful that's half done.

## What I cut

- **The mic picker.** Instead, the app switches to your headset automatically when you plug it in, and shows which mic it's using ("Using: AirPods Pro"). One less thing for Faisal to think about.
- **Captions of what you say.** That needs a real speech model, which is out of scope. Only the agent is captioned.
- **Only one stretch goal:** interrupting the agent (barge-in).

## With another week

- [ ] A bigger cleanup pass, to make the code more readable and organised
- [ ] A module-based structure (fine as it is for now, with only one screen)
- [ ] A maximum call length, so testers don't burn through the client's tokens
- [ ] Support for multiple environments
- [ ] Move the remaining magic numbers (timings, thresholds) into `constants/`
- [ ] Automated and unit tests for the tricky parts: mic permissions, headset hot-swap, network recovery
- [ ] A Hams pulse animation while the user is talking
- [ ] Smooth transitions when switching language, theme and so on

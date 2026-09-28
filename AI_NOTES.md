# AI notes

## Tools I used

- **Claude Code**
- **RTK**

## Where it helped

- **Browser audio plumbing:** Web Audio, `getUserMedia`, level meters, the fake session. It knew the APIs and their edge cases well.
- **Testing without a phone:** it drove headless Chrome with a fake mic playing a recorded "user", so it could run whole calls, measure layout shifts and check that nothing leaked after hang-up.

- **Arabic translations,** and making sure mixed Arabic/English captions render correctly.

## Where I overrode it

- **Code style.** It reached for design-token spacing (`var(--space-1)`), a class with `private` fields, and `../../` imports. I asked for plain values, a plain function, and path aliases.
- **Readability.** Its first version of `useMicrophone` worked but was hard to follow, so I had it rewritten around one simple rule ("use the best mic").
- **Git.** I told it never to commit or push on its own. I review and commit myself.

## One thing it got confidently wrong

It told me that plugging in AirPods would "just work", because macOS makes them the default mic. When I tried it, the call still used the MacBook's built-in mic. macOS often keeps the laptop mic as the default input. The fix was to stop trusting the system default and pick a connected headset ourselves, skipping virtual mics like Zoom's.

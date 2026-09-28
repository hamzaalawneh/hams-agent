# components/

Shared, reusable components (used by more than one screen, or generic enough to be).
Screen-specific pieces stay inside that screen's own folder instead.

Each component gets its own folder, same split as screens:

```
components/
  Button/
    index.tsx
    styles.css
    types.ts
```

`index.tsx` exports the component, `styles.css` its styles, `types.ts` its prop/types.

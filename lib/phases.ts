export type PhaseMeta = {
  order: number
  name: string
  shortName: string
  window: string
  description: string
}

export const PHASES: PhaseMeta[] = [
  { order: 1, name: 'Phase 1: Foundation', shortName: 'Foundation',
    window: 'Now – Nov 2026 · ~11 months out',
    description: 'Non-negotiables that unlock everything else.' },
  { order: 2, name: 'Phase 2: Core Vendors', shortName: 'Core Vendors',
    window: 'Nov 2026 – Feb 2027 · 8–11 months out',
    description: 'The vendors who book fastest and matter most.' },
  { order: 3, name: 'Phase 3: Design & Logistics', shortName: 'Design & Logistics',
    window: 'Feb – May 2027 · 5–8 months out',
    description: 'The look comes together, guest logistics get real.' },
  { order: 4, name: 'Phase 4: Details & Decisions', shortName: 'Details & Decisions',
    window: 'Jun – Jul 2027 · 3–4 months out',
    description: 'Pinterest becomes real.' },
  { order: 5, name: 'Phase 5: Home Stretch', shortName: 'Home Stretch',
    window: 'Aug – Sep 2027 · 1–2 months out',
    description: 'Invitations out, decisions locked.' },
  { order: 6, name: 'Phase 6: Final 2 Weeks', shortName: 'Final 2 Weeks',
    window: 'Late Sep – early Oct 2027',
    description: 'Lock everything. Delegate. Wind down.' },
  { order: 7, name: 'Phase 7: Wedding Week & Day-Of', shortName: 'Wedding Week',
    window: 'Oct 9, 2027 · the main event',
    description: 'Execute. Everything is delegated by now.' },
  { order: 8, name: 'Phase 8: Post-Wedding', shortName: 'Post-Wedding',
    window: 'Oct – Nov 2027',
    description: 'Close the loop.' }
]

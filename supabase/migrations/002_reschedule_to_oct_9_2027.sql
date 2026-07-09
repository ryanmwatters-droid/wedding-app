-- Reschedule the wedding from mid-May 2027 to Saturday, October 9, 2027.
--
-- This ONLY rewrites the date strings baked into task text/notes. It is
-- non-destructive: it matches rows by their stable (phase_order, task_order)
-- identity and never touches `completed`, `completed_by`, `completed_at`, or
-- `decision` (the "What we decided…" comments). Safe to run on the live DB.
--
-- Phase windows themselves live in lib/phases.ts (code), not the DB.

-- Phase 1: the date is now locked.
UPDATE tasks SET
  text  = 'Wedding date locked: Saturday, October 9, 2027',
  notes = 'Date confirmed: Saturday, October 9, 2027. Fall wedding in Chicago.'
WHERE phase_order = 1 AND task_order = 4;

-- Phase 3: save-the-dates — 6–8 months before Oct 9, 2027 = Feb–Apr 2027.
UPDATE tasks SET
  text  = 'Design + order save-the-dates (send 6–8 months before = Feb–Apr 2027)'
WHERE phase_order = 3 AND task_order = 2;

-- Phase 3: wedding dress lead time — don't wait past ~Feb 2027 for an Oct wedding.
UPDATE tasks SET
  notes = 'Bridal gowns take 6–9 months + alterations. Don''t wait past Feb 2027.'
WHERE phase_order = 3 AND task_order = 5;

-- Phase 3: honeymoon timing — now after an October wedding.
UPDATE tasks SET
  notes = 'Ideal windows: right after (Oct 2027) or a delayed honeymoon in winter 2027–28.'
WHERE phase_order = 3 AND task_order = 12;

-- Phase 4: invitation suite — 8–10 weeks before Oct 9, 2027 = late Jul / early Aug 2027.
UPDATE tasks SET
  notes = 'Send invites 8–10 weeks out = late July / early August 2027. Calligraphy adds ~4 weeks.'
WHERE phase_order = 4 AND task_order = 2;

-- Phase 5: send invitations target.
UPDATE tasks SET
  text  = 'Send invitations (target early August 2027)'
WHERE phase_order = 5 AND task_order = 1;

-- Phase 5: bach/bach parties — 1–2 months before the wedding.
UPDATE tasks SET
  text  = 'Bachelor + bachelorette parties (late August / early September 2027)'
WHERE phase_order = 5 AND task_order = 8;

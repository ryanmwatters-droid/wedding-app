// Real email addresses for notification recipients.
// Names must match what shows up in the chat (derived from auth email local-part).
export const PEOPLE: Record<string, string> = {
  Ryan: 'YOUR_EMAIL_HERE',
  Hannah: 'HANNAHS_EMAIL_HERE',
  Sue: 'SUES_EMAIL_HERE',
}

export const PEOPLE_NAMES = Object.keys(PEOPLE) as Array<keyof typeof PEOPLE>

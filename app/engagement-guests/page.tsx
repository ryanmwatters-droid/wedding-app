'use client'

import { GuestList } from '@/components/GuestList'

export default function EngagementGuestsPage() {
  return <GuestList
    tableName="engagement_guests"
    title="Engagement Party"
    importFromTable={{ table: 'guests', label: 'Wedding List' }}
  />
}

import { getAllEventsAction } from '@/app/actions/attendance-actions'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const events = await getAllEventsAction()
  return <EventsClient initialEvents={events} />
}

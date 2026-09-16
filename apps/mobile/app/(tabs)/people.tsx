import { PublishedPeople } from "../../components/published-people";
import { useSummit } from "../../components/summit-context";

export default function PeopleScreen() {
  const { snapshot } = useSummit();
  return <PublishedPeople people={snapshot.speakers.filter(person => person.published && person.eventId === snapshot.event.id)} />;
}

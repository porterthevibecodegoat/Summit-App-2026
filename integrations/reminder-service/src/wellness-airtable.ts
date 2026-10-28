import { airtableSourceEnvironment, wellnessAirtableGet } from "../../../apps/web/lib/integrations/wellness-airtable";
import { sourceBookingStore, sourceSubmissionStore } from "../../../apps/web/lib/integrations/source-store";
export const config = { path: "/api/integrations/wellness-airtable", method: "GET" };
export default (request: Request) => wellnessAirtableGet(request, {
  storeProvider: () => sourceSubmissionStore(airtableSourceEnvironment(process.env)),
  bookingStoreProvider: () => sourceBookingStore(airtableSourceEnvironment(process.env)),
});

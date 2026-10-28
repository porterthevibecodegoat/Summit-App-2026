import { agendaGet } from "../../../apps/web/lib/integrations/handlers";
import { sourceBookingStore, sourceSubmissionStore } from "../../../apps/web/lib/integrations/source-store";
export const config = { path: "/api/integrations/agenda", method: "GET" };
export default (request: Request) => agendaGet(request, {
  storeProvider: () => sourceSubmissionStore(), bookingStoreProvider: () => sourceBookingStore(),
});

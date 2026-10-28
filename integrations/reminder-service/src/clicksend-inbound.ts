import { clicksendInboundPost } from "../../../apps/web/lib/integrations/handlers";
import { sourceSubmissionStore } from "../../../apps/web/lib/integrations/source-store";
export const config = { path: "/api/integrations/clicksend-inbound", method: "POST" };
export default (request: Request) => clicksendInboundPost(request, { storeProvider: () => sourceSubmissionStore() });

import { PaperlessPartsClient } from "./client";

export {
  createPartFromComponent,
  getCarbonOrderStatus,
  getCustomerIdAndContactId,
  getCustomerLocationIds,
  getEmployeeAndSalesPersonId,
  getOrCreatePart,
  getOrderLocationId,
  getPaperlessPart,
  insertOrderLines
} from "./lib";
export { OrderSchema } from "./schemas";

export async function getPaperlessParts(apiKey: string) {
  const client = new PaperlessPartsClient(apiKey);
  return client;
}

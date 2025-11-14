import { requirePermissions } from "@carbon/auth/auth.server";
import { Constants } from "@carbon/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HStack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@carbon/react";
import { useLoaderData, useParams } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@vercel/remix";
import { Select } from "~/components";
import { useRouteData } from "~/hooks";

import type { Issue, IssueItem } from "~/modules/quality";
import { getIssueItems } from "~/modules/quality";
import { ItemProgress } from "~/modules/quality/ui/Issue/IssueTask";
import { path } from "~/utils/path";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "quality",
  });

  const { id } = params;
  if (!id) throw new Error("Non-conformance ID is required");

  const items = await getIssueItems(client, id, companyId);

  return json({
    items: items.data || [],
  });
}

export default function IssueActions() {
  const { items } = useLoaderData<typeof loader>();
  const { id } = useParams();
  if (!id) throw new Error("Non-conformance ID is required");
  const routeData = useRouteData<{
    nonConformance: Issue;
  }>(path.to.issue(id));

  return (
    <VStack spacing={2} className="w-full">
      <ItemsList
        items={items}
        isDisabled={routeData?.nonConformance.status === "Closed"}
      />
    </VStack>
  );
}

function ItemsList({
  items,
  isDisabled,
}: {
  items: IssueItem[];
  isDisabled: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="w-full min-h-[calc(100vh-115px)]" isCollapsible>
      <HStack className="justify-between w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Dispositions
          </CardTitle>
        </CardHeader>
        <ItemProgress items={items} />
      </HStack>
      <CardContent>
        <VStack spacing={3}>
          <Table>
            <Thead>
              <Th>Item</Th>
              <Th>Disposition</Th>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.name}</Td>
                  <Td>
                    <Select
                      value={item.disposition || ""}
                      onChange={() => {}}
                      name={`${item.id}-disposition`}
                      // label="Disposition"
                      options={Constants.public.Enums.disposition.map(
                        (disposition) => ({
                          value: disposition,
                          label: disposition,
                        })
                      )}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </VStack>
      </CardContent>
    </Card>
  );
}

import { error, getCarbonServiceRole } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@carbon/react";
import { LuInbox } from "react-icons/lu";
import type { LoaderFunctionArgs } from "react-router";
import { Link, Outlet, redirect, useLoaderData } from "react-router";
import { useUrlParams } from "~/hooks";
import { ApprovalDocumentType, getApprovalRules } from "~/modules/approvals";
import ApprovalRulesTable from "~/modules/approvals/ui/ApprovalRulesTable";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";

export const handle: Handle = {
  breadcrumb: "Rules",
  to: path.to.approvalSettings
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { companyId } = await requirePermissions(request, {
    view: "settings",
    role: "employee"
  });

  const serviceRole = getCarbonServiceRole();
  const rules = await getApprovalRules(serviceRole, companyId);

  if (rules.error) {
    throw redirect(
      path.to.company,
      await flash(request, error(rules.error, "Failed to load approval rules"))
    );
  }

  const poRules =
    rules.data?.filter((r) => r.documentType === "purchaseOrder") || [];

  const qdRules =
    rules.data?.filter((r) => r.documentType === "qualityDocument") || [];

  return {
    poRules,
    qdRules
  };
}

export default function ApprovalSettingsRoute() {
  const { poRules, qdRules } = useLoaderData<typeof loader>();
  const [params, setParams] = useUrlParams();
  const activeTab =
    (params.get("tab") as ApprovalDocumentType) || "purchaseOrder";

  return (
    <>
      <div className="h-full w-full flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setParams({ tab: value });
          }}
          className="h-full w-full flex flex-col"
        >
          <div className="border-b border-border bg-card">
            <div className="px-4 py-1 md:px-6 lg:px-8 flex items-center justify-between">
              <TabsList className="bg-transparent h-10 border-none gap-1">
                <TabsTrigger
                  value="purchaseOrder"
                  variant="primary"
                  className="px-4 py-1.5"
                >
                  Purchase Orders
                </TabsTrigger>
                <TabsTrigger
                  value="qualityDocument"
                  variant="primary"
                  className="px-4 py-1.5"
                >
                  Quality Documents
                </TabsTrigger>
              </TabsList>
              <Button variant="secondary" leftIcon={<LuInbox />} asChild>
                <Link to={path.to.approvalRequests}>View Requests</Link>
              </Button>
            </div>
          </div>
          <TabsContent
            value="purchaseOrder"
            className="flex-1 overflow-hidden w-full mt-0 data-[state=inactive]:hidden"
          >
            <div className="h-full w-full">
              <ApprovalRulesTable
                data={poRules}
                count={poRules.length}
                documentType="purchaseOrder"
              />
            </div>
          </TabsContent>
          <TabsContent
            value="qualityDocument"
            className="flex-1 overflow-hidden w-full mt-0 data-[state=inactive]:hidden"
          >
            <div className="h-full w-full">
              <ApprovalRulesTable
                data={qdRules}
                count={qdRules.length}
                documentType="qualityDocument"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Outlet />
    </>
  );
}

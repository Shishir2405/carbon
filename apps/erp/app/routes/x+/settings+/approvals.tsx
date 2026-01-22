import {
  assertIsPost,
  error,
  getCarbonServiceRole,
  success
} from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import {
  Hidden,
  MultiSelect,
  Number,
  Submit,
  ValidatedForm,
  validationError,
  validator
} from "@carbon/form";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Heading,
  HStack,
  ScrollArea,
  Switch,
  VStack
} from "@carbon/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, redirect, useLoaderData } from "react-router";
import { User } from "~/components/Form";
import {
  approvalConfigurationValidator,
  getApprovalConfigurations,
  upsertApprovalConfiguration
} from "~/modules/approvals";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";

export const handle: Handle = {
  breadcrumb: "Approvals",
  to: path.to.approvalSettings
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "settings",
    role: "employee"
  });

  const serviceRole = getCarbonServiceRole();

  const [configurations, groupsResult] = await Promise.all([
    getApprovalConfigurations(serviceRole, companyId),
    client
      .from("group")
      .select("id, name")
      .eq("companyId", companyId)
      .eq("isCustomerOrgGroup", false)
      .eq("isSupplierOrgGroup", false)
  ]);

  if (configurations.error) {
    console.error(
      "Failed to load approval configurations:",
      configurations.error
    );
  }

  if (groupsResult.error) {
    console.error("Failed to load groups:", groupsResult.error);
  }

  // Get all configurations grouped by document type
  const poConfigs =
    configurations.data?.filter((c) => c.documentType === "purchaseOrder") ||
    [];

  const qdConfigs =
    configurations.data?.filter((c) => c.documentType === "qualityDocument") ||
    [];

  return {
    poConfigs,
    qdConfigs,
    groups: groupsResult.data ?? []
  };
}

export async function action({ request }: ActionFunctionArgs) {
  assertIsPost(request);
  const { companyId, userId } = await requirePermissions(request, {
    update: "settings",
    role: "employee"
  });

  const serviceRole = getCarbonServiceRole();

  const formData = await request.formData();
  const validation = await validator(approvalConfigurationValidator).validate(
    formData
  );

  if (validation.error) {
    return validationError(validation.error);
  }

  const existingId = formData.get("id") as string | null;

  const result = await upsertApprovalConfiguration(serviceRole, {
    ...(existingId
      ? { id: existingId, updatedBy: userId }
      : { createdBy: userId, companyId }),
    documentType: validation.data.documentType,
    enabled: validation.data.enabled,
    approverGroupIds: validation.data.approverGroupIds || [],
    defaultApproverId: validation.data.defaultApproverId,
    lowerBoundAmount: validation.data.lowerBoundAmount ?? 0,
    upperBoundAmount: validation.data.upperBoundAmount ?? null,
    escalationDays: validation.data.escalationDays
  });

  if (result.error) {
    throw redirect(
      path.to.approvalSettings,
      await flash(request, error(result.error, result.error.message))
    );
  }

  throw redirect(
    path.to.approvalSettings,
    await flash(request, success("Approval configuration saved"))
  );
}

export default function ApprovalSettingsRoute() {
  const loaderData = useLoaderData<typeof loader>();

  const poConfigs = loaderData?.poConfigs ?? [];
  const qdConfigs = loaderData?.qdConfigs ?? [];
  const groups = loaderData?.groups ?? [];

  const groupOptions = groups.map((g) => ({
    value: g.id,
    label: g.name
  }));

  return (
    <ScrollArea className="w-full h-[calc(100dvh-49px)]">
      <VStack
        spacing={4}
        className="py-12 px-4 max-w-[60rem] h-full mx-auto gap-4"
      >
        <HStack className="justify-between items-center w-full">
          <Heading size="h3">Approval Settings</Heading>
          <Button variant="secondary" size="sm" asChild>
            <Link to={path.to.approvals}>View approval requests</Link>
          </Button>
        </HStack>

        {/* Purchase Order Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Approvals</CardTitle>
            <CardDescription>
              Configure approval workflows for purchase orders by amount ranges.
              Each configuration applies to orders within its specified amount
              range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {poConfigs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {poConfigs.map((config) => (
                  <Card key={config.id}>
                    <ValidatedForm
                      method="post"
                      validator={approvalConfigurationValidator}
                      defaultValues={{
                        documentType: "purchaseOrder",
                        enabled: config.enabled ?? false,
                        approverGroupIds: Array.isArray(config.approverGroupIds)
                          ? config.approverGroupIds
                          : [],
                        defaultApproverId:
                          config.defaultApproverId ?? undefined,
                        lowerBoundAmount: config.lowerBoundAmount ?? 0,
                        upperBoundAmount: config.upperBoundAmount ?? undefined,
                        escalationDays: config.escalationDays ?? undefined
                      }}
                    >
                      <CardHeader>
                        <CardTitle>
                          Range: ${config.lowerBoundAmount ?? 0}
                          {config.upperBoundAmount !== null
                            ? ` - $${config.upperBoundAmount}`
                            : "+"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {config.id && <Hidden name="id" value={config.id} />}
                        <Hidden name="documentType" value="purchaseOrder" />
                        <div className="flex flex-col gap-6 max-w-[400px]">
                          <Switch name="enabled" label="Enabled" />
                          <MultiSelect
                            name="approverGroupIds"
                            label="Approver Groups"
                            placeholder="Select groups"
                            options={groupOptions}
                          />
                          <User
                            name="defaultApproverId"
                            label="Default Approver"
                            placeholder="Select a user"
                          />
                          <Number
                            name="lowerBoundAmount"
                            label="Lower Bound Amount"
                            helperText="Minimum amount (inclusive) for this configuration"
                            step={0.01}
                          />
                          <Number
                            name="upperBoundAmount"
                            label="Upper Bound Amount"
                            helperText="Maximum amount (exclusive) for this configuration. Leave empty for no upper limit."
                            step={0.01}
                          />
                          <Number
                            name="escalationDays"
                            label="Escalation Days"
                            helperText="Auto-escalate after this many days (leave empty to disable)"
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Submit>Update</Submit>
                      </CardFooter>
                    </ValidatedForm>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No purchase order approval configurations. Create one below.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add New Purchase Order Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Add Purchase Order Configuration</CardTitle>
            <CardDescription>
              Create a new approval configuration for a specific amount range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValidatedForm
              method="post"
              validator={approvalConfigurationValidator}
              defaultValues={{
                documentType: "purchaseOrder",
                enabled: true,
                lowerBoundAmount: 0,
                upperBoundAmount: undefined
              }}
            >
              <Hidden name="documentType" value="purchaseOrder" />
              <div className="flex flex-col gap-6 max-w-[400px]">
                <Switch name="enabled" label="Enabled" />
                <MultiSelect
                  name="approverGroupIds"
                  label="Approver Groups"
                  placeholder="Select groups"
                  options={groupOptions}
                />
                <User
                  name="defaultApproverId"
                  label="Default Approver"
                  placeholder="Select a user"
                />
                <Number
                  name="lowerBoundAmount"
                  label="Lower Bound Amount"
                  helperText="Minimum amount (inclusive) for this configuration"
                  step={0.01}
                />
                <Number
                  name="upperBoundAmount"
                  label="Upper Bound Amount"
                  helperText="Maximum amount (exclusive) for this configuration. Leave empty for no upper limit."
                  step={0.01}
                />
                <Number
                  name="escalationDays"
                  label="Escalation Days"
                  helperText="Auto-escalate after this many days (leave empty to disable)"
                />
              </div>
              <CardFooter className="py-4 px-0">
                <Submit>Create Configuration</Submit>
              </CardFooter>
            </ValidatedForm>
          </CardContent>
        </Card>

        {/* Quality Document Configurations */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Document Approvals</CardTitle>
            <CardDescription>
              Configure approval workflows for quality documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qdConfigs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {qdConfigs.map((config) => (
                  <Card key={config.id}>
                    <ValidatedForm
                      method="post"
                      validator={approvalConfigurationValidator}
                      defaultValues={{
                        documentType: "qualityDocument",
                        enabled: config.enabled ?? false,
                        approverGroupIds: Array.isArray(config.approverGroupIds)
                          ? config.approverGroupIds
                          : [],
                        defaultApproverId:
                          config.defaultApproverId ?? undefined,
                        lowerBoundAmount: config.lowerBoundAmount ?? 0,
                        upperBoundAmount: config.upperBoundAmount ?? undefined,
                        escalationDays: config.escalationDays ?? undefined
                      }}
                    >
                      <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {config.id && <Hidden name="id" value={config.id} />}
                        <Hidden name="documentType" value="qualityDocument" />
                        <div className="flex flex-col gap-6 max-w-[400px]">
                          <Switch
                            name="enabled"
                            label="Enable Quality Document Approvals"
                          />
                          <MultiSelect
                            name="approverGroupIds"
                            label="Approver Groups"
                            placeholder="Select groups"
                            options={groupOptions}
                          />
                          <User
                            name="defaultApproverId"
                            label="Default Approver"
                            placeholder="Select a user"
                          />
                          <Number
                            name="escalationDays"
                            label="Escalation Days"
                            helperText="Auto-escalate after this many days (leave empty to disable)"
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Submit>Update</Submit>
                      </CardFooter>
                    </ValidatedForm>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No quality document approval configurations. Create one below.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add New Quality Document Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Add Quality Document Configuration</CardTitle>
            <CardDescription>
              Create a new approval configuration for quality documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValidatedForm
              method="post"
              validator={approvalConfigurationValidator}
              defaultValues={{
                documentType: "qualityDocument",
                enabled: true,
                lowerBoundAmount: 0,
                upperBoundAmount: undefined
              }}
            >
              <Hidden name="documentType" value="qualityDocument" />
              <div className="flex flex-col gap-6 max-w-[400px]">
                <Switch
                  name="enabled"
                  label="Enable Quality Document Approvals"
                />
                <MultiSelect
                  name="approverGroupIds"
                  label="Approver Groups"
                  placeholder="Select groups"
                  options={groupOptions}
                />
                <User
                  name="defaultApproverId"
                  label="Default Approver"
                  placeholder="Select a user"
                />
                <Number
                  name="escalationDays"
                  label="Escalation Days"
                  helperText="Auto-escalate after this many days (leave empty to disable)"
                />
              </div>
              <CardFooter className="py-4 px-0">
                <Submit>Create Configuration</Submit>
              </CardFooter>
            </ValidatedForm>
          </CardContent>
        </Card>
      </VStack>
    </ScrollArea>
  );
}

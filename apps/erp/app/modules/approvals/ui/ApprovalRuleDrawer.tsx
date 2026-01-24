import {
  Number as FormNumber,
  Hidden,
  Input,
  MultiSelect,
  Submit,
  ValidatedForm
} from "@carbon/form";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  HStack,
  Switch
} from "@carbon/react";
import { User } from "~/components/Form";
import { usePermissions } from "~/hooks";
import {
  ApprovalDocumentType,
  type ApprovalRule,
  approvalRuleValidator
} from "~/modules/approvals";
import { path } from "~/utils/path";

type ApprovalRuleDrawerProps = {
  rule: ApprovalRule | null;
  documentType: ApprovalDocumentType;
  groups: Array<{ id: string; name: string }>;
  onClose: () => void;
};

const ApprovalRuleDrawer = ({
  rule,
  documentType,
  groups,
  onClose
}: ApprovalRuleDrawerProps) => {
  const permissions = usePermissions();
  const isEditing = !!rule;
  const isDisabled = !permissions.can("update", "settings");

  const groupOptions = groups.map((g) => ({
    value: g.id,
    label: g.name
  }));

  const defaultValues = rule
    ? {
        id: rule.id,
        name: rule.name ?? "",
        documentType: rule.documentType,
        enabled: rule.enabled ?? false,
        approverGroupIds: Array.isArray(rule.approverGroupIds)
          ? rule.approverGroupIds
          : [],
        defaultApproverId: rule.defaultApproverId ?? undefined,
        lowerBoundAmount: rule.lowerBoundAmount ?? 0,
        upperBoundAmount: rule.upperBoundAmount ?? undefined,
        escalationDays: rule.escalationDays ?? undefined
      }
    : {
        name: "",
        documentType,
        enabled: true,
        approverGroupIds: [],
        lowerBoundAmount: 0,
        upperBoundAmount: undefined,
        escalationDays: undefined
      };

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <ValidatedForm
          validator={approvalRuleValidator}
          method="post"
          action={
            isEditing
              ? path.to.approvalRule(rule!.id!)
              : path.to.newApprovalRule(documentType)
          }
          defaultValues={defaultValues}
          className="flex flex-col h-full"
        >
          <DrawerHeader>
            <DrawerTitle>
              {isEditing ? "Edit" : "New"} Approval Rule
            </DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <div className="flex flex-col gap-6">
              {isEditing && rule?.id && <Hidden name="id" value={rule.id} />}
              <Hidden name="documentType" value={documentType} />
              <Input name="name" label="Rule Name" required />
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
              {documentType === "purchaseOrder" && (
                <>
                  <FormNumber
                    name="lowerBoundAmount"
                    label="Lower Bound Amount"
                    helperText="Minimum amount (inclusive) for this rule"
                    step={100}
                    formatOptions={{
                      style: "currency",
                      currency: "USD"
                    }}
                  />

                  <FormNumber
                    name="upperBoundAmount"
                    label="Upper Bound Amount"
                    helperText="Maximum amount (exclusive) for this rule. Leave empty for no upper limit."
                    step={100}
                    formatOptions={{
                      style: "currency",
                      currency: "USD"
                    }}
                  />
                </>
              )}
              <FormNumber
                name="escalationDays"
                label="Escalation Days"
                helperText="Auto-escalate after this many days (leave empty to disable)"
              />
            </div>
          </DrawerBody>
          <DrawerFooter>
            <HStack>
              <Submit isDisabled={isDisabled}>
                {isEditing ? "Update" : "Create"} Rule
              </Submit>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </HStack>
          </DrawerFooter>
        </ValidatedForm>
      </DrawerContent>
    </Drawer>
  );
};

export default ApprovalRuleDrawer;

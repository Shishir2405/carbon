import { z } from "zod";
import { zfd } from "zod-form-data";
import { ApprovalDocumentType } from "./types";

export const approvalStatusType = [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled"
] as const;

export const approvalDocumentType = [
  "purchaseOrder",
  "qualityDocument"
] as const;

export const approvalDocumentTypesWithAmounts: ApprovalDocumentType[] = [
  "purchaseOrder"
] as const;

export const approvalDocumentTypeLabel: Record<ApprovalDocumentType, string> = {
  purchaseOrder: "Purchase Order",
  qualityDocument: "Quality Document"
};

export const approvalRequestValidator = z.object({
  id: zfd.text(z.string().optional()),
  documentType: z.enum(approvalDocumentType, {
    errorMap: () => ({ message: "Document type is required" })
  }),
  documentId: zfd.text(
    z.string().min(1, { message: "Document ID is required" })
  ),
  approverGroupIds: zfd.repeatableOfType(z.string()).optional(),
  approverId: zfd.text(z.string().optional())
});

export const approvalDecisionValidator = z.object({
  id: zfd.text(z.string().optional()),
  decision: z.enum(["Approved", "Rejected"], {
    errorMap: () => ({ message: "Decision is required" })
  }),
  decisionNotes: zfd.text(z.string().optional())
});

export const approvalRuleValidator = z.object({
  id: zfd.text(z.string().optional()),
  documentType: z.enum(approvalDocumentType, {
    errorMap: () => ({ message: "Document type is required" })
  }),
  approverGroupIds: z.array(
    z.string().min(1, { message: "Invalid selection" })
  ),
  defaultApproverId: zfd.text(z.string().optional()),
  lowerBoundAmount: zfd.numeric(z.number().gt(0).default(0)).optional(),
  enabled: zfd.checkbox()
});

export const approvalFiltersValidator = z.object({
  documentType: z.enum(approvalDocumentType, {
    errorMap: () => ({ message: "Document type is required" })
  }),
  status: zfd.text(z.string().optional()),
  dateFrom: zfd.text(z.string().optional()),
  dateTo: zfd.text(z.string().optional())
});

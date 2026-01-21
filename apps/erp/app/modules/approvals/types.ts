import type { Database } from "@carbon/database";
import type { z } from "zod";
import type {
  approvalConfigurationValidator,
  approvalRequestValidator
} from "./approvals.models";
import type {
  getApprovalConfiguration,
  getApprovalRequestsByDocument
} from "./approvals.service";

export type ApprovalRequest =
  Database["public"]["Views"]["approvalRequests"]["Row"];

export type ApprovalHistory = NonNullable<
  Awaited<ReturnType<typeof getApprovalRequestsByDocument>>["data"]
>;

export type ApprovalConfiguration = NonNullable<
  Awaited<ReturnType<typeof getApprovalConfiguration>>["data"]
>;

export type ApprovalStatus = Database["public"]["Enums"]["approvalStatus"];

export type ApprovalDocumentType =
  Database["public"]["Enums"]["approvalDocumentType"];

export type ApprovalRequestForViewCheck = {
  requestedBy: string;
  approverId: string | null;
  approverGroupIds: string[] | null;
};

export type ApprovalRequestForApproveCheck = {
  approverId: string | null;
  approverGroupIds: string[] | null;
};

export type ApprovalRequestForCancelCheck = {
  requestedBy: string;
  status: string;
};

export type CreateApprovalRequestInput = Omit<
  z.infer<typeof approvalRequestValidator>,
  "id"
> & {
  companyId: string;
  requestedBy: string;
  createdBy: string;
};

export type UpsertApprovalConfigurationInput =
  | (Omit<z.infer<typeof approvalConfigurationValidator>, "id"> & {
      companyId: string;
      createdBy: string;
    })
  | (Omit<z.infer<typeof approvalConfigurationValidator>, "id"> & {
      id: string;
      updatedBy: string;
    });

export type ApprovalFilters = {
  documentType?: ApprovalDocumentType | null;
  status?: ApprovalStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

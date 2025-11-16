import { getCarbonServiceRole } from "@carbon/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  VStack,
} from "@carbon/react";

import { useMode } from "@carbon/remix";
import { useLoaderData, useParams } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { getSupplier } from "~/modules/purchasing";
import {
  getIssue,
  getIssueActionTasks,
  getIssueInvestigationTasks,
} from "~/modules/quality";
import { getCompany } from "~/modules/settings";
import { getExternalLink } from "~/modules/shared";
import { ErrorMessage } from "./quote.$id";
import {
  ActionTasksList,
  InvestigationTasksList,
} from "~/modules/quality/ui/Issue";
import { useSupplierPermissions } from "~/hooks/useSupplierPermissions";

export const meta = () => {
  return [{ title: "Digital Quote" }];
};

enum IssueState {
  Valid,
  NotFound,
}

const translations = {
  en: {
    "Issue not found": "Issue not found",
    "Oops! The link you're trying to access is not valid.":
      "Oops! The link you're trying to access is not valid.",
  },
  es: {
    "Issue not found": "No se encontró el problema",
    "Oops! The link you're trying to access is not valid.":
      "¡Ups! El enlace al que intenta acceder no es válido.",
  },
  de: {
    "Issue not found": "Problem nicht gefunden",
    "Oops! The link you're trying to access is not valid.":
      "Ups! Der Link, den Sie aufrufen möchten, ist nicht gültig.",
  },
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) {
    return json({
      state: IssueState.NotFound,
      data: null,
      strings: translations.en,
    });
  }
  const locale = (request.headers.get("Accept-Language") || "en-US").substring(
    0,
    2
  );
  const strings =
    translations[locale as keyof typeof translations] || translations.en;

  const serviceRole = getCarbonServiceRole();
  const externalLink = await getExternalLink(serviceRole, id);
  if (
    !externalLink.data ||
    !externalLink.data?.supplierId ||
    !externalLink.data?.documentId
  ) {
    return json({
      state: IssueState.NotFound,
      data: null,
      strings,
    });
  }

  const issue = await getIssue(serviceRole, externalLink.data.documentId);
  if (!issue.data) {
    return json({
      state: IssueState.NotFound,
      data: null,
      strings,
    });
  }

  const [company, supplier, actionTasks, investigationTasks] =
    await Promise.all([
      getCompany(serviceRole, externalLink.data.companyId),
      getSupplier(serviceRole, externalLink.data.supplierId),
      getIssueActionTasks(
        serviceRole,
        externalLink.data.documentId,
        externalLink.data.companyId,
        externalLink.data.supplierId
      ),
      getIssueInvestigationTasks(
        serviceRole,
        externalLink.data.documentId,
        externalLink.data.companyId,
        externalLink.data.supplierId
      ),
    ]);

  return json({
    state: IssueState.Valid,
    data: {
      issue: issue.data,
      company: company.data,
      supplier: supplier.data,
      actionTasks: actionTasks.data,
      investigationTasks: investigationTasks.data,
    },
    strings,
  });
}

const Header = ({
  company,
  issue,
  supplier,
}: {
  company: IssueData["company"];
  issue: IssueData["issue"];
  supplier: IssueData["supplier"];
}) => (
  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-start justify-between space-y-4 sm:space-y-2 pb-7">
    <div className="flex items-center space-x-4">
      <div>
        <CardTitle className="text-3xl">{company?.name ?? ""}</CardTitle>
        {issue?.nonConformanceId && (
          <p className="text-lg text-muted-foreground">
            {issue.nonConformanceId}
          </p>
        )}
        {issue?.name && (
          <p className="text-lg text-muted-foreground">{issue.name}</p>
        )}
      </div>
    </div>
    <div className="flex flex-col gap-2 items-end justify-start">
      <p className="text-xl font-medium">{supplier?.name ?? ""}</p>
    </div>
  </CardHeader>
);

const Issue = ({
  data,
  strings,
}: {
  data: IssueData;
  strings: (typeof translations)["en"];
}) => {
  const { company, issue, actionTasks, investigationTasks, supplier } = data;
  const permissions = useSupplierPermissions();

  const { id } = useParams();
  if (!id) throw new Error("Could not find external quote id");

  const mode = useMode();
  const logo = mode === "dark" ? company?.logoDark : company?.logoLight;

  return (
    <VStack spacing={8} className="w-full items-center p-2 md:p-8">
      {logo && (
        <img
          src={logo}
          alt={company?.name ?? ""}
          className="w-auto mx-auto max-w-5xl"
        />
      )}
      <Card className="w-full max-w-5xl mx-auto gap-4">
        <Header company={company} issue={issue} supplier={supplier} />
        <CardContent className="gap-4">
          {investigationTasks?.length ? (
            <InvestigationTasksList
              tasks={investigationTasks ?? []}
              suppliers={[]}
              isDisabled={issue?.status === "Closed"}
              permissionsOverride={permissions}
            />
          ) : null}
          {actionTasks?.length ? (
            <ActionTasksList
              tasks={actionTasks ?? []}
              suppliers={[]}
              isDisabled={issue?.status === "Closed"}
              permissionsOverride={permissions}
            />
          ) : null}
        </CardContent>
      </Card>
    </VStack>
  );
};

type IssueData = NonNullable<
  Awaited<ReturnType<Awaited<ReturnType<typeof loader>>["json"]>>["data"]
>;

export default function ExternalQuote() {
  const { state, data, strings } = useLoaderData<typeof loader>();

  switch (state) {
    case IssueState.Valid:
      if (data) {
        // @ts-ignore
        return <Issue data={data as IssueData} strings={strings} />;
      }
      return (
        <ErrorMessage
          title={strings["Issue not found"]}
          message={
            strings["Oops! The link you're trying to access is not valid."]
          }
        />
      );
    case IssueState.NotFound:
      return (
        <ErrorMessage
          title={strings["Issue not found"]}
          message={
            strings["Oops! The link you're trying to access is not valid."]
          }
        />
      );
  }
}

import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import { getCarbonServiceRole } from "@carbon/auth";

const serviceRole = getCarbonServiceRole();

const rescheduleJobSchema = z.object({
  jobId: z.string(),
  companyId: z.string(),
  userId: z.string(),
});

export const rescheduleJob = task({
  id: "reschedule-job",
  queue: {
    name: "scheduling",
    concurrencyLimit: 5,
  },
  run: async (payload: z.infer<typeof rescheduleJobSchema>) => {
    console.info(`🔰 Rescheduling job ${payload.jobId}`);

    try {
      const { data, error } = await serviceRole.functions.invoke("reschedule", {
        body: {
          jobId: payload.jobId,
          companyId: payload.companyId,
          userId: payload.userId,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to reschedule job");
      }

      console.info(
        `✅ Rescheduled: ${data.operationsUpdated} ops, ` +
          `${data.workCentersAffected} WCs, ${data.conflictsDetected} conflicts`
      );

      return {
        success: true,
        operationsUpdated: data.operationsUpdated,
        conflictsDetected: data.conflictsDetected,
        workCentersAffected: data.workCentersAffected,
      };
    } catch (error) {
      console.error(
        `❌ Reschedule failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error; // Let Trigger.dev handle retries
    }
  },
});

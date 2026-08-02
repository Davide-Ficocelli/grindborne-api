import cron from "node-cron";
import { getAllAttributesModel } from "../models/attributesModel.ts";
import {
  decayAttribute,
  getAllUserAttrLvls,
} from "../shared/attributesHelpers.ts";
import toUTCDate from "../utils/toUTCDate.ts";

const startDecayAttributesJob = (): void => {
  // This cron expression ("0 3 * * *") means: Run at 3:00 AM every single day.
  cron.schedule("0 3 * * *", async () => {
    console.log(
      `[Cron] Starting nightly attributes decay at ${new Date().toISOString()}...`,
    );
    try {
      // Get all attributes
      const allAttributes = await getAllAttributesModel();

      // Handle case in which attributes is null
      if (!allAttributes || allAttributes.length === 0) {
        console.log("[Cron] No attributes found in database. Job finished.");
        return;
      }

      // Get all user attibutes levels
      const allUserAttrLvls = getAllUserAttrLvls(allAttributes);

      if (!allUserAttrLvls || allUserAttrLvls.length === 0) {
        console.log(
          "[Cron] No user attributes eligible for decay calculation. Job finished.",
        );
        return;
      }

      const today = toUTCDate(new Date());
      let decayedCount = 0;

      // Check for attribute decay eligibility
      for (const attribute of allAttributes) {
        // If attribute isn't eligible for decay then skip directly to the next one
        if (
          !attribute.decay_date ||
          attribute.decay_date.getTime() > today.getTime()
        )
          continue;

        await decayAttribute(attribute, allUserAttrLvls);
        decayedCount++;
      }

      // Constructing result message string
      let resultStr: string = "";
      if (decayedCount === 0) resultStr = "No attributes were decayed";
      else if (decayedCount === 1)
        resultStr = "Successfuly decayed 1 attrribute";
      else resultStr = `Successfuly decayed ${decayedCount} attributes`;

      console.log(`[Cron] ${resultStr}.`);
      console.log("[Cron] Nightly attribute decay finished successfully.");
    } catch (error) {
      console.error("[Cron] CRITICAL ERROR during attributes decay:", error);
    }
  });
};

export default startDecayAttributesJob;

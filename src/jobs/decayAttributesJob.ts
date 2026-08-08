import cron from "node-cron";
import {
  getAllAttributesModel,
  getAttributesByUserIdModel,
} from "../models/attributesModel.ts";
import { assignNewUserLvlModel } from "../models/usersModel.ts";
import {
  decayAttributeHelper,
  getAllUserAttrLvlsHelper,
  extractUserAttributesLvlsHelper,
} from "../shared/attributesHelpers.ts";
import { calculateUserLvlHelper } from "../shared/usersHelpers.ts";
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
      const allUserAttrLvls = getAllUserAttrLvlsHelper(allAttributes);

      if (!allUserAttrLvls || allUserAttrLvls.length === 0) {
        console.log(
          "[Cron] No user attributes eligible for decay calculation. Job finished.",
        );
        return;
      }

      const today = toUTCDate(new Date());
      let decayedCount = 0;
      const decayedUsers = new Set<string>();

      // Check for attribute decay eligibility
      for (const attribute of allAttributes) {
        // If attribute isn't eligible for decay then skip directly to the next one
        if (
          !attribute.decay_date ||
          attribute.decay_date.getTime() > today.getTime()
        )
          continue;

        await decayAttributeHelper(attribute, allUserAttrLvls);
        decayedCount++;
        decayedUsers.add(attribute.users_id);
      }

      // Update user levels for all affected users
      for (const userId of decayedUsers) {
        const userAttributes = await getAttributesByUserIdModel(userId);

        if (!userAttributes) {
          console.error(
            `[Cron] Could not retrieve attributes for user ${userId} after decay. Skipping level update.`,
          );
          continue;
        }

        const userAttributeLevels =
          extractUserAttributesLvlsHelper(userAttributes);
        const newUserLvl = calculateUserLvlHelper(userAttributeLevels);

        await assignNewUserLvlModel(userId, newUserLvl);
      }

      // Constructing result message string
      let resultStr: string;
      if (decayedCount === 0) {
        resultStr = "No attributes were decayed";
      } else {
        resultStr = `Successfully decayed ${decayedCount} attribute${
          decayedCount > 1 ? "s" : ""
        }`;
        if (decayedUsers.size > 0) {
          resultStr += ` and updated ${decayedUsers.size} user level(s)`;
        }
      }

      console.log(`[Cron] ${resultStr}.`);
      console.log("[Cron] Nightly attribute decay finished successfully.");
    } catch (error) {
      console.error("[Cron] CRITICAL ERROR during attributes decay:", error);
    }
  });
};

export default startDecayAttributesJob;

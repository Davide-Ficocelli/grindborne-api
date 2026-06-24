import cron from "node-cron";
import pool from "../config/db.ts";
import { RETENTION_PERIOD } from "../config/globals.ts";

export const startCleanupJob = () => {
  // This cron expression ("0 3 * * *") means: Run at 3:00 AM every single day.
  cron.schedule("0 3 * * *", async () => {
    console.log(
      `[Cron] Starting nightly database cleanup at ${new Date().toISOString()}...`,
    );

    try {
      // 1. Hard delete expired attributes
      const attrRes = await pool.query(
        `DELETE FROM attributes WHERE deleted_at < NOW() - INTERVAL '${RETENTION_PERIOD}';`,
      );
      console.log(
        `[Cron] Permanently deleted ${attrRes.rowCount} expired attributes.`,
      );

      // 2. Hard delete expired quests
      const questRes = await pool.query(
        `DELETE FROM quests WHERE deleted_at < NOW() - INTERVAL '${RETENTION_PERIOD}';`,
      );
      console.log(
        `[Cron] Permanently deleted ${questRes.rowCount} expired quests.`,
      );

      // 3. Hard delete expired users
      const userRes = await pool.query(
        `DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '${RETENTION_PERIOD}';`,
      );
      console.log(
        `[Cron] Permanently deleted ${userRes.rowCount} expired users.`,
      );

      console.log("[Cron] Nightly cleanup finished successfully.");
    } catch (error) {
      console.error("[Cron] CRITICAL ERROR during database cleanup:", error);
    }
  });
};

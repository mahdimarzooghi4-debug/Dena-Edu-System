-- Preserve previously recorded grants and usage while converting minute units.
UPDATE "dena_service_time_ledger" SET "seconds" = "seconds" * 60;

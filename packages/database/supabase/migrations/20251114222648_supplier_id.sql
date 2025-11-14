CREATE TYPE disposition AS ENUM (
  'Use as is',
  'Rework',
  'Scrap'
);

ALTER TABLE public."nonConformanceActionTask"
ADD COLUMN "supplierId" text NULL;

ALTER TABLE public."nonConformanceActionTask"
ADD CONSTRAINT "nonConformanceActionTask_supplierId_fkey"
FOREIGN KEY ("supplierId")
REFERENCES supplier (id)
ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "nonConformanceActionTask_supplierId_idx"
ON public."nonConformanceActionTask" ("supplierId");

ALTER TABLE public."nonConformanceInvestigationTask"
ADD COLUMN "supplierId" text NULL;

ALTER TABLE public."nonConformanceInvestigationTask"
ADD CONSTRAINT "nonConformanceInvestigationTask_supplierId_fkey"
FOREIGN KEY ("supplierId")
REFERENCES supplier (id)
ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "nonConformanceInvestigationTask_supplierId_idx"
ON public."nonConformanceInvestigationTask" ("supplierId");

ALTER TABLE public."nonConformanceItem"
ADD COLUMN disposition disposition NULL;
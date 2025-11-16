-- Create trigger function to auto-create external link for non-conformance suppliers
CREATE OR REPLACE FUNCTION create_non_conformance_external_link()
RETURNS TRIGGER AS $$
DECLARE
  external_link_id UUID;
BEGIN
  -- Insert into externalLink table and get the ID
  INSERT INTO "externalLink" ("documentType", "documentId", "companyId", "supplierId")
  VALUES ('Non-Conformance', NEW."nonConformanceId", NEW."companyId", NEW."supplierId")
  ON CONFLICT ("documentId", "documentType", "companyId") DO UPDATE SET
    "documentType" = EXCLUDED."documentType", "supplierId" = EXCLUDED."supplierId"
  RETURNING "id" INTO external_link_id;

  -- Update the nonConformanceSupplier row with the external link ID
  UPDATE "nonConformanceSupplier"
  SET "externalLinkId" = external_link_id
  WHERE "id" = NEW."id";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
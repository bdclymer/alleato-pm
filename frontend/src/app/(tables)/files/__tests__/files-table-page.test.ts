import fs from "node:fs";
import path from "node:path";

const filesRouteRoot = path.join(__dirname, "..");
const appRoot = path.join(filesRouteRoot, "..", "..", "..");

describe("files table page", () => {
  it("uses the unified table shell without row drawer navigation", () => {
    const pageSource = fs.readFileSync(
      path.join(filesRouteRoot, "files-client.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("UnifiedTablePage<FileItem>");
    expect(pageSource).toContain("fileHref(item)");
    expect(pageSource).not.toContain("onRowClick:");
    expect(pageSource).not.toContain("sidePanel={{");
  });

  it("keeps file type metadata editable inline and accepted by the update route", () => {
    const pageSource = fs.readFileSync(
      path.join(filesRouteRoot, "files-client.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.join(appRoot, "api/documents/[docId]/assign-project/route.ts"),
      "utf8",
    );

    expect(pageSource).toContain('fieldKey="document_type"');
    expect(pageSource).toContain("handleDocumentTypeSave");
    expect(routeSource).toContain('"document_type"');
    expect(routeSource).toContain("updates.document_type");
  });
});

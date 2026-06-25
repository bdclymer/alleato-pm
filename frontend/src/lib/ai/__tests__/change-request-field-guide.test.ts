import {
  CHANGE_REQUEST_FIELD_GUIDE,
  renderChangeRequestFieldGuide,
  renderChangeRequestToolDescription,
} from "../change-request-field-guide";

describe("change request field guide", () => {
  it("documents required, optional, generated, and confirmation fields", () => {
    expect(CHANGE_REQUEST_FIELD_GUIDE.canonicalTool).toBe("createChangeEvent");
    expect(CHANGE_REQUEST_FIELD_GUIDE.aliases).toContain("change request");
    expect(CHANGE_REQUEST_FIELD_GUIDE.requiredFields.map((field) => field.name)).toEqual([
      "projectId",
      "title",
    ]);
    expect(CHANGE_REQUEST_FIELD_GUIDE.optionalFields.map((field) => field.name)).toEqual([
      "description",
      "scope",
      "type",
      "status",
    ]);
    expect(CHANGE_REQUEST_FIELD_GUIDE.generatedFields.map((field) => field.name)).toEqual([
      "number",
      "updated_at",
    ]);
    expect(CHANGE_REQUEST_FIELD_GUIDE.previewRule).toContain(
      "confirmed=false first",
    );
  });

  it("renders prompt and tool-description guidance from the same source", () => {
    expect(renderChangeRequestFieldGuide()).toContain(
      "Canonical tool: `createChangeEvent`",
    );
    expect(renderChangeRequestFieldGuide()).toContain(
      "projectId (Project): Numeric Alleato project id",
    );
    expect(renderChangeRequestToolDescription()).toContain("change request");
    expect(renderChangeRequestToolDescription()).toContain("projectId and title");
    expect(renderChangeRequestToolDescription()).toContain("confirmed=false first");
  });
});

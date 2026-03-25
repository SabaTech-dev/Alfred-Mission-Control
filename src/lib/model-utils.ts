/**
 * Safely extracts a short model display name from an agent config.
 * `model` can be a string ("zai/glm-5") or an object ({primary: "zai/glm-5", fallbacks: [...]}).
 * Returns the last segment after "/" (e.g. "glm-5") for display purposes.
 */
export function getModelDisplayName(model: unknown): string {
  if (typeof model === "string") {
    return model.split("/").pop() || model;
  }
  if (model && typeof model === "object" && "primary" in model) {
    const primary = (model as { primary: string }).primary;
    return typeof primary === "string" ? primary.split("/").pop() || primary : String(primary);
  }
  if (model && typeof model === "object" && "model" in model) {
    // Nested: { model: "zai/glm-5" }
    return getModelDisplayName((model as { model: unknown }).model);
  }
  return "unknown";
}

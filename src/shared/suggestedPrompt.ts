const leadingContinuationPatterns = [
  /^(?:接着|继续)\s*(?:写(?!作|信|下|字|完)|推进|展开)\s*(?:下一段|后续剧情|剧情)?\s*[:：,，。\-]?\s*/u,
  /^(?:接着|继续)\s*(?:下一段|后续剧情|剧情)\s*[:：,，。\-]?\s*/u,
  /^Continue(?:\s+in\s+English|\s+the\s+story)?\s*[:：.\-]\s*/i,
  /^(?:Language|语言)\s*[:：]\s*(?:English|英文|Chinese|中文)\s*[.。;；]?\s*/i
];

const trailingMetadataLabel = "(?:地域|地域口吻|地域设定|口音设定|方言设定|语言设定|Locale|Accent\\s+setting|Language\\s+setting)";
const trailingMetadataPatterns = [
  new RegExp(`(?<=[。.!！?？;；])\\s*${trailingMetadataLabel}\\s*[:：][\\s\\S]*$`, "iu"),
  new RegExp(`\\s+${trailingMetadataLabel}\\s*[:：][\\s\\S]*$`, "iu"),
  new RegExp(`^${trailingMetadataLabel}\\s*[:：][\\s\\S]*$`, "iu")
];

export function normalizeSuggestedPrompt(value: string | undefined | null) {
  const original = value?.replace(/\s+/g, " ").trim() || "";
  if (!original) return "";

  let normalized = original;
  for (let pass = 0; pass < 3; pass += 1) {
    const previous = normalized;
    for (const pattern of leadingContinuationPatterns) normalized = normalized.replace(pattern, "");
    if (normalized === previous) break;
  }
  for (const pattern of trailingMetadataPatterns) normalized = normalized.replace(pattern, "");
  normalized = normalized
    .replace(/^[\s:：,，。\-]+/u, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

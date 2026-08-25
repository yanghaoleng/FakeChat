import type { AiProviderId } from "./aiProviders";
import type { StoryPackage } from "./linearStory";

export const doubaoGenerationEstimateScale = 0.64;

export function estimatedGenerationMs(
  messageCount: number,
  packageId: StoryPackage,
  providerId: AiProviderId
) {
  const historyCostMs = Math.min(12000, messageCount * 140);
  const deepSeekBaselineMs = messageCount === 0
    ? (packageId === "jojo" ? 46000 : 52000)
    : (packageId === "jojo" ? 34000 : 40000) + historyCostMs;

  return Math.round(deepSeekBaselineMs * (providerId === "doubao" ? doubaoGenerationEstimateScale : 1));
}

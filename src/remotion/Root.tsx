import { Composition } from "remotion";
import { sampleProject } from "../shared/sampleProject";
import type { DramaProject } from "../shared/schema";
import { getDurationInFrames } from "../shared/timing";
import { ChatDrama, chatDramaMetadata } from "./ChatDrama";

export function RemotionRoot() {
  return (
    <Composition
      id="ChatDrama"
      component={ChatDrama}
      width={chatDramaMetadata.width}
      height={chatDramaMetadata.height}
      fps={chatDramaMetadata.fps}
      durationInFrames={chatDramaMetadata.durationInFrames}
      defaultProps={{ project: sampleProject }}
      calculateMetadata={({ props }) => {
        const project = (props.project ?? sampleProject) as DramaProject;
        return {
          width: project.canvas.width,
          height: project.canvas.height,
          fps: project.fps,
          durationInFrames: getDurationInFrames(project)
        };
      }}
    />
  );
}

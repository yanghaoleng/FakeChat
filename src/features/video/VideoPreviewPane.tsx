import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, type ReactNode } from "react";
import { ChatDrama } from "../../remotion/ChatDrama";
import type { DramaProject } from "../../shared/schema";

type VideoPreviewPaneProps = {
  children: ReactNode;
  durationInFrames: number;
  initialFrame: number;
  isActive: boolean;
  project: DramaProject;
};

export default function VideoPreviewPane({
  children,
  durationInFrames,
  initialFrame,
  isActive,
  project
}: VideoPreviewPaneProps) {
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!isActive || !project.messages.length) return undefined;
    const timer = window.setTimeout(() => {
      playerRef.current?.seekTo(initialFrame);
      playerRef.current?.play();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [initialFrame, isActive, project.messages.length]);

  return (
    <div className="video-preview-stack">
      <div className="player-frame">
        <Player
          ref={isActive ? playerRef : undefined}
          component={ChatDrama}
          inputProps={{ project }}
          durationInFrames={durationInFrames}
          initialFrame={initialFrame}
          compositionWidth={project.canvas.width}
          compositionHeight={project.canvas.height}
          fps={project.fps}
          controls
          autoPlay={isActive}
          acknowledgeRemotionLicense
          style={{ width: "100%", aspectRatio: `${project.canvas.width} / ${project.canvas.height}` }}
        />
      </div>
      {children}
    </div>
  );
}

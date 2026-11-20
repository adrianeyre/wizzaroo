export interface RenderQuality {
  pixelSize: number;
  isEffectsOn: boolean;
}

export const renderQualityLevels: readonly RenderQuality[] = [
  { pixelSize: 4, isEffectsOn: true },
  { pixelSize: 5, isEffectsOn: true },
  { pixelSize: 6, isEffectsOn: true },
  { pixelSize: 8, isEffectsOn: true },
  { pixelSize: 8, isEffectsOn: false },
];

export const slowestFps = 30;
export const headroomFps = 50;
export const sampleSeconds = 1;
export const headroomWaitSeconds = 5;
export const longestCountedFrameSeconds = 0.5;
const roundingSeconds = 1e-9;

export interface RenderQualityTracker {
  levelIndex: number;
  sampledSeconds: number;
  sampledFrames: number;
  headroomSeconds: number;
  fps: number | undefined;
}

export const startRenderQualityTracker = (): RenderQualityTracker => ({
  levelIndex: 0,
  sampledSeconds: 0,
  sampledFrames: 0,
  headroomSeconds: 0,
  fps: undefined,
});

export const getRenderQuality = ({
  levelIndex,
}: RenderQualityTracker): RenderQuality => renderQualityLevels[levelIndex];

const lowestLevelIndex = renderQualityLevels.length - 1;

export const trackFrame = (
  tracker: RenderQualityTracker,
  frameSeconds: number,
): RenderQualityTracker => {
  if (frameSeconds <= 0 || frameSeconds > longestCountedFrameSeconds) {
    return tracker;
  }
  const sampledSeconds = tracker.sampledSeconds + frameSeconds;
  const sampledFrames = tracker.sampledFrames + 1;
  if (sampledSeconds < sampleSeconds - roundingSeconds) {
    return { ...tracker, sampledSeconds, sampledFrames };
  }

  const fps = sampledFrames / sampledSeconds;
  const sampled = { ...tracker, sampledSeconds: 0, sampledFrames: 0, fps };
  if (fps < slowestFps) {
    return {
      ...sampled,
      levelIndex: Math.min(tracker.levelIndex + 1, lowestLevelIndex),
      headroomSeconds: 0,
    };
  }
  if (fps < headroomFps) {
    return { ...sampled, headroomSeconds: 0 };
  }
  const headroomSeconds = tracker.headroomSeconds + sampledSeconds;
  if (
    headroomSeconds >= headroomWaitSeconds - roundingSeconds &&
    tracker.levelIndex > 0
  ) {
    return {
      ...sampled,
      levelIndex: tracker.levelIndex - 1,
      headroomSeconds: 0,
    };
  }
  return { ...sampled, headroomSeconds };
};

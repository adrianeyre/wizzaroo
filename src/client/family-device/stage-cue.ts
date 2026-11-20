import { useEffect, useRef, useState } from "react";
import { isMotionReduced } from "../reduced-motion.js";

export type StageCue = "rest" | "waiting" | "playing";

const stageInViewThreshold = 0.35;

export const canPlayStage = (): boolean =>
  !isMotionReduced() && typeof IntersectionObserver === "function";

export const useStageCue = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageCue, setStageCue] = useState<StageCue>(() =>
    canPlayStage() ? "waiting" : "rest",
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null || !canPlayStage()) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          setStageCue("playing");
          observer.disconnect();
        }
      },
      { threshold: stageInViewThreshold },
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
    };
  }, []);

  return { stageRef, stageCue };
};

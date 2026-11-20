import { useCallback, useRef, useState } from "react";

export interface BusyProgressProps {
  /** What is happening, in words, such as "Saving Bea's limits…". */
  label: string;
  /**
   * How far through it is, from 0 to 1, when that is known. Left out, the
   * bar sweeps to show something is happening without saying how far.
   */
  share?: number;
  /** A second line saying what part of it is happening now, if any. */
  detail?: string;
  className?: string;
}

const toPercent = (share: number): number =>
  Math.round(Math.min(1, Math.max(0, share)) * 100);

/**
 * A spinner and a progress bar, with words saying exactly what is
 * happening, for anything that has to wait on the network, a download or
 * a big piece of work before it can carry on.
 */
export const BusyProgress = ({
  label,
  share,
  detail,
  className,
}: BusyProgressProps) => {
  const percent = share === undefined ? undefined : toPercent(share);
  return (
    <div
      className={className === undefined ? "busy" : `busy ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="busy-spinner" aria-hidden="true" />
      <div className="busy-words">
        <p className="busy-label">{label}</p>
        {detail === undefined ? null : <p className="busy-detail">{detail}</p>}
        <div
          className="busy-bar"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={
            percent === undefined ? "Working on it" : `${String(percent)}%`
          }
          data-indeterminate={percent === undefined ? "true" : undefined}
        >
          <span
            className="busy-bar-fill"
            style={
              percent === undefined
                ? undefined
                : { width: `${String(percent)}%` }
            }
          />
        </div>
      </div>
    </div>
  );
};

export interface BusyAction {
  /** What is happening while the action runs, or undefined when it isn't. */
  busyLabel: string | undefined;
  isBusy: boolean;
  /** Runs `action`, saying `label` until it settles, and never two at once. */
  runBusy: <Result>(
    label: string,
    action: () => Promise<Result>,
  ) => Promise<Result | undefined>;
}

/**
 * Keeps what a button is waiting on, so it can show a BusyProgress while
 * it waits and isn't pressed again until it is done.
 */
export const useBusyAction = (): BusyAction => {
  const [busyLabel, setBusyLabel] = useState<string>();
  const isRunning = useRef(false);
  const runBusy = useCallback(
    async <Result,>(
      label: string,
      action: () => Promise<Result>,
    ): Promise<Result | undefined> => {
      if (isRunning.current) {
        return undefined;
      }
      isRunning.current = true;
      setBusyLabel(label);
      try {
        return await action();
      } finally {
        isRunning.current = false;
        setBusyLabel(undefined);
      }
    },
    [],
  );
  return { busyLabel, isBusy: busyLabel !== undefined, runBusy };
};

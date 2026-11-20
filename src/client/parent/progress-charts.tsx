import { useState, type ReactNode } from "react";

export interface ChartSegment {
  key: string;
  label: string;
  value: number;
  colour: string;
}

export interface ChartBar {
  key: string;
  label: string;
  value: number;
  largestValue: number;
  valueLabel: string;
  targetPercent?: number;
}

export interface ChartColumn {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
  detail: string;
}

export interface StackedRow {
  key: string;
  label: string;
  segments: ChartSegment[];
  summary: string;
}

const donutRadius = 42;
const donutStrokeWidth = 14;
const donutCircumference = 2 * Math.PI * donutRadius;
const segmentGap = 1.5;
const percentWhole = 100;

const getPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value * percentWhole) / total);

const sumSegments = (segments: readonly ChartSegment[]) =>
  segments.reduce((total, { value }) => total + value, 0);

interface ChartCardProps {
  title: string;
  summary: string;
  wide?: boolean;
  children: ReactNode;
}

export const ChartCard = ({
  title,
  summary,
  wide,
  children,
}: ChartCardProps) => (
  <figure className={wide === true ? "chart-card wide" : "chart-card"}>
    <figcaption>
      <h3>{title}</h3>
      <p className="chart-summary">{summary}</p>
    </figcaption>
    {children}
  </figure>
);

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}

export const StatTile = ({ icon, label, value, detail }: StatTileProps) => (
  <div className="stat-tile">
    <span className="stat-icon" aria-hidden="true">
      {icon}
    </span>
    <span className="stat-label">{label}</span>
    <span className="stat-value">{value}</span>
    <span className="stat-detail">{detail}</span>
  </div>
);

interface DonutSegmentArc extends ChartSegment {
  length: number;
  offset: number;
}

const buildDonutArcs = (
  segments: readonly ChartSegment[],
): DonutSegmentArc[] => {
  const total = sumSegments(segments);
  const shownSegments = segments.filter(({ value }) => value > 0);
  const gap = shownSegments.length > 1 ? segmentGap : 0;
  let offset = 0;
  return shownSegments.map((segment) => {
    const length = (segment.value / total) * donutCircumference;
    const arc = { ...segment, length: Math.max(length - gap, 0), offset };
    offset += length;
    return arc;
  });
};

interface DonutChartProps {
  label: string;
  segments: ChartSegment[];
  centreValue: string;
  centreLabel: string;
}

export const DonutChart = ({
  label,
  segments,
  centreValue,
  centreLabel,
}: DonutChartProps) => {
  const [activeKey, setActiveKey] = useState<string>();
  const total = sumSegments(segments);
  const activeSegment = segments.find(({ key }) => key === activeKey);
  const describedSegments = segments
    .map(
      ({ label: segmentLabel, value }) =>
        `${segmentLabel} ${String(value)} (${String(getPercent(value, total))}%)`,
    )
    .join(", ");

  return (
    <div className="donut">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${label}: ${describedSegments}`}
      >
        <circle
          className="donut-track"
          cx="50"
          cy="50"
          r={donutRadius}
          strokeWidth={donutStrokeWidth}
        />
        {buildDonutArcs(segments).map(({ key, colour, length, offset }) => (
          <circle
            key={key}
            className={
              activeKey === undefined || activeKey === key
                ? "donut-arc"
                : "donut-arc faded"
            }
            cx="50"
            cy="50"
            r={donutRadius}
            stroke={colour}
            strokeWidth={donutStrokeWidth}
            strokeDasharray={`${String(length)} ${String(donutCircumference - length)}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
            onPointerEnter={() => {
              setActiveKey(key);
            }}
            onPointerLeave={() => {
              setActiveKey(undefined);
            }}
          />
        ))}
        <text className="donut-value" x="50" y="50">
          {activeSegment === undefined
            ? centreValue
            : `${String(getPercent(activeSegment.value, total))}%`}
        </text>
        <text className="donut-label" x="50" y="63">
          {activeSegment === undefined ? centreLabel : activeSegment.label}
        </text>
      </svg>
      <ul className="chart-legend">
        {segments.map(({ key, label: segmentLabel, value, colour }) => (
          <li
            key={key}
            className={activeKey === key ? "active" : undefined}
            onPointerEnter={() => {
              setActiveKey(key);
            }}
            onPointerLeave={() => {
              setActiveKey(undefined);
            }}
          >
            <span
              className="legend-swatch"
              style={{ background: colour }}
              aria-hidden="true"
            />
            <span className="legend-label">{segmentLabel}</span>
            <span className="legend-value">
              {value} · {getPercent(value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface StackedBarChartProps {
  rows: StackedRow[];
  legend: ChartSegment[];
}

export const StackedBarChart = ({ rows, legend }: StackedBarChartProps) => (
  <div className="stacked-bars">
    <ul className="chart-legend inline">
      {legend.map(({ key, label, colour }) => (
        <li key={key}>
          <span
            className="legend-swatch"
            style={{ background: colour }}
            aria-hidden="true"
          />
          <span className="legend-label">{label}</span>
        </li>
      ))}
    </ul>
    {rows.map(({ key, label, segments, summary }) => {
      const total = sumSegments(segments);
      return (
        <div key={key} className="stacked-row">
          <div className="bar-heading">
            <span className="bar-label">{label}</span>
            <span className="bar-value">{summary}</span>
          </div>
          <div className="stacked-track" aria-hidden="true">
            {segments
              .filter(({ value }) => value > 0)
              .map(
                ({ key: segmentKey, label: segmentLabel, value, colour }) => (
                  <span
                    key={segmentKey}
                    className="stacked-segment"
                    title={`${segmentLabel}: ${String(value)}`}
                    style={{
                      flexGrow: value,
                      background: colour,
                    }}
                  />
                ),
              )}
            {total === 0 ? <span className="stacked-empty" /> : null}
          </div>
        </div>
      );
    })}
  </div>
);

interface BarChartProps {
  bars: ChartBar[];
  targetLabel?: string;
}

export const BarChart = ({ bars, targetLabel }: BarChartProps) => (
  <div className="bar-chart">
    {targetLabel === undefined ? null : (
      <p className="bar-target-key">
        <span className="target-mark" aria-hidden="true" />
        {targetLabel}
      </p>
    )}
    {bars.map(
      ({ key, label, value, largestValue, valueLabel, targetPercent }) => (
        <div key={key} className="bar-row">
          <div className="bar-heading">
            <span className="bar-label">{label}</span>
            <span className="bar-value">{valueLabel}</span>
          </div>
          <div className="bar-track" aria-hidden="true">
            <span
              className="bar-fill"
              style={{ width: `${String(getPercent(value, largestValue))}%` }}
            />
            {targetPercent === undefined ? null : (
              <span
                className="bar-target"
                style={{ left: `${String(targetPercent)}%` }}
              />
            )}
          </div>
        </div>
      ),
    )}
  </div>
);

interface ColumnChartProps {
  label: string;
  columns: ChartColumn[];
  largestValueLabel: string;
}

export const ColumnChart = ({
  label,
  columns,
  largestValueLabel,
}: ColumnChartProps) => {
  const [activeKey, setActiveKey] = useState<string>();
  const largestValue = Math.max(...columns.map(({ value }) => value), 1);
  const activeColumn = columns.find(({ key }) => key === activeKey);

  return (
    <div className="column-chart">
      <p className="column-scale" aria-hidden="true">
        {largestValueLabel}
      </p>
      <div
        className="column-plot"
        role="img"
        aria-label={label}
        onPointerLeave={() => {
          setActiveKey(undefined);
        }}
      >
        {columns.map(({ key, value, shortLabel }) => (
          <div
            key={key}
            className={activeKey === key ? "column active" : "column"}
            onPointerEnter={() => {
              setActiveKey(key);
            }}
          >
            <span
              className={value === 0 ? "column-bar empty" : "column-bar"}
              style={{
                height: `${String(getPercent(value, largestValue))}%`,
              }}
            />
            <span className="column-label">{shortLabel}</span>
          </div>
        ))}
        {activeColumn === undefined ? null : (
          <div
            className="chart-tooltip"
            style={{
              left: `clamp(5.5rem, ${String(
                ((columns.indexOf(activeColumn) + 0.5) * percentWhole) /
                  columns.length,
              )}%, calc(100% - 5.5rem))`,
            }}
          >
            <strong>{activeColumn.label}</strong>
            <span>{activeColumn.detail}</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { View, useWindowDimensions } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Svg, {
  Line,
  Circle,
  Polyline,
  Rect,
  G,
  Text as SvgText,
} from "react-native-svg";
import { observer } from "mobx-react";
import { layout, svgFontFamily } from "../../theme";
import { SkeletonPulse, SkeletonBlock } from "../Skeleton/Skeleton";

interface BabyGraphProps {
  /** Raw readings — x is computed here from startTime, same pattern as
   * DilationGraph, so both graphs share one clock (see Graph.tsx's
   * chartStartTime) instead of each computing its own. */
  data?: Array<{ created_at: string; value: number }>;
  /** Chart's zero point — the first real reading recorded for this
   * patient, not workStartDateTime/patient creation. Falls back to
   * workStartDateTime only when there's no data yet to anchor on. */
  startTime?: string | null;
  /** True while the backing store's initial fetch is still in flight —
   * shows a skeleton in place of the chart instead of an empty grid.
   * Ignored once data has arrived (never re-shows on a background poll). */
  loading?: boolean;
}

const PX_PER_HOUR = 70;
const MIN_HOURS = 12;

export const BabyGraph: React.FC<BabyGraphProps> = observer(({ data, startTime, loading }) => {
  const { width: windowWidth } = useWindowDimensions();

  const hoursSince = (dateStr: string): number => {
    if (!startTime) return 0;
    return (new Date(dateStr).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
  };

  const formatTick = (hours: number) => {
    if (!startTime) return `${hours}h`;
    const d = new Date(new Date(startTime).getTime() + hours * 3600000);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const svgHeight = 300;
  const padL = 46, padR = 16, padT = 16, padB = 72;

  const pts = (data ?? [])
    .map(d => ({ x: hoursSince(d.created_at), y: d.value }))
    .filter(d => isFinite(d.x) && isFinite(d.y));

  // No clock-time labels along the x-axis until there's an actual first
  // value to anchor them to — the grid/chart itself still shows, just
  // without ticking off a fake start time (workStartDateTime, the
  // fallback used only when there's nothing real to zero against yet).
  const hasData = pts.length > 0;

  // Chart grows past the fixed 12h window instead of clipping/stacking
  // late readings at the right edge — the window stays scrollable
  // (wrapped below) rather than squeezing a long labor into a fixed width.
  const dataMaxHours = pts.reduce((max, p) => Math.max(max, p.x), 0);
  const xMin = 0;
  const xMax = Math.max(MIN_HOURS, Math.ceil(dataMaxHours) + 1);
  const yMin = 120, yMax = 180;

  const availableWidth = Math.max(Math.min(windowWidth, layout.maxContentWidth) - 32, 200);
  const svgWidth = Math.max(availableWidth, xMax * PX_PER_HOUR + padL + padR);
  const cW = svgWidth - padL - padR;
  const cH = svgHeight - padT - padB;

  const toX = (v: number) => padL + ((Math.max(xMin, Math.min(xMax, v)) - xMin) / (xMax - xMin)) * cW;
  const toY = (v: number) => padT + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * cH;

  const yTicks = [120, 130, 140, 150, 160, 170, 180];
  const xTicks: number[] = [];
  for (let h = 0; h <= xMax; h += 2) xTicks.push(h);

  const polyPts = pts.map(d => `${toX(d.x)},${toY(d.y)}`).join(" ");

  if (loading && !hasData) {
    return (
      <View style={{ alignSelf: "center", width: availableWidth, height: svgHeight }}>
        <SkeletonPulse>
          <SkeletonBlock width={availableWidth} height={svgHeight} blockRadius={8} />
        </SkeletonPulse>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={{ alignSelf: "center", maxWidth: availableWidth, height: svgHeight }}
    >
      <View>
      <Svg width={svgWidth} height={svgHeight}>
        <Rect x={padL} y={padT} width={cW} height={cH} fill="#fafafa" stroke="#e0e0e0" strokeWidth={1} />

        {yTicks.map(y => (
          <G key={`y${y}`}>
            <Line x1={padL} y1={toY(y)} x2={padL + cW} y2={toY(y)} stroke="#e8e8e8" strokeWidth={0.7} />
            <SvgText fontFamily={svgFontFamily} x={padL - 4} y={toY(y) + 3.5} textAnchor="end" fontSize={9} fill="#777">{y}</SvgText>
          </G>
        ))}

        {xTicks.map(x => (
          <G key={`x${x}`}>
            <Line x1={toX(x)} y1={padT} x2={toX(x)} y2={padT + cH} stroke="#e8e8e8" strokeWidth={0.7} />
            {hasData && (
              <SvgText fontFamily={svgFontFamily} x={toX(x)} y={padT + cH + 14} textAnchor="middle" fontSize={9} fill="#777">{formatTick(x)}</SvgText>
            )}
          </G>
        ))}

        {pts.length > 1 && (
          <Polyline points={polyPts} fill="none" stroke="#c43a31" strokeWidth={2} />
        )}

        {pts.map((d, i) => (
          <Circle key={i} cx={toX(d.x)} cy={toY(d.y)} r={4} fill="#c43a31" />
        ))}

        <SvgText fontFamily={svgFontFamily} x={padL + cW / 2} y={padT + cH + 30} textAnchor="middle" fontSize={9} fill="#555">
          Heure
        </SvgText>
        <SvgText fontFamily={svgFontFamily}
          x={10}
          y={padT + cH / 2}
          textAnchor="middle"
          fontSize={9}
          fill="#555"
          transform={`rotate(-90, 10, ${padT + cH / 2})`}
        >
          bpm
        </SvgText>

        <G>
          <Circle cx={padL + 8} cy={padT + cH + 48} r={4} fill="#c43a31" />
          <SvgText fontFamily={svgFontFamily} x={padL + 17} y={padT + cH + 52} fontSize={9} fill="#333">
            Fréquence cardiaque du bébé
          </SvgText>
        </G>
      </Svg>
      </View>
    </ScrollView>
  );
});

export default BabyGraph;

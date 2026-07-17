import React from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, {
  Line,
  Circle,
  Polyline,
  Rect,
  Path,
  G,
  Text as SvgText,
} from "react-native-svg";
import { observer } from "mobx-react";
import { Dilation, DilationStore } from "../../store/GraphData/Dilatation/dilatationStore";
import { BabyDescent, BabyDescentStore } from "../../store/GraphData/BabyDescent/babyDescentStore";
import { layout, svgFontFamily } from "../../theme";

interface DilationGraphProps {
  dilationStore?: DilationStore;
  babyDescentStore?: BabyDescentStore;
}

export const DilationGraph: React.FC<DilationGraphProps> = observer(
  ({ dilationStore, babyDescentStore }) => {
    const { width: windowWidth } = useWindowDimensions();

    // Same content cap as the rest of the app: on big monitors the chart
    // stays a readable width instead of stretching across the whole screen.
    const svgWidth = Math.max(Math.min(windowWidth, layout.maxContentWidth) - 32, 200);
    const svgHeight = 340;
    const padL = 38, padR = 16, padT = 16, padB = 60;
    const cW = svgWidth - padL - padR;
    const cH = svgHeight - padT - padB;

    const xMin = 0, xMax = 12;
    const yMin = 0, yMax = 10;

    const toX = (v: number) => padL + ((Math.max(xMin, Math.min(xMax, v)) - xMin) / (xMax - xMin)) * cW;
    const toY = (v: number) => padT + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * cH;

    const areaPath = (pts: { x: number; y: number; y0: number }[]) => {
      if (pts.length === 0) return "";
      const top = pts.map(p => `${toX(p.x)},${toY(p.y)}`).join(" L ");
      const bot = [...pts].reverse().map(p => `${toX(p.x)},${toY(p.y0)}`).join(" L ");
      return `M ${top} L ${bot} Z`;
    };

    // Zone areas — same data as original victory code
    const alertArea = [{ x: 0, y: 10, y0: 4 }, { x: 6, y: 10, y0: 10 }];
    const normalArea = [
      { x: 0, y: 4, y0: 4 },
      { x: 4, y: 8, y0: 4 },
      { x: 6, y: 10, y0: 6 },
      { x: 10, y: 10, y0: 10 },
    ];
    // action line clipped to yMax=10: y=x, so y reaches 10 at x=10
    const actionArea = [{ x: 4, y: 4, y0: 4 }, { x: 10, y: 10, y0: 4 }];

    const getRelativeX = (dateStr: string | null): number => {
      if (!dateStr) return 0;
      const delta = new Date().getTime() - new Date(dateStr).getTime();
      return (delta / (1000 * 60 * 60)) % 12;
    };

    const dilationPts = (dilationStore?.sortedDilationList ?? []).map((p: Dilation) => ({
      x: p.data.Rank === 0 ? getRelativeX(p.partogrammeStore.partogramme.workStartDateTime) : (p.data.Rank ?? 0),
      y: p.data.value,
    }));

    const descentPts = (babyDescentStore?.sortedBabyDescentList ?? []).map((p: BabyDescent) => ({
      x: p.data.Rank === 0 ? getRelativeX(p.partogrammeStore.partogramme.workStartDateTime) : (p.data.Rank ?? 0),
      y: p.data.value,
    }));

    const yTicks = [0, 2, 4, 6, 8, 10];
    const xTicks = [0, 2, 4, 6, 8, 10, 12];

    const dilPoly = dilationPts.map(d => `${toX(d.x)},${toY(d.y)}`).join(" ");
    const desPoly = descentPts.map(d => `${toX(d.x)},${toY(d.y)}`).join(" ");

    return (
      <View style={{ alignSelf: "center" }}>
        <Svg width={svgWidth} height={svgHeight}>
          <Rect x={padL} y={padT} width={cW} height={cH} fill="#fafafa" stroke="#e0e0e0" strokeWidth={1} />

          {/* Zone fills */}
          <Path d={areaPath(alertArea)} fill="rgba(6,189,37,0.2)" />
          <Path d={areaPath(normalArea)} fill="rgba(255,220,0,0.2)" />
          <Path d={areaPath(actionArea)} fill="rgba(255,0,0,0.18)" />

          {/* Grid */}
          {yTicks.map(y => (
            <G key={`y${y}`}>
              <Line x1={padL} y1={toY(y)} x2={padL + cW} y2={toY(y)} stroke="#e8e8e8" strokeWidth={0.7} />
              <SvgText fontFamily={svgFontFamily} x={padL - 4} y={toY(y) + 3.5} textAnchor="end" fontSize={9} fill="#777">{y}</SvgText>
            </G>
          ))}

          {xTicks.map(x => (
            <G key={`x${x}`}>
              <Line x1={toX(x)} y1={padT} x2={toX(x)} y2={padT + cH} stroke="#e8e8e8" strokeWidth={0.7} />
              <SvgText fontFamily={svgFontFamily} x={toX(x)} y={padT + cH + 14} textAnchor="middle" fontSize={9} fill="#777">{x}h</SvgText>
            </G>
          ))}

          {/* Dilation data */}
          {dilationPts.length > 1 && (
            <Polyline points={dilPoly} fill="none" stroke="#c43a31" strokeWidth={2} />
          )}
          {dilationPts.map((d, i) => (
            <Circle key={`d${i}`} cx={toX(d.x)} cy={toY(d.y)} r={4} fill="#c43a31" />
          ))}

          {/* Baby descent data */}
          {descentPts.length > 1 && (
            <Polyline points={desPoly} fill="none" stroke="#3a6bc4" strokeWidth={2} />
          )}
          {descentPts.map((d, i) => (
            <Circle key={`b${i}`} cx={toX(d.x)} cy={toY(d.y)} r={4} fill="#3a6bc4" />
          ))}

          {/* Axis labels */}
          <SvgText fontFamily={svgFontFamily} x={padL + cW / 2} y={svgHeight - 10} textAnchor="middle" fontSize={9} fill="#555">
            Temps (heures)
          </SvgText>
          <SvgText fontFamily={svgFontFamily}
            x={10}
            y={padT + cH / 2}
            textAnchor="middle"
            fontSize={9}
            fill="#555"
            transform={`rotate(-90, 10, ${padT + cH / 2})`}
          >
            cm
          </SvgText>

          {/* Legend */}
          <Circle cx={padL + 8} cy={svgHeight - 36} r={4} fill="#c43a31" />
          <SvgText fontFamily={svgFontFamily} x={padL + 17} y={svgHeight - 32} fontSize={9} fill="#333">Dilatation</SvgText>
          <Circle cx={padL + 80} cy={svgHeight - 36} r={4} fill="#3a6bc4" />
          <SvgText fontFamily={svgFontFamily} x={padL + 89} y={svgHeight - 32} fontSize={9} fill="#333">Descente du bébé</SvgText>
        </Svg>
      </View>
    );
  }
);

export default DilationGraph;

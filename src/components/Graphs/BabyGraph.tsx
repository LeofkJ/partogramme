import React from "react";
import { View, useWindowDimensions } from "react-native";
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

interface BabyGraphProps {
  data?: Array<{ x: number; y: number }>;
}

export const BabyGraph: React.FC<BabyGraphProps> = observer(({ data }) => {
  const { width: windowWidth } = useWindowDimensions();

  // Same content cap as the rest of the app: on big monitors the chart
    // stays a readable width instead of stretching across the whole screen.
    const svgWidth = Math.max(Math.min(windowWidth, layout.maxContentWidth) - 32, 200);
  const svgHeight = 280;
  const padL = 46, padR = 16, padT = 16, padB = 52;
  const cW = svgWidth - padL - padR;
  const cH = svgHeight - padT - padB;

  const xMin = 0, xMax = 12;
  const yMin = 120, yMax = 180;

  const toX = (v: number) => padL + ((Math.max(xMin, Math.min(xMax, v)) - xMin) / (xMax - xMin)) * cW;
  const toY = (v: number) => padT + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * cH;

  const yTicks = [120, 130, 140, 150, 160, 170, 180];
  const xTicks = [0, 2, 4, 6, 8, 10, 12];

  const pts = (data ?? []).filter(d => d != null && isFinite(d.x) && isFinite(d.y));
  const polyPts = pts.map(d => `${toX(d.x)},${toY(d.y)}`).join(" ");

  return (
    <View style={{ alignSelf: "center" }}>
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
            <SvgText fontFamily={svgFontFamily} x={toX(x)} y={padT + cH + 14} textAnchor="middle" fontSize={9} fill="#777">{x}h</SvgText>
          </G>
        ))}

        {pts.length > 1 && (
          <Polyline points={polyPts} fill="none" stroke="#c43a31" strokeWidth={2} />
        )}

        {pts.map((d, i) => (
          <Circle key={i} cx={toX(d.x)} cy={toY(d.y)} r={4} fill="#c43a31" />
        ))}

        <SvgText fontFamily={svgFontFamily} x={padL + cW / 2} y={svgHeight - 8} textAnchor="middle" fontSize={9} fill="#555">
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
          bpm
        </SvgText>

        <G>
          <Circle cx={padL + 8} cy={svgHeight - 32} r={4} fill="#c43a31" />
          <SvgText fontFamily={svgFontFamily} x={padL + 17} y={svgHeight - 28} fontSize={9} fill="#333">
            Fréquence cardiaque du bébé
          </SvgText>
        </G>
      </Svg>
    </View>
  );
});

export default BabyGraph;

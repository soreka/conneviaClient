import React from 'react';
import Svg, { Circle, G, Path, Rect, Line } from 'react-native-svg';

interface BedIconProps {
  size?: number;
  opacity?: number;
}

export const BedIcon: React.FC<BedIconProps> = ({ size = 64, opacity = 1 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" style={{ opacity }}>
      <Circle cx="256" cy="256" r="256" fill="#E8DFF5" />
      <G transform="translate(128, 128) scale(0.5)">
        <Path
          d="M 392.002 392.002 L 356.002 392.002 L 336.002 336.002 L 96.002 336.002 L 76.002 392.002 L 40.002 392.002 L 40.002 264.002 L 392.002 264.002 L 392.002 392.002 Z"
          fill="#B8B8D0"
          stroke="#7A67A0"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <Rect
          x="136.002"
          y="208.002"
          width="160"
          height="56"
          rx="28"
          ry="28"
          fill="#CFAFE0"
          stroke="#7A67A0"
          strokeWidth="16"
          strokeLinejoin="round"
        />
        <Path
          d="M 312.002 208.002 L 312.002 160.002 C 312.002 142.328 326.328 128.002 344.002 128.002 L 392.002 128.002"
          fill="none"
          stroke="#7A67A0"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1="368.002"
          y1="128.002"
          x2="368.002"
          y2="264.002"
          stroke="#7A67A0"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1="56.002"
          y1="96.002"
          x2="116.002"
          y2="336.002"
          stroke="#7A67A0"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 272.002 208.002 L 272.002 160.002 C 272.002 142.328 286.328 128.002 304.002 128.002"
          fill="none"
          stroke="#7A67A0"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};

export default BedIcon;

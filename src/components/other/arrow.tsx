import React from "react";
import { BarTask } from "../../types/bar-task";

type ArrowProps = {
  taskFrom: BarTask;
  taskTo: BarTask;
  rowHeight: number;
  taskHeight: number;
  arrowIndent: number;
  arrowLineRadius: number;
  arrowLineStroke: number;
  rtl: boolean;
};
export const Arrow: React.FC<ArrowProps> = ({
  taskFrom,
  taskTo,
  rowHeight,
  taskHeight,
  arrowIndent,
  arrowLineRadius,
  arrowLineStroke,
  rtl,
}) => {
  let path: string;
  let trianglePoints: string;
  const safeStrokeWidth = (!arrowLineStroke || arrowLineStroke < 0.5 ? 0.5 : (arrowLineStroke > 5 ? 5 : arrowLineStroke));

  if (rtl) {
    [path, trianglePoints] = drownPathAndTriangleRTL(
      taskFrom,
      taskTo,
      rowHeight,
      taskHeight,
      arrowIndent,
      // arrowLineRadius,
      // safeStrokeWidth,
    );
  } else {
    [path, trianglePoints] = drownPathAndTriangle(
      taskFrom,
      taskTo,
      rowHeight,
      taskHeight,
      arrowIndent,
      arrowLineRadius,
      safeStrokeWidth,
    );
  }

  return (
    <g className="arrow">
      <path strokeWidth={safeStrokeWidth}
        d={path}
        fill="none"
        strokeLinejoin="round" />
      <polygon points={trianglePoints} />
    </g>
  );
};

const drownPathAndTriangle = (
  taskFrom: BarTask,
  taskTo: BarTask,
  rowHeight: number,
  taskHeight: number,
  arrowIndent: number,
  arrowLineRadius: number,
  safeStrokeWidth: number,
) => {
  /* EXAMPLES OF CHANGES -- THROW THIS INTO https://codepen.io/pen/ to test:
  <!-- ORIGNAL: -->
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <g class="arrow" fill="#6baa55" stroke="#6baa55">
      <path
        stroke-width="1.5"
        d=" M 90 63
            h 12
            v 21
            H 78
            V 105
            h 12"
        fill="none"
        stroke-linejoin="round"
      ></path>
    </g>
  </svg>
  <!-- NEW: -->
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <g class="arrow" fill="#6baa55" stroke="#6baa55">
      <path
        stroke-width="1.5"
        d=" M 90 63
            h 7
            a 5 5 0 0 1 5 5
            v 11
            a 5 5 0 0 1 -5 5
            H 82
            a 5 5 0 0 0 -5 5
            V 100
            a 5 5 0 0 0 5 5
            h 7"
        fill="none"
        stroke-linejoin="round"
      ></path>
    </g>
  </svg>
  */
  const safeRadius = (arrowLineRadius < 0 ? 0 : (arrowLineRadius > (taskHeight/2) ? (taskHeight/2) : arrowLineRadius));
  const safeIndent = (arrowIndent < safeRadius*2 ? safeRadius*2 : (arrowIndent < 8 ? 8 : arrowIndent));
  const indexCompare = (taskFrom.index > taskTo.index ? -1 : 1);
  const isUp = (((indexCompare * rowHeight) / 2) < 0);
  const taskToEndPosition = (taskTo.y + (taskHeight / 2));
  const taskFromEndPosition = (taskFrom.x2 + (safeIndent * 2));
  const taskFromHorizontalOffsetValue = ((taskFromEndPosition < taskTo.x1+safeIndent) ? "" : `H ${taskTo.x1 - safeIndent + safeRadius}`);
  const taskToHorizontalOffsetValue = (((taskFromEndPosition > taskTo.x1) ? safeIndent : (taskTo.x1 - taskFrom.x2 - safeIndent)) - safeStrokeWidth);
  const path = `M ${taskFrom.x2-safeRadius} ${taskFrom.y + (taskHeight / 2)}
    h ${safeIndent-safeRadius}
    a ${safeRadius} ${safeRadius} 0 0 ${isUp?0:1} ${safeRadius} ${isUp?"-":""}${safeRadius}
    v ${((indexCompare * rowHeight) / 2) - (safeRadius*2*(isUp?-1:1))}${!!taskFromHorizontalOffsetValue ? `
    a ${safeRadius} ${safeRadius} 0 0 ${isUp?0:1} -${safeRadius} ${isUp?"-":""}${safeRadius}` : ""}${!!taskFromHorizontalOffsetValue ? `
    ${taskFromHorizontalOffsetValue}` : ""}${!!taskFromHorizontalOffsetValue ? `
    a ${safeRadius} ${safeRadius} 0 0 ${isUp?1:0} -${safeRadius} ${isUp?"-":""}${safeRadius}` : ""}
    V ${taskToEndPosition - (safeRadius*(isUp?-1:1))}
    a ${safeRadius} ${safeRadius} 0 0 ${isUp?1:0} ${safeRadius} ${isUp?"-":""}${safeRadius}
    h ${taskToHorizontalOffsetValue}`;
  const trianglePoints = `${taskTo.x1},${taskToEndPosition} ${taskTo.x1 - 5},${taskToEndPosition - 5} ${taskTo.x1 - 5},${taskToEndPosition + 5}`;
  return [path, trianglePoints];
};

const drownPathAndTriangleRTL = (
  taskFrom: BarTask,
  taskTo: BarTask,
  rowHeight: number,
  taskHeight: number,
  arrowIndent: number,
  // arrowLineRadius: number,  // NOT IMPLEMENTED YET!
  // safeStrokeWidth: number,  // NOT IMPLEMENTED YET!
) => {
  const indexCompare = (taskFrom.index > taskTo.index ? -1 : 1);
  const taskToEndPosition = (taskTo.y + (taskHeight / 2));
  const taskFromEndPosition = (taskFrom.x1 - (arrowIndent * 2));
  const taskFromHorizontalOffsetValue = (taskFromEndPosition > taskTo.x2 ? "" : `H ${taskTo.x2 + arrowIndent}`);
  const taskToHorizontalOffsetValue = (taskFromEndPosition < taskTo.x2 ? -arrowIndent : (taskTo.x2 - taskFrom.x1 + arrowIndent));
  const path = `M ${taskFrom.x1} ${taskFrom.y + taskHeight / 2}
    h ${-arrowIndent}
    v ${(indexCompare * rowHeight) / 2}
    ${taskFromHorizontalOffsetValue}
    V ${taskToEndPosition}
    h ${taskToHorizontalOffsetValue}`;
  const trianglePoints = `${taskTo.x2},${taskToEndPosition} ${taskTo.x2 + 5},${taskToEndPosition + 5} ${taskTo.x2 + 5},${taskToEndPosition - 5}`;
  return [path, trianglePoints];
};

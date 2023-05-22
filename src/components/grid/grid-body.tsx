import React, { ReactChild } from "react";
import { Task, ViewMode } from "../../types/public-types";
import { addToDate } from "../../helpers/date-helper";
import styles from "./grid.module.css";

export type GridBodyProps = {
  tasks: Task[];
  dates: Date[];
  viewMode: string;
  excludeWeekdays: number[];
  svgWidth: number;
  rowHeight: number;
  columnWidth: number;
  todayColor: string;
  rtl: boolean;
};
export const GridBody: React.FC<GridBodyProps> = ({
  tasks,
  dates,
  viewMode,
  excludeWeekdays,
  rowHeight,
  svgWidth,
  columnWidth,
  todayColor,
  rtl,
}) => {
  let y = 0;
  const gridRows: ReactChild[] = [];
  const rowLines: ReactChild[] = [
    <line
      key="RowLineFirst"
      x="0"
      y1={0}
      x2={svgWidth}
      y2={0}
      className={styles.gridRowLine}
    />,
  ];
  for (const task of tasks) {
    gridRows.push(
      <rect
        key={"Row" + task.id}
        x="0"
        y={y}
        width={svgWidth}
        height={rowHeight}
        className={styles.gridRow}
      />
    );
    rowLines.push(
      <line
        key={"RowLine" + task.id}
        x="0"
        y1={y + rowHeight}
        x2={svgWidth}
        y2={y + rowHeight}
        className={styles.gridRowLine}
      />
    );
    y += rowHeight;
  }

  const now = new Date();
  let tickX = 0;
  const ticks: ReactChild[] = [];
  let today: ReactChild = <rect />;
  let weekends: [ReactChild] = [<rect />];
  const showWeekends = (viewMode===ViewMode.Day);  // Only show gray-column weekends when in Day view - when the first two dates consecutive.
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    ticks.push(
      <line
        key={date.getTime()}
        x1={tickX}
        y1={0}
        x2={tickX}
        y2={y}
        className={styles.gridTick}
      />
    );
    if (
      ((i+1)!==dates.length && date.getTime()<now.getTime() && dates[i+1].getTime()>=now.getTime())
      ||  // if current date is last
      (i!==0 && (i+1)===dates.length && date.getTime()<now.getTime() && addToDate(date,date.getTime()-dates[i-1].getTime(),"millisecond").getTime()>=now.getTime())
    ) {
      today = (
        <rect
          x={tickX}
          y={0}
          width={columnWidth}
          height={y}
          fill={todayColor}
        />
      );
    }
    // rtl for today
    if (rtl && (i+1)!==dates.length && date.getTime()>=now.getTime() && dates[i+1].getTime()<now.getTime()) {
      today = (
        <rect
          x={tickX + columnWidth}
          y={0}
          width={columnWidth}
          height={y}
          fill={todayColor}
        />
      );
    }
    tickX += columnWidth;

    // Gray-out weekends columns
    if (!!showWeekends && excludeWeekdays.includes(date.getDay())) {
      weekends.push(
        <rect
          key={`${date.getFullYear()}${date.getMonth()}${date.getDate()}`}
          x={tickX-columnWidth}
          y={0}
          width={columnWidth}
          height={y}
          fill="hsl(0deg 0% 0% / 10%)"
        />
      );
    }
  }
  return (
    <g className="gridBody">
      <g className="rows">{gridRows}</g>
      <g className="rowLines">{rowLines}</g>
      <g className="ticks">{ticks}</g>
      <g className="today">{today}</g>
      {!!showWeekends && weekends.map((r,i)=>{
        return (<g key={i} className="weekends">{r}</g>);
      })}
    </g>
  );
};

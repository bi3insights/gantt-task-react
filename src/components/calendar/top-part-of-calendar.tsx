import React from "react";
import styles from "./calendar.module.css";

type TopPartOfCalendarProps = {
  value: string;
  x1Line: number;
  y1Line: number;
  y2Line: number;
  xTextPre: number;
  xText: number;
  xTextPost: number;
  yText: number;
};

export const TopPartOfCalendar: React.FC<TopPartOfCalendarProps> = ({
  value,
  x1Line,
  y1Line,
  y2Line,
  xTextPre,
  xText,
  xTextPost,
  yText,
}) => {
  return (
    <g className="calendarTop">
      <line
        x1={x1Line}
        y1={y1Line}
        x2={x1Line}
        y2={y2Line}
        className={styles.calendarTopTick}
        key={value + "line"}
      />
      {xTextPre===-1?<React.Fragment></React.Fragment>:
        <text
          key={value + "textPre"}
          y={yText}
          x={xTextPre}
          className={styles.Start}
        >
          {value}
        </text>
      }
      <text
        key={value + "text"}
        y={yText}
        x={xText}
        className={styles.calendarTopText}
      >
        {value}
      </text>
      {xTextPost===-1?<React.Fragment></React.Fragment>:
        <text
          key={value + "textPost"}
          y={yText}
          x={xTextPost}
          className={styles.calendarTopTextEnd}
        >
          {value}
        </text>
      }
    </g>
  );
};

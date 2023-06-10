import React, {
  useState,
  SyntheticEvent,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { ViewMode, GanttProps, Task } from "../../types/public-types";
import { GridProps } from "../grid/grid";
import { ganttDateRange, seedDates } from "../../helpers/date-helper";
import { CalendarProps } from "../calendar/calendar";
import { TaskGanttContentProps } from "./task-gantt-content";
import { TaskListHeaderDefault } from "../task-list/task-list-header";
import { TaskListTableDefault } from "../task-list/task-list-table";
import { StandardTooltipContent, Tooltip } from "../other/tooltip";
import { VerticalScroll } from "../other/vertical-scroll";
import { TaskListProps, TaskList } from "../task-list/task-list";
import { TaskGantt } from "./task-gantt";
import { BarTask } from "../../types/bar-task";
import { convertToBarTasks, convertTaskWorkDays, taskXCoordinate, taskYCoordinate, progressWidthByParams } from "../../helpers/bar-helper";
import { addToDate, getDaysDiff } from "../../helpers/date-helper";
import { GanttEvent } from "../../types/gantt-task-actions";
import { DateSetup } from "../../types/date-setup";
import { HorizontalScroll } from "../other/horizontal-scroll";
import { removeHiddenTasks, sortTasks } from "../../helpers/other-helper";
import styles from "./gantt.module.css";

export const Gantt: React.FunctionComponent<GanttProps> = ({
  tasks,
  headerHeight = 50,
  columnWidth = 60,
  listCellWidth = "155px",
  rowHeight = 50,
  ganttHeight = 0,
  viewMode = ViewMode.Day,
  preStepsCount = 1,
  locale = "en-US",
  barFill = 60,
  barCornerRadius = 3,
  barProgressColor = "#a3a3ff",
  barProgressSelectedColor = "#8282f5",
  barBackgroundColor = "#b8c2cc",
  barBackgroundSelectedColor = "#aeb8c2",
  projectProgressColor = "#7db59a",
  projectProgressSelectedColor = "#59a985",
  projectBackgroundColor = "#fac465",
  projectBackgroundSelectedColor = "#f7bb53",
  milestoneBackgroundColor = "#f1c453",
  milestoneBackgroundSelectedColor = "#f29e4c",
  handleWidth = 8,
  timeStep = 300000,
  excludeWeekdays = [],
  arrowColor = "grey",
  fontFamily = "Arial, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue",
  fontSize = "14px",
  arrowIndent = 20,
  arrowLineRadius = 0,
  arrowLineStroke = 1.5,
  todayColor = "rgba(252, 248, 227, 0.5)",
  viewDate,
  TooltipContent = StandardTooltipContent,
  TaskListHeader = TaskListHeaderDefault,
  TaskListTable = TaskListTableDefault,
  onDragChange,
  onDateChange,
  onProgressChange,
  onInitialize,
  onDoubleClick,
  onClick,
  onDelete,
  onSelect,
  onExpanderClick,
}) => {
  // const initialized = useRef<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const isFirstInitialized = useRef<boolean>(false);

  // TO PREVENT SCROLL-SHIFT EXPANDING CALENDAR RANGE WHILE DRAGGING EVENTS...
  // Replace this 'const [dateSetup, setDateSetup] =...' with two separate fns below: `const [dateRange, ]` and `const [dateSetup, ]`.
  // const [dateSetup, setDateSetup] = useState<DateSetup>(() => {
  const [dateSetup, ] = useState<DateSetup>(() => {
    const [startDate, endDate] = ganttDateRange(tasks, viewMode, preStepsCount);
    return { viewMode, dates: seedDates(startDate, endDate, viewMode) };
  });
  // const [dateRange, ] = useState<Date[]>(() => {
  //   return ganttDateRange(tasks, viewMode, preStepsCount);
  // });
  // const [dateSetup, ] = useState<DateSetup>(() => {
  //   const [startDate, endDate] = dateRange;
  //   return { viewMode, dates: seedDates(startDate, endDate, viewMode) };
  // });

  const [currentViewDate, setCurrentViewDate] = useState<Date|undefined>(undefined);

  const [taskListWidth, setTaskListWidth] = useState(0);
  const [svgContainerWidth, setSvgContainerWidth] = useState(0);
  const [svgContainerHeight, setSvgContainerHeight] = useState(ganttHeight);
  const [barTasks, setBarTasks] = useState<BarTask[]>([]);
  const [ganttEvent, setGanttEvent] = useState<GanttEvent>({
    action: "",
  });
  const taskHeight = useMemo(
    () => (rowHeight * barFill) / 100,
    [rowHeight, barFill]
  );

  const [selectedTask, setSelectedTask] = useState<BarTask>();
  const [failedTask, setFailedTask] = useState<BarTask | null>(null);

  const svgWidth = dateSetup.dates.length * columnWidth;
  const ganttFullHeight = barTasks.length * rowHeight;

  const [scrollY, setScrollY] = useState(0);
  const [scrollX, setScrollX] = useState(-1);
  const [ignoreScrollEvent, setIgnoreScrollEvent] = useState(false);

  const shiftDaysOfParent = ( task:BarTask, barTasks:BarTask[] ): BarTask => {
    const parentTask = barTasks.find(t=>(Number(t.id)===(!!task.dependencies?.length?Number(task.dependencies[0]):0)));
    if (!!parentTask) {
      const daysShift = getDaysDiff(parentTask.endCache, parentTask.end);
      if (!!daysShift) {
        task.start = addToDate(task.startCache, (daysShift<0?-1:1), "day");
        task.end = addToDate(task.endCache, (daysShift<0?-1:1), "day");
      }
    }
    return task;
  };

  const shiftTaskNonWorkDays = (
    barTasks: BarTask[],
    task: BarTask,
    index: number,
    dates: Date[],
    columnWidth: number,
    rowHeight: number,
    taskHeight: number,
    excludeWeekdays: number[],
    handleWidth: number,
  ): BarTask => {
    if (task.end.getTime()!==task.endCache.getTime()) {
      if (!!task.dependencies?.length) {
        task = shiftDaysOfParent(task, barTasks);  // Overwright current task after shifting same as parent was shifted.
      }
    }
    [task.start,task.end] = convertTaskWorkDays(task,excludeWeekdays);
    task.start.setHours(0,0,0,0);
    task.end.setHours(23,59,59,0);
    let x1: number;
    let x2: number;
    x1 = taskXCoordinate(task.start, dates, columnWidth);
    x2 = taskXCoordinate(task.end, dates, columnWidth);
    if (task.typeInternal.includes("task") && ((x2 - x1) < (handleWidth * 2))) {
      x2 = (x1 + (handleWidth * 2));
    }
    const [progressWidth, progressX] = progressWidthByParams(
      x1,
      x2,
      task.progress,
    );
    const y = taskYCoordinate(index, rowHeight, taskHeight);
    return {
      ...task,
      x1,
      x2,
      y,
      progressX,
      progressWidth,
    };
  };

  // task change events
  useEffect(() => {
    let filteredTasks: Task[] = tasks;
    if (onExpanderClick) {
      filteredTasks = removeHiddenTasks(filteredTasks);
    }
    filteredTasks = filteredTasks.sort(sortTasks);
    // TO PREVENT SCROLL-SHIFT EXPANDING CALENDAR RANGE WHILE DRAGGING EVENTS...
    // Comment this out, and the 'setDateSetup()' below that, AND the 'newDates,' line inside  'setBarTasks( -> convertToBarTasks(...))'
    // const [startDate, endDate] = ganttDateRange(
    //   filteredTasks,
    //   viewMode,
    //   preStepsCount
    // );
    // let newDates = seedDates(startDate, endDate, viewMode);
    // setDateSetup({ dates: newDates, viewMode });
    let _initializedTasks = convertToBarTasks(
      filteredTasks,
      // newDates,
      dateSetup.dates,
      columnWidth,
      rowHeight,
      taskHeight,
      barCornerRadius,
      handleWidth,
      barProgressColor,
      barProgressSelectedColor,
      barBackgroundColor,
      barBackgroundSelectedColor,
      projectProgressColor,
      projectProgressSelectedColor,
      projectBackgroundColor,
      projectBackgroundSelectedColor,
      milestoneBackgroundColor,
      milestoneBackgroundSelectedColor,
    );

    // Shift tasks with non-business-dates for start/end.
    _initializedTasks = _initializedTasks.map((task,i) => {
      const new_task = shiftTaskNonWorkDays(
        _initializedTasks,
        task,
        i,
        // newDates,
        dateSetup.dates,
        columnWidth,
        rowHeight,
        taskHeight,
        excludeWeekdays,
        handleWidth,
      );
      return new_task;
    });

    // After the above loop is complete, now reset each task's startCache/endCache. The loop above needs the date-diff of cached-start/end, so it can't be reset until after loop is complete.
    _initializedTasks = _initializedTasks.map((task) => {
      const _task = JSON.parse(JSON.stringify(task));
      _task.start       = new Date(_task.start);
      _task.startCache  = new Date(_task.start);
      _task.end         = new Date(_task.end);
      _task.endCache    = new Date(_task.end);
      // Also update original 'tasks':
      const _origTask = tasks.find(o=>(o.id===_task.id));
      if (!!_origTask) {
        _origTask.start       = new Date(_task.start);
        _origTask.startCache  = new Date(_task.startCache);
        _origTask.end         = new Date(_task.end);
        _origTask.endCache    = new Date(_task.endCache);
      }
      return _task;
    });


    setBarTasks(_initializedTasks);
  }, [
    tasks,
    viewMode,
    preStepsCount,
    rowHeight,
    barCornerRadius,
    columnWidth,
    taskHeight,
    excludeWeekdays,
    handleWidth,
    barProgressColor,
    barProgressSelectedColor,
    barBackgroundColor,
    barBackgroundSelectedColor,
    projectProgressColor,
    projectProgressSelectedColor,
    projectBackgroundColor,
    projectBackgroundSelectedColor,
    milestoneBackgroundColor,
    milestoneBackgroundSelectedColor,
    // scrollX,
    onExpanderClick,
    dateSetup,  // TO PREVENT SCROLL-SHIFT EXPANDING CALENDAR RANGE WHILE DRAGGING EVENTS - Uncomment this 'dateSetup' accessor.
  ]);

  useEffect(() => {
    if (
      viewMode === dateSetup.viewMode &&
      ((viewDate && !currentViewDate) ||
        (viewDate && currentViewDate?.valueOf() !== viewDate.valueOf()))
    ) {
      const dates = dateSetup.dates;
      const index = dates.findIndex(
        (d, i) =>
          viewDate.valueOf() >= d.valueOf() &&
          i + 1 !== dates.length &&
          viewDate.valueOf() < dates[i + 1].valueOf()
      );
      if (index === -1) {
        return;
      }
      setCurrentViewDate(viewDate);
      setScrollX(columnWidth * index);
    }
  }, [
    viewDate,
    columnWidth,
    dateSetup.dates,
    dateSetup.viewMode,
    viewMode,
    currentViewDate,
    setCurrentViewDate,
  ]);

  useEffect(() => {
    const { changedTask, action } = ganttEvent;
    if (changedTask) {
      if (action === "delete") {
        setGanttEvent({ action: "" });
        setBarTasks(barTasks.filter(t => t.id !== changedTask.id));
      } else if (action === "move" || action === "end" || action === "start" || action === "progress") {
        const prevStateTask = barTasks.find(t => t.id === changedTask.id);
        if (prevStateTask &&
          (prevStateTask.start.getTime() !== changedTask.start.getTime()
            || prevStateTask.end.getTime() !== changedTask.end.getTime()
            || prevStateTask.progress !== changedTask.progress
          )
        ) {
          // actions for change
          const newTaskList = barTasks.map(t => (t.id === changedTask.id ? changedTask : t));
          setBarTasks(newTaskList);
        }
      }
    }
  }, [ganttEvent, barTasks]);

  useEffect(() => {
    if (failedTask) {
      setBarTasks(barTasks.map(t => (t.id !== failedTask.id ? t : failedTask)));
      setFailedTask(null);
    }
  }, [failedTask, barTasks]);

  useEffect(() => {
    window.setTimeout(()=>{  // This timeout fixes incorrect gantt scrollbar left-margin when using custom tasks-list component.
      if (taskListRef.current) {
        setTaskListWidth(taskListRef.current.offsetWidth);
      } else if (!listCellWidth) {
        setTaskListWidth(0);
      }
    },1);
  }, [taskListRef, listCellWidth]);

  useEffect(() => {
    if (wrapperRef.current) {
      setSvgContainerWidth(wrapperRef.current.offsetWidth - taskListWidth);
    }
  }, [wrapperRef, taskListWidth]);

  useEffect(() => {
    if (ganttHeight) {
      setSvgContainerHeight(ganttHeight + headerHeight);
    } else {
      setSvgContainerHeight((tasks.length * rowHeight) + headerHeight);
    }
  }, [ganttHeight, tasks, headerHeight, rowHeight]);

  // scroll events
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.shiftKey || event.deltaX) {
        const scrollMove = event.deltaX ? event.deltaX : event.deltaY;
        let newScrollX = scrollX + scrollMove;
        if (newScrollX < 0) {
          newScrollX = 0;
        } else if (newScrollX > svgWidth) {
          newScrollX = svgWidth;
        }
        setScrollX(newScrollX);
        event.preventDefault();
      } else if (ganttHeight) {
        let newScrollY = scrollY + event.deltaY;
        if (newScrollY < 0) {
          newScrollY = 0;
        } else if (newScrollY > ganttFullHeight - ganttHeight) {
          newScrollY = ganttFullHeight - ganttHeight;
        }
        if (newScrollY !== scrollY) {
          setScrollY(newScrollY);
          event.preventDefault();
        }
      }
      setIgnoreScrollEvent(true);
    };
    // subscribe if scroll is necessary
    wrapperRef.current?.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    return () => {
      wrapperRef.current?.removeEventListener("wheel", handleWheel);
    };
  }, [
    wrapperRef,
    scrollY,
    scrollX,
    ganttHeight,
    svgWidth,
    ganttFullHeight,
  ]);

  useEffect(()=>{
    if (!isFirstInitialized.current && !!barTasks.length && typeof(onInitialize)==="function") {
      isFirstInitialized.current = true;
      onInitialize(barTasks);
    }
  },[isFirstInitialized,barTasks]);

  const handleScrollY = (event: SyntheticEvent<HTMLDivElement>) => {
    if (scrollY !== event.currentTarget.scrollTop && !ignoreScrollEvent) {
      setScrollY(event.currentTarget.scrollTop);
      setIgnoreScrollEvent(true);
    } else {
      setIgnoreScrollEvent(false);
    }
  };

  const handleScrollX = (event: SyntheticEvent<HTMLDivElement>) => {
    if (scrollX !== event.currentTarget.scrollLeft && !ignoreScrollEvent) {
      setScrollX(event.currentTarget.scrollLeft);
      setIgnoreScrollEvent(true);
    } else {
      setIgnoreScrollEvent(false);
    }
  };

  /**
   * Handles arrow keys events and transform it to new scroll
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    let newScrollY = scrollY;
    let newScrollX = scrollX;
    let isX = true;
    switch (event.key) {
      case "Down": // IE/Edge specific value
      case "ArrowDown":
        newScrollY += rowHeight;
        isX = false;
        break;
      case "Up": // IE/Edge specific value
      case "ArrowUp":
        newScrollY -= rowHeight;
        isX = false;
        break;
      case "Left":
      case "ArrowLeft":
        newScrollX -= columnWidth;
        break;
      case "Right": // IE/Edge specific value
      case "ArrowRight":
        newScrollX += columnWidth;
        break;
    }
    if (isX) {
      if (newScrollX < 0) {
        newScrollX = 0;
      } else if (newScrollX > svgWidth) {
        newScrollX = svgWidth;
      }
      setScrollX(newScrollX);
    } else {
      if (newScrollY < 0) {
        newScrollY = 0;
      } else if (newScrollY > ganttFullHeight - ganttHeight) {
        newScrollY = ganttFullHeight - ganttHeight;
      }
      setScrollY(newScrollY);
    }
    setIgnoreScrollEvent(true);
  };

  /**
   * Task select event
   */
  const handleSelectedTask = (taskId: string) => {
    const newSelectedTask = barTasks.find(t => t.id === taskId);
    const oldSelectedTask = barTasks.find(t => !!selectedTask && t.id === selectedTask.id);
    if (onSelect) {
      if (oldSelectedTask) {
        onSelect(oldSelectedTask, false);
      }
      if (newSelectedTask) {
        onSelect(newSelectedTask, true);
      }
    }
    setSelectedTask(newSelectedTask);
  };
  const handleExpanderClick = (task: Task) => {
    if (onExpanderClick && task.hideChildren !== undefined) {
      onExpanderClick({ ...task, hideChildren: !task.hideChildren });
    }
  };
  const gridProps: GridProps = {
    tasks: tasks,
    dates: dateSetup.dates,
    viewMode: viewMode,
    excludeWeekdays: excludeWeekdays,
    rowHeight,
    svgWidth,
    columnWidth,
    todayColor,
  };
  const calendarProps: CalendarProps = {
    dateSetup,
    locale,
    viewMode,
    headerHeight,
    columnWidth,
    fontFamily,
    fontSize,
  };
  const barProps: TaskGanttContentProps = {
    tasks: barTasks,
    dates: dateSetup.dates,
    ganttEvent,
    selectedTask,
    rowHeight,
    taskHeight,
    columnWidth,
    arrowColor,
    timeStep,
    excludeWeekdays,
    fontFamily,
    fontSize,
    arrowIndent,
    arrowLineRadius,
    arrowLineStroke,
    svgWidth,
    setGanttEvent,
    setFailedTask,
    setSelectedTask: handleSelectedTask,
    onDragChange,
    onDateChange,
    onProgressChange,
    onDoubleClick,
    onClick,
    onDelete,
  };

  const tableProps: TaskListProps = {
    rowHeight,
    rowWidth: listCellWidth,
    fontFamily,
    fontSize,
    tasks: barTasks,
    locale,
    headerHeight,
    scrollY,
    ganttHeight,
    horizontalContainerClass: styles.horizontalContainer,
    selectedTask,
    taskListRef,
    setSelectedTask: handleSelectedTask,
    onExpanderClick: handleExpanderClick,
    TaskListHeader,
    TaskListTable,
  };
  return (
    <div>
      <div
        className={styles.wrapper}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={wrapperRef}
      >
        {listCellWidth && <TaskList {...tableProps} />}
        <TaskGantt
          gridProps={gridProps}
          calendarProps={calendarProps}
          barProps={barProps}
          ganttHeight={ganttHeight}
          scrollY={scrollY}
          scrollX={scrollX}
        />
        {ganttEvent.changedTask && (
          <Tooltip
            arrowIndent={arrowIndent}
            rowHeight={rowHeight}
            svgContainerHeight={svgContainerHeight}
            svgContainerWidth={svgContainerWidth}
            fontFamily={fontFamily}
            fontSize={fontSize}
            scrollX={scrollX}
            scrollY={scrollY}
            task={ganttEvent.changedTask}
            headerHeight={headerHeight}
            taskListWidth={taskListWidth}
            TooltipContent={TooltipContent}
            svgWidth={svgWidth}
          />
        )}
        <VerticalScroll
          ganttFullHeight={ganttFullHeight}
          ganttHeight={ganttHeight}
          headerHeight={headerHeight}
          scroll={scrollY}
          onScroll={handleScrollY}
        />
      </div>
      <HorizontalScroll
        svgWidth={svgWidth}
        taskListWidth={taskListWidth}
        scroll={scrollX}
        onScroll={handleScrollX}
      />
    </div>
  );
};

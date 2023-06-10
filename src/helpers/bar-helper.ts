import { Task } from "../types/public-types";
import { BarTask, TaskTypeInternal } from "../types/bar-task";
import { BarMoveAction } from "../types/gantt-task-actions";

export const convertToBarTasks = (
  tasks: Task[],
  dates: Date[],
  columnWidth: number,
  rowHeight: number,
  taskHeight: number,
  barCornerRadius: number,
  handleWidth: number,
  barProgressColor: string,
  barProgressSelectedColor: string,
  barBackgroundColor: string,
  barBackgroundSelectedColor: string,
  projectProgressColor: string,
  projectProgressSelectedColor: string,
  projectBackgroundColor: string,
  projectBackgroundSelectedColor: string,
  milestoneBackgroundColor: string,
  milestoneBackgroundSelectedColor: string,
) => {

  let barTasks = tasks.map((t, i) => {
    return convertToBarTask(
      t,
      i,
      dates,
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
      milestoneBackgroundSelectedColor
    );
  });

  // Validate and Set dependencies and barChildren.
  barTasks = barTasks.map(task => {
    const dependencies = task.dependencies || [];
    for (let j = 0; j < dependencies.length; j++) {
      const dependence = barTasks.findIndex(value => value.id === dependencies[j]);
      if (dependence !== -1) {
        barTasks[dependence].barChildren.push(task);
      }
    }
    return task;
  });

  // Finished.
  return barTasks;
};

const convertToBarTask = (
  task: Task,
  index: number,
  dates: Date[],
  columnWidth: number,
  rowHeight: number,
  taskHeight: number,
  barCornerRadius: number,
  handleWidth: number,
  barProgressColor: string,
  barProgressSelectedColor: string,
  barBackgroundColor: string,
  barBackgroundSelectedColor: string,
  projectProgressColor: string,
  projectProgressSelectedColor: string,
  projectBackgroundColor: string,
  projectBackgroundSelectedColor: string,
  milestoneBackgroundColor: string,
  milestoneBackgroundSelectedColor: string
): BarTask => {
  let barTask: BarTask;
  switch (task.type) {
    case "milestone":
      barTask = convertToMilestone(
        task,
        index,
        dates,
        columnWidth,
        rowHeight,
        taskHeight,
        barCornerRadius,
        handleWidth,
        milestoneBackgroundColor,
        milestoneBackgroundSelectedColor
      );
      break;
    case "project":
      barTask = convertToBar(
        task,
        index,
        dates,
        columnWidth,
        rowHeight,
        taskHeight,
        barCornerRadius,
        handleWidth,
        projectProgressColor,
        projectProgressSelectedColor,
        projectBackgroundColor,
        projectBackgroundSelectedColor
      );
      break;
    default:
      barTask = convertToBar(
        task,
        index,
        dates,
        columnWidth,
        rowHeight,
        taskHeight,
        barCornerRadius,
        handleWidth,
        barProgressColor,
        barProgressSelectedColor,
        barBackgroundColor,
        barBackgroundSelectedColor
      );
      break;
  }
  return barTask;
};

export const getDaysDiff = (start:Date, end:Date) => {
  return ((end.setHours(12,0,0) - start.setHours(12,0,0))/(1000*60*60*24))+1;
};

export const getWorkDaysDiff = (start:Date, end:Date, excludeWeekdays:number[]) => {
  let loop_duration = 0;
  let loop_date_end = new Date(start);
  while (loop_date_end<end) {
    if (!excludeWeekdays.includes(loop_date_end.getDay())) {
      ++loop_duration;  // Increment/Count working days not being excluded until task.days_duration is reached.
    }
    loop_date_end.setDate(loop_date_end.getDate()+1);
  }
  return loop_duration
};

export const convertTaskWorkDays = (task:Task, excludeWeekdays:number[]) => {
  // Applying 'excludeWeekdays'.
  if (excludeWeekdays.length>0 && excludeWeekdays.length<6) {
    // If start date is on an excluded DOW, bump the date:
    let breakCnt = 0;
    const backshift = (task.start.getTime() < task.startCache.getTime());  // START date shifts in the direction it was dragged.
    // Loop until START lands on a business work day:
    while (excludeWeekdays.includes(task.start.getDay())) {
      task.start.setDate(task.start.getDate()+(backshift?-1:1));
      if(++breakCnt>6){break;} // If all 7 weekdays [0,1,2,3,4,5,6] are in the excludeWeekdays array, or something else broke, prevent looping more than 7 times.
    }
    let loop_duration = 1;
    let loop_task_end = new Date(task.start);
    // Loop until END lands on a business work day:
    while (loop_duration<task.days_duration) {
      loop_task_end.setDate(loop_task_end.getDate()+1);  // END date always shifts RIGHT (later), not the direction it was dragged.
      if (!excludeWeekdays.includes(loop_task_end.getDay())) {
        ++loop_duration;  // Increment/Count working days not being excluded until task.days_duration is reached.
      }
    }
    task.start = new Date(task.start.setHours(0,0,0,0));
    task.end = new Date(loop_task_end.setHours(23,59,59,0));
  }
  return [task.start,task.end]
};

const convertToBar = (
  task: Task,
  index: number,
  dates: Date[],
  columnWidth: number,
  rowHeight: number,
  taskHeight: number,
  barCornerRadius: number,
  handleWidth: number,
  barProgressColor: string,
  barProgressSelectedColor: string,
  barBackgroundColor: string,
  barBackgroundSelectedColor: string
): BarTask => {
  task.start.setHours(0,0,0,0);
  task.end.setHours(23,59,59,0);
  let x1: number;
  let x2: number;
  x1 = taskXCoordinate(task.start, dates, columnWidth);
  x2 = taskXCoordinate(task.end, dates, columnWidth);
  let typeInternal: TaskTypeInternal = task.type;
  if (typeInternal === "task" && ((x2-x1)<(handleWidth*2))) {
    typeInternal = "smalltask";
    x2 = (x1 + (handleWidth * 2));
  }
  const [progressWidth, progressX] = progressWidthByParams(
    x1,
    x2,
    task.progress,
  );
  const y = taskYCoordinate(index, rowHeight, taskHeight);
  const hideChildren = task.type === "project" ? task.hideChildren : undefined;
  const styles = {
    backgroundColor: barBackgroundColor,
    backgroundSelectedColor: barBackgroundSelectedColor,
    progressColor: barProgressColor,
    progressSelectedColor: barProgressSelectedColor,
    ...task.styles,
  };
  return {
    ...task,
    typeInternal,
    x1,
    x2,
    y,
    index,
    progressX,
    progressWidth,
    barCornerRadius,
    handleWidth,
    hideChildren,
    height: taskHeight,
    barChildren: [],
    styles,
  };
};

const convertToMilestone = (
  task: Task,
  index: number,
  dates: Date[],
  columnWidth: number,
  rowHeight: number,
  taskHeight: number,
  barCornerRadius: number,
  handleWidth: number,
  milestoneBackgroundColor: string,
  milestoneBackgroundSelectedColor: string
): BarTask => {
  const x = taskXCoordinate(task.start, dates, columnWidth);
  const y = taskYCoordinate(index, rowHeight, taskHeight);

  const x1 = x - (taskHeight * 0.5);
  const x2 = x + (taskHeight * 0.5);

  const rotatedHeight = (taskHeight / 1.414);
  const styles = {
    backgroundColor: milestoneBackgroundColor,
    backgroundSelectedColor: milestoneBackgroundSelectedColor,
    progressColor: "",
    progressSelectedColor: "",
    ...task.styles,
  };
  return {
    ...task,
    end: task.start,
    x1,
    x2,
    y,
    index,
    progressX: 0,
    progressWidth: 0,
    barCornerRadius,
    handleWidth,
    typeInternal: task.type,
    progress: 0,
    height: rotatedHeight,
    hideChildren: undefined,
    barChildren: [],
    styles,
  };
};

//// Original 'taskXCoordinate'.
// const taskXCoordinate = (xDate: Date, dates: Date[], columnWidth: number) => {
//   const index = dates.findIndex(d => d.getTime() >= xDate.getTime()) - 1;
//   const remainderMillis = xDate.getTime() - dates[index].getTime();
//   const percentOfInterval = remainderMillis / (dates[index + 1].getTime() - dates[index].getTime());
//   const x = ((index * columnWidth) + (percentOfInterval * columnWidth));
//   return x;
// };
//// The old 'taskXCoordinate' above allowed for partial-days, and therefore had to calculate that position.
//// Going forward we are not ever doing less than full-day intervals. Partial-days calculation can be removed and simplified.
export const taskXCoordinate = (xDate: Date, dates: Date[], columnWidth: number) => {
  const index = (dates.findIndex(d => (d.getTime()>=xDate.getTime())));
  let x = (index * columnWidth);
  if (index===-1) {  // Calculate it manually.
    const datesInterval = (dates[1].getTime()-dates[0].getTime());
    if (dates[0].getTime()>xDate.getTime()) {
      x = (((dates[0].getTime()-xDate.getTime())/datesInterval) * columnWidth);
    }
    if (dates[0].getTime()<xDate.getTime()) {
      x = (((xDate.getTime()-dates[dates.length-1].getTime())/datesInterval) * columnWidth);
    }
  }
  return x;
};
export const taskYCoordinate = (
  index: number,
  rowHeight: number,
  taskHeight: number
) => {
  const y = ((index * rowHeight) + ((rowHeight - taskHeight) / 2));
  return y;
};

export const progressWidthByParams = (
  taskX1: number,
  taskX2: number,
  progress: number,
) => {
  const progressWidth = (((taskX2 - taskX1) * progress) * 0.01);
  let progressX: number;
  progressX = taskX1;
  return [progressWidth, progressX];
};

export const progressByProgressWidth = (
  progressWidth: number,
  barTask: BarTask
) => {
  const barWidth = barTask.x2 - barTask.x1;
  const progressPercent = Math.round((progressWidth * 100) / barWidth);
  if (progressPercent >= 100) return 100;
  else if (progressPercent <= 0) return 0;
  else return progressPercent;
};

const progressByX = (x: number, task: BarTask) => {
  if (x >= task.x2) return 100;
  else if (x <= task.x1) return 0;
  else {
    const barWidth = task.x2 - task.x1;
    const progressPercent = Math.round(((x - task.x1) * 100) / barWidth);
    return progressPercent;
  }
};

export const getProgressPoint = (
  progressX: number,
  taskY: number,
  taskHeight: number
) => {
  const point = [
    progressX - 5,
    taskY + taskHeight,
    progressX + 5,
    taskY + taskHeight,
    progressX,
    taskY + taskHeight - 8.66,
  ];
  return point.join(",");
};

const startByX = (x: number, xStep: number, task: BarTask) => {
  if (x >= (task.x2 - (task.handleWidth * 2))) {
    x = (task.x2 - (task.handleWidth * 2));
  }
  const steps = Math.round((x - task.x1) / xStep);
  const additionalXValue = (steps * xStep);
  const newX = (task.x1 + additionalXValue);
  return newX;
};

const endByX = (x: number, xStep: number, task: BarTask) => {
  if (x <= (task.x1 + (task.handleWidth * 2))) {
    x = (task.x1 + (task.handleWidth * 2));
  }
  const steps = Math.round((x - task.x2) / xStep);
  const additionalXValue = (steps * xStep);
  const newX = (task.x2 + additionalXValue);
  return newX;
};

const moveByX = (x: number, xStep: number, task: BarTask) => {
  const steps = Math.round((x - task.x1) / xStep);
  const additionalXValue = (steps * xStep);
  const newX1 = (task.x1 + additionalXValue);
  const newX2 = (newX1 + task.x2 - task.x1);
  return [newX1, newX2];
};

const dateByX = (
  x: number,
  taskX: number,
  taskDate: Date,
  xStep: number,
  timeStep: number
) => {
  let newDate = new Date(taskDate.getTime() + (((x - taskX) / xStep) * timeStep));
  newDate = new Date( newDate.getTime() + ((newDate.getTimezoneOffset() - taskDate.getTimezoneOffset()) * 60000) );
  return newDate;
};

/**
 * Method handles event in real time(mousemove) and on finish(mouseup)
 */
export const handleTaskBySVGMouseEvent = (
  svgX: number,
  action: BarMoveAction,
  selectedTask: BarTask,
  xStep: number,
  timeStep: number,
  excludeWeekdays: number[],
  initEventX1Delta: number,
): { isChanged: boolean; changedTask: BarTask } => {
  let result: { isChanged: boolean; changedTask: BarTask };
  switch (selectedTask.type) {
    case "milestone":
      result = handleTaskBySVGMouseEventForMilestone(
        svgX,
        action,
        selectedTask,
        xStep,
        timeStep,
        initEventX1Delta
      );
      break;
    default:
      result = handleTaskBySVGMouseEventForBar(
        svgX,
        action,
        selectedTask,
        xStep,
        timeStep,
        excludeWeekdays,
        initEventX1Delta,
      );
      break;
  }
  return result;
};

const handleTaskBySVGMouseEventForBar = (
  svgX: number,
  action: BarMoveAction,
  selectedTask: BarTask,
  xStep: number,
  timeStep: number,
  excludeWeekdays: number[],
  initEventX1Delta: number,
): { isChanged: boolean; changedTask: BarTask } => {
  const changedTask: BarTask = { ...selectedTask };
  let isChanged = false;
  switch (action) {
    case "progress": {
      changedTask.progress = progressByX(svgX, selectedTask);
      isChanged = changedTask.progress !== selectedTask.progress;
      if (isChanged) {
        const [progressWidth, progressX] = progressWidthByParams(changedTask.x1,changedTask.x2,changedTask.progress);
        changedTask.progressWidth = progressWidth;
        changedTask.progressX = progressX;
      }
      break;
    }
    case "start": {
      const newX1 = startByX(svgX, xStep, selectedTask);
      changedTask.x1 = newX1;
      isChanged = newX1 !== selectedTask.x1;
      // if (isChanged) {
        changedTask.start = dateByX(newX1,selectedTask.x1,selectedTask.start,xStep,timeStep);
        // Applying 'excludeWeekdays'.
        // Odd issue - need to compensate for bug not maintaining increased 'days_duration' correctly:
        const backShiftOverNonBizDay = (changedTask.start.getTime() < changedTask.startCache.getTime() && excludeWeekdays.includes(changedTask.start.getDay()));
        changedTask.days_duration = getWorkDaysDiff(changedTask.start,changedTask.end,excludeWeekdays)+(!!backShiftOverNonBizDay?1:0);
        [changedTask.start,changedTask.end] = convertTaskWorkDays(changedTask,excludeWeekdays);
        // Update cached dates for next shift
        changedTask.startCache = new Date(changedTask.start);
        changedTask.endCache = new Date(changedTask.end);
        // Update UI progress width ratio
        [changedTask.progressWidth, changedTask.progressX] = progressWidthByParams(changedTask.x1,changedTask.x2,changedTask.progress);
      // }
      break;
    }
    case "end": {
      const newX2 = endByX(svgX, xStep, selectedTask);
      changedTask.x2 = newX2;
      isChanged = newX2 !== selectedTask.x2;
      // if (isChanged) {
        changedTask.end = dateByX(newX2,selectedTask.x2,selectedTask.end,xStep,timeStep);
        // Applying 'excludeWeekdays'.
        // Not a bug pre-se, but not expected behavior when forward-shifing and end-date. Compensate for it:
        const frwdShiftOverNonBizDay = (changedTask.end.getTime() > changedTask.endCache.getTime() && excludeWeekdays.includes(changedTask.end.getDay()));
        changedTask.days_duration = getWorkDaysDiff(changedTask.start,changedTask.end,excludeWeekdays)+(!!frwdShiftOverNonBizDay?1:0);
        [changedTask.start,changedTask.end] = convertTaskWorkDays(changedTask,excludeWeekdays);
        // Update cached dates for next shift
        changedTask.startCache = new Date(changedTask.start);
        changedTask.endCache = new Date(changedTask.end);
        // Update UI progress width ratio
        [changedTask.progressWidth, changedTask.progressX] = progressWidthByParams(changedTask.x1,changedTask.x2,changedTask.progress);
      // }
      break;
    }
    case "move": {
      const [newMoveX1, newMoveX2] = moveByX(
        svgX - initEventX1Delta,
        xStep,
        selectedTask
      );
      isChanged = newMoveX1 !== selectedTask.x1;
      if (isChanged) {
        changedTask.start = dateByX(newMoveX1,selectedTask.x1,selectedTask.start,xStep,timeStep);
        changedTask.end = dateByX(newMoveX2,selectedTask.x2,selectedTask.end,xStep,timeStep);
        // Applying 'excludeWeekdays'.
        [changedTask.start,changedTask.end] = convertTaskWorkDays(changedTask,excludeWeekdays);
        changedTask.x1 = newMoveX1;
        changedTask.x2 = newMoveX2;
        const [progressWidth, progressX] = progressWidthByParams(changedTask.x1,changedTask.x2,changedTask.progress);
        changedTask.progressWidth = progressWidth;
        changedTask.progressX = progressX;
      }
      break;
    }
  }
  changedTask.start.setHours(0,0,0,0);
  changedTask.end.setHours(23,59,59,0);
  return { isChanged, changedTask };
};

const handleTaskBySVGMouseEventForMilestone = (
  svgX: number,
  action: BarMoveAction,
  selectedTask: BarTask,
  xStep: number,
  timeStep: number,
  initEventX1Delta: number
): { isChanged: boolean; changedTask: BarTask } => {
  const changedTask: BarTask = { ...selectedTask };
  let isChanged = false;
  switch (action) {
    case "move": {
      const [newMoveX1, newMoveX2] = moveByX((svgX - initEventX1Delta),xStep,selectedTask);
      isChanged = newMoveX1 !== selectedTask.x1;
      if (isChanged) {
        changedTask.start = dateByX(newMoveX1,selectedTask.x1,selectedTask.start,xStep,timeStep);
        changedTask.end = changedTask.start;
        changedTask.x1 = newMoveX1;
        changedTask.x2 = newMoveX2;
      }
      break;
    }
  }
  return { isChanged, changedTask };
};

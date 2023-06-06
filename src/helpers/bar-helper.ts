import { Task } from "../types/public-types";
import { BarTask, TaskTypeInternal } from "../types/bar-task";
import { BarMoveAction } from "../types/gantt-task-actions";
import { addToDate, getDaysDiff } from "./date-helper";

export const convertToBarTasks = (
  tasks: Task[],
  dates: Date[],
  columnWidth: number,
  rowHeight: number,
  taskHeight: number,
  excludeWeekdays: number[],
  barCornerRadius: number,
  handleWidth: number,
  rtl: boolean,
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
      // excludeWeekdays,
      barCornerRadius,
      handleWidth,
      rtl,
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

  // Set dependencies.
  barTasks = barTasks.map(task => {
    const dependencies = task.dependencies || [];
    for (let j = 0; j < dependencies.length; j++) {
      const dependence = barTasks.findIndex(
        value => value.id === dependencies[j]
      );
      if (dependence !== -1) barTasks[dependence].barChildren.push(task);
    }
    return task;
  });

  // Shift tasks with non-business-dates for start/end.
  barTasks = barTasks.map((task,i) => {
    const new_task = shiftTaskNonWorkDays(
      barTasks,
      task,
      i,
      dates,
      columnWidth,
      rowHeight,
      taskHeight,
      excludeWeekdays,
      handleWidth,
      rtl,
    );
    return new_task;
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
  // excludeWeekdays: number[],
  barCornerRadius: number,
  handleWidth: number,
  rtl: boolean,
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
        // excludeWeekdays,
        barCornerRadius,
        handleWidth,
        rtl,
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
        // excludeWeekdays,
        barCornerRadius,
        handleWidth,
        rtl,
        barProgressColor,
        barProgressSelectedColor,
        barBackgroundColor,
        barBackgroundSelectedColor
      );
      break;
  }
  return barTask;
};

const getWorkDays = (start:Date, end:Date, excludeWeekdays:number[]) => {
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

const convertTaskWorkDays = (excludeWeekdays:number[], task:Task, backshift:boolean) => {
  // Try applying
  if (excludeWeekdays.length>0 && excludeWeekdays.length<6) {
    // If start date is on an excluded DOW, push it out:
    let counter1 = 0;
    while (excludeWeekdays.includes(task.start.getDay())) {
      task.start.setDate(task.start.getDate()+(backshift?-1:1));
      ++counter1;
      if(counter1>6){break;} // If all 7 weekdays [0,1,2,3,4,5,6] are in the excludeWeekdays array, or something else broke, prevent looping more than 7 times.
    }
    let loop_duration = 1;
    let loop_task_end = new Date(task.start);
    while (loop_duration<task.days_duration) {
      loop_task_end.setDate(loop_task_end.getDate()+1);  // Only increment one day at a time.
      if (!excludeWeekdays.includes(loop_task_end.getDay())) {
        ++loop_duration;  // Increment/Count working days not being excluded until task.days_duration is reached.
      }
    }
    task.end = new Date(loop_task_end);
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
  // excludeWeekdays: number[],
  barCornerRadius: number,
  handleWidth: number,
  rtl: boolean,
  barProgressColor: string,
  barProgressSelectedColor: string,
  barBackgroundColor: string,
  barBackgroundSelectedColor: string
): BarTask => {
  // [task.start,task.end] = convertTaskWorkDays(excludeWeekdays,task,false);
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
    rtl
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

// const shiftChildTaskNonWorkDays = (_task:BarTask,_days:number): BarTask => {
//   _task.start = addToDate(_task.start, _days, "day");
//   _task.end = addToDate(_task.end, _days, "day");
//   _task.barChildren.forEach((childChildTask)=>{
//     shiftChildTaskNonWorkDays(childChildTask,_days);
//   });
//   return _task;
// };

const shiftDaysOfParent = ( task:BarTask, barTasks:BarTask[] ): BarTask => {
  const parentTask = barTasks.find(t=>(Number(t.id)===(!!task.dependencies?.length?Number(task.dependencies[0]):0)));
  if (!!parentTask) {
    const daysShift = getDaysDiff(parentTask.endCache, parentTask.end);
    if (!!daysShift) {
      task.start = addToDate(task.startCache, daysShift, "day");
      task.end = addToDate(task.endCache, daysShift, "day");
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
  rtl: boolean,
): BarTask => {
  if (task.dependencies?.length===1) {
    task = shiftDaysOfParent(task, barTasks);  // Overwright current task after shifting same as parent was shifted.
  }
  [task.start,task.end] = convertTaskWorkDays(excludeWeekdays,task,false);
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
    rtl
  );
  const y = taskYCoordinate(index, rowHeight, taskHeight);
                // // NO LONGER DOING THIS FOR CHILDREN, INSTEAD WORKING EACH ITEM ABOVE SHIFTING FROM PARENT.
                // // If 'convertTaskWorkDays' shifted the end-date, then also shift any dependents:
                // // This shifts the children's & children's-children-etc-recursively BEFORE they get to 'shiftTaskNonWorkDays'. <-- That will do a final adjustment to shift them again off of non-business days.
                // const daysShift = getDaysDiff(task.endCache, task.end);
                // if (!!daysShift && !!task.barChildren?.length) {
                //   console.log("daysShift =", daysShift, ", task.barChildren =",task.barChildren);
                //   task = shiftChildTaskNonWorkDays(task,daysShift);
                // }
  return {
    ...task,
    x1,
    x2,
    y,
    progressX,
    progressWidth,
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

// const taskXCoordinate = (xDate: Date, dates: Date[], columnWidth: number) => {
//   // Try applying excludeWeekdays here:
//   const index = dates.findIndex(d => d.getTime() >= xDate.getTime()) - 1;
//   const remainderMillis = xDate.getTime() - dates[index].getTime();
//   const percentOfInterval = remainderMillis / (dates[index + 1].getTime() - dates[index].getTime());
//   const x = ((index * columnWidth) + (percentOfInterval * columnWidth));
//   return x;
// };
//// The old 'taskXCoordinate' above allowed for partial-days, and therefore had to calculate that position.
//// Going forward we are not ever doing less than full-day intervals. Partial-days calculation can be removed and simplified.
const taskXCoordinate = (xDate: Date, dates: Date[], columnWidth: number) => {
  // Try applying excludeWeekdays here:
  // const index = (dates.findIndex(d => (d.getTime()>=xDate.getTime())) - 1);
  const index = (dates.findIndex(d => (d.getTime()>=xDate.getTime())));
  let x = (index * columnWidth);
  if (index===-1) {  // Calculate it manually.
    const datesInterval = (dates[1].getTime()-dates[0].getTime());
    if (dates[0].getTime()<xDate.getTime()) {
      x = (((dates[0].getTime()-xDate.getTime())/datesInterval) * columnWidth);
    }
    if (dates[0].getTime()<xDate.getTime()) {
      x = (((xDate.getTime()-dates[dates.length-1].getTime())/datesInterval) * columnWidth);
    }
    console.log("index =", index, ", taskXCoordinate() --> xDate =", xDate, ", datesInterval =", datesInterval, ", x =",x)
  }
  return x;
};
const taskYCoordinate = (
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
  rtl: boolean
) => {
  const progressWidth = (((taskX2 - taskX1) * progress) * 0.01);
  let progressX: number;
  if (rtl) {
    progressX = taskX2 - progressWidth;
  } else {
    progressX = taskX1;
  }
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
const progressByXRTL = (x: number, task: BarTask) => {
  if (x >= task.x2) return 0;
  else if (x <= task.x1) return 100;
  else {
    const barWidth = task.x2 - task.x1;
    const progressPercent = Math.round(((task.x2 - x) * 100) / barWidth);
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
  // Try applying excludeWeekdays here:
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
  let newDate = new Date(((x - taskX) / xStep) * timeStep + taskDate.getTime());
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
  rtl: boolean
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
        rtl
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
  rtl: boolean
): { isChanged: boolean; changedTask: BarTask } => {
  const changedTask: BarTask = { ...selectedTask };
  let isChanged = false;
  switch (action) {
    case "progress":
      if (rtl) {
        changedTask.progress = progressByXRTL(svgX, selectedTask);
      } else {
        changedTask.progress = progressByX(svgX, selectedTask);
      }
      isChanged = changedTask.progress !== selectedTask.progress;
      if (isChanged) {
        const [progressWidth, progressX] = progressWidthByParams(
          changedTask.x1,
          changedTask.x2,
          changedTask.progress,
          rtl
        );
        changedTask.progressWidth = progressWidth;
        changedTask.progressX = progressX;
      }
      break;
    case "start": {
      const newX1 = startByX(svgX, xStep, selectedTask);
      changedTask.x1 = newX1;
      isChanged = changedTask.x1 !== selectedTask.x1;
      if (isChanged) {
        if (rtl) {
          changedTask.end = dateByX(
            newX1,
            selectedTask.x1,
            selectedTask.end,
            xStep,
            timeStep
          );
        } else {
          changedTask.start = dateByX(
            newX1,
            selectedTask.x1,
            selectedTask.start,
            xStep,
            timeStep
          );
        }
        // Try applying
        changedTask.days_duration = getWorkDays(changedTask.start,changedTask.end,excludeWeekdays);
        const backshift = (selectedTask.x1>newX1?true:false);
        [changedTask.start,changedTask.end] = convertTaskWorkDays(excludeWeekdays,changedTask,backshift);
        console.log("START-DATE: days_duration =",changedTask.days_duration,", changedTask.start =",changedTask.start,"changedTask.end =",changedTask.end);
        const [progressWidth, progressX] = progressWidthByParams(
          changedTask.x1,
          changedTask.x2,
          changedTask.progress,
          rtl
        );
        changedTask.progressWidth = progressWidth;
        changedTask.progressX = progressX;
      }
      break;
    }
    case "end": {
      const newX2 = endByX(svgX, xStep, selectedTask);
      changedTask.x2 = newX2;
      isChanged = changedTask.x2 !== selectedTask.x2;
      if (isChanged) {
        if (rtl) {
          changedTask.start = dateByX(
            newX2,
            selectedTask.x2,
            selectedTask.start,
            xStep,
            timeStep
          );
        } else {
          changedTask.end = dateByX(
            newX2,
            selectedTask.x2,
            selectedTask.end,
            xStep,
            timeStep
          );
        }
        // Try applying
        changedTask.days_duration = getWorkDays(changedTask.start,changedTask.end,excludeWeekdays);
        const backshift = (selectedTask.x2>newX2?true:false);
        [changedTask.start,changedTask.end] = convertTaskWorkDays(excludeWeekdays,changedTask,backshift);
        console.log("END-DATE: days_duration =",changedTask.days_duration,", changedTask.start =",changedTask.start,"changedTask.end =",changedTask.end);
        const [progressWidth, progressX] = progressWidthByParams(
          changedTask.x1,
          changedTask.x2,
          changedTask.progress,
          rtl
        );
        changedTask.progressWidth = progressWidth;
        changedTask.progressX = progressX;
      }
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
        changedTask.start = dateByX(
          newMoveX1,
          selectedTask.x1,
          selectedTask.start,
          xStep,
          timeStep
        );
        changedTask.end = dateByX(
          newMoveX2,
          selectedTask.x2,
          selectedTask.end,
          xStep,
          timeStep
        );
        // Try applying
        const backshift = (selectedTask.x1>newMoveX1?true:false);
        [changedTask.start,changedTask.end] = convertTaskWorkDays(excludeWeekdays,changedTask,backshift);
        // console.log("backshift =",backshift,"changedTask.start =",changedTask.start,"changedTask.end =",changedTask.end);
        changedTask.x1 = newMoveX1;
        changedTask.x2 = newMoveX2;
        const [progressWidth, progressX] = progressWidthByParams(changedTask.x1,changedTask.x2,changedTask.progress,rtl);
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
      const [newMoveX1, newMoveX2] = moveByX(
        svgX - initEventX1Delta,
        xStep,
        selectedTask
      );
      isChanged = newMoveX1 !== selectedTask.x1;
      if (isChanged) {
        changedTask.start = dateByX(
          newMoveX1,
          selectedTask.x1,
          selectedTask.start,
          xStep,
          timeStep
        );
        changedTask.end = changedTask.start;
        changedTask.x1 = newMoveX1;
        changedTask.x2 = newMoveX2;
      }
      break;
    }
  }
  return { isChanged, changedTask };
};

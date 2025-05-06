interface SleepItem {
  sleepType: number;
  type: string;
  sleepStartTime: string;
  sleepLen: number;
}

interface SleepStageTime {
  startTime: string;
  sleepLen: number;
}

interface GroupedSleepStage {
  sleepType: string;
  totalMinutes: number;
  stageTime: SleepStageTime[];
}

interface SleepDataItem {
  startTime: string;
  endTime: string;
  deepSleepCount: number;
  lightSleepCount: number;
  deepSleepTotal: number;
  lightSleepTotal: number;
  rapidEyeMovementTotal: number;
  sleepData: SleepItem[];
  wakeCount: number;
  wakeDuration: number;
}

interface TransformedSleepDataItem {
  startTime: string;
  endTime: string;
  sleepData: GroupedSleepStage[];
}

interface SleepOverview {
  wakeupCount: number;
  startDate: string | undefined;
  endDate: string | undefined;
  totalDeepSleep: number;
  totalLightSleep: number;
  totalREM: number;
  totalSleepTime: number;
}

interface SleepDataItem {
  endTime: string;
  sleepData: SleepItem[];
  startTime: string;
}

interface SleepData {
  overview: SleepOverview;
  sleepData: SleepDataItem[];
}

interface FinalSleepData {
  overview: SleepOverview;
  sleepData: TransformedSleepDataItem[];
}

export type { SleepItem, SleepStageTime, GroupedSleepStage, SleepDataItem, SleepData, TransformedSleepDataItem, SleepOverview, FinalSleepData };

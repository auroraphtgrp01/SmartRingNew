import { FinalSleepData, GroupedSleepStage, SleepData, SleepItem, SleepOverview } from "../types/SleepType";


export class FinalDataService {

    private static instance: FinalDataService;

    private constructor() {}

    public static getInstance(): FinalDataService {
        if (!FinalDataService.instance) {
            FinalDataService.instance = new FinalDataService();
        }
        return FinalDataService.instance;
    }

public getFinalSleepData(sleepData: any): FinalSleepData {
    const newData = sleepData.data.map((item: any) => {
        const { deepSleepCount, lightSleepCount, deepSleepTotal, lightSleepTotal, rapidEyeMovementTotal, wakeCount, wakeDuration, ...rest } = item;
        return {
            ...rest,
            sleepData: this.groupSleepData(item.sleepData)
        };
    });

    const overview: SleepOverview = {
        wakeupCount: sleepData.data.length,
        startDate: sleepData.data[0]?.startTime,
        endDate: sleepData.data[sleepData.data.length - 1]?.endTime,
        totalDeepSleep: Number(newData.reduce((total: number, item: any) => {
            const deepSleep = item.sleepData.find((stage: any) => stage.sleepType === "deepSleep");
            return total + (deepSleep?.totalMinutes || 0);
        }, 0).toFixed(2)),
        totalLightSleep: Number(newData.reduce((total: number, item: any) => {
            const lightSleep = item.sleepData.find((stage: any) => stage.sleepType === "lightSleep");
            return total + (lightSleep?.totalMinutes || 0);
        }, 0).toFixed(2)),
        totalREM: Number(newData.reduce((total: number, item: any) => {
            const rem = item.sleepData.find((stage: any) => stage.sleepType === "rem");
            return total + (rem?.totalMinutes || 0);
        }, 0).toFixed(2)),
        totalSleepTime: Number(newData.reduce((total: number, item: any) => {
            return total + item.sleepData.reduce((sum: number, stage: any) => sum + stage.totalMinutes, 0);
        }, 0).toFixed(2))
    };

    return {
        overview,
        sleepData: newData
    }

 
}

public getFinalBloodPressureData(rawData: any) {
    if (rawData.data && Array.isArray(rawData.data) && rawData.data.length > 0) {
        let totalSBP = 0;
        let totalDBP = 0;
        let count = rawData.data.length;

        const processedData = rawData.data.map((item: any) => {
            const { isInflated, ...rest } = item;
            return rest;
        });

        rawData.data.forEach((item: any) => {
            totalSBP += item.bloodSBP;
            totalDBP += item.bloodDBP;
        });

        const avgSBP = Math.round(totalSBP / count);
        const avgDBP = Math.round(totalDBP / count);

        return {
            averageData: {
                avgSBP,
                avgDBP
            },
            historyData: processedData
        };
    }
}

public getFinalComprehensiveMeasurementData(rawData: any) {
    if (rawData && rawData.data && Array.isArray(rawData.data)) {
        delete rawData.code;

        rawData.data = rawData.data.map((item: any) => {
            const { bodyFatIntValue, bodyFatFloatValue, bloodSugarValue, ...rest } = item;
            return rest;
        });

        const overview = {
            stepValueAvg: 0,
            heartValueAvg: 0,
            DBPValueAvg: 0,
            SBPValueAvg: 0,
            OOValueAvg: 0,
            respiratoryRateValueAvg: 0,
            hrvValueAvg: 0,
            cvrrValueAvg: 0,
            tempIntValueAvg: 0,
            tempFloatValueAvg: 0
        };

        if (rawData.data.length > 0) {
            const dataCount = rawData.data.length;

            rawData.data.forEach((item: Record<string, number>) => {
                overview.stepValueAvg += item.stepValue || 0;
                overview.heartValueAvg += item.heartValue || 0;
                overview.DBPValueAvg += item.DBPValue || 0;
                overview.SBPValueAvg += item.SBPValue || 0;
                overview.OOValueAvg += item.OOValue || 0;
                overview.respiratoryRateValueAvg += item.respiratoryRateValue || 0;
                overview.hrvValueAvg += item.hrvValue || 0;
                overview.cvrrValueAvg += item.cvrrValue || 0;
                overview.tempIntValueAvg += item.tempIntValue || 0;
                overview.tempFloatValueAvg += item.tempFloatValue || 0;
            });

            for (const key in overview) {
                if (Object.prototype.hasOwnProperty.call(overview, key)) {
                    overview[key as keyof typeof overview] = Math.round((overview[key as keyof typeof overview] / dataCount) * 100) / 100;
                }
            }
        }

        rawData.overview = overview;
    }
    return rawData;
}

public getFinalHeartData(rawData: any) {
    if (rawData.data && Array.isArray(rawData.data)) {
        const heartRateAvg = rawData.data.reduce((sum: number, item: any) => sum + item.heartValue, 0) / rawData.data.length;

        return {
            avgHeartRate: Math.round(heartRateAvg),
            data: rawData.data
        };
    }

    return { data: [], avgHeartRate: 0 };
}

public getFinalSportData(rawData: any) {
    return rawData
}


private groupSleepData(sleepData: SleepItem[]): GroupedSleepStage[] {
    const result: GroupedSleepStage[] = [];
    const typeMap: Record<number, GroupedSleepStage> = {};

    for (const item of sleepData) {
        if (!typeMap[item.sleepType]) {
            typeMap[item.sleepType] = {
                sleepType: item.type,
                totalMinutes: 0,
                stageTime: []
            };
            result.push(typeMap[item.sleepType]);
        }

        typeMap[item.sleepType].stageTime.push({
            startTime: item.sleepStartTime,
            sleepLen: item.sleepLen
        });
        typeMap[item.sleepType].totalMinutes += item.sleepLen / 60;
    }

    return result;
}
}
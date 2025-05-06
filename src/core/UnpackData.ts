import { getSleetType } from "../utils/getSleetType";
import decodeTimestamp from "../utils/timestamps";

export function unpackHealthData(bArr: Uint8Array, i2: number): Record<string, any> {
    const offset = -new Date().getTimezoneOffset() * 60 * 1000;
    const result: Record<string, any> = { code: 0 };
    const dv = new DataView(bArr.buffer, bArr.byteOffset, bArr.length);

    switch (i2) {
        case 2: // Sport History
            const sportData = [];
            let index2 = 0;
            while (index2 + 14 <= bArr.length) {
                const startTimeSeconds = dv.getUint32(index2, true);
                const startTime = (startTimeSeconds + 946684800) * 1000 - offset;
                index2 += 4;
                const endTimeSeconds = dv.getUint32(index2, true);
                const endTime = (endTimeSeconds + 946684800) * 1000 - offset;
                index2 += 4;
                const step = dv.getUint16(index2, true);
                index2 += 2;
                const distance = dv.getUint16(index2, true);
                index2 += 2;
                const calorie = dv.getUint16(index2, true);
                index2 += 2;
                sportData.push({
                    sportStartTime: decodeTimestamp(startTime),
                    sportEndTime: decodeTimestamp(endTime),
                    sportStep: step,
                    sportCalorie: calorie,
                    sportDistance: distance
                });
            }
            result.dataType = 1282; // Health_HistorySport
            result.data = sportData;
            break;

        case 4: // Sleep History
            const sleepData = [];
            let index4 = 0;
            while (index4 + 20 <= bArr.length) {
                const startIndex = index4;
                index4 += 2; // Skip 2 bytes (b2, b3)
                const totalLength = dv.getUint16(index4, true);
                index4 += 2;
                const startTimeSeconds = dv.getUint32(index4, true);
                const startTime = (startTimeSeconds + 946684800) * 1000 - offset;
                index4 += 4;
                const endTimeSeconds = dv.getUint32(index4, true);
                const endTime = (endTimeSeconds + 946684800) * 1000 - offset;
                index4 += 4;
                const deepSleepCount = dv.getUint16(index4, true);
                index4 += 2;
                let lightSleepCount = 0;
                let rapidEyeMovementTotal = 0;
                let deepSleepTotal: number;
                let lightSleepTotal: number;
                if (deepSleepCount === 65535) {
                    rapidEyeMovementTotal = dv.getUint16(index4, true);
                    index4 += 2;
                    deepSleepTotal = dv.getUint16(index4, true);
                    index4 += 2;
                    lightSleepTotal = dv.getUint16(index4, true);
                    index4 += 2;
                } else {
                    lightSleepCount = dv.getUint16(index4, true);
                    index4 += 2;
                    deepSleepTotal = dv.getUint16(index4, true) * 60;
                    index4 += 2;
                    lightSleepTotal = dv.getUint16(index4, true) * 60;
                    index4 += 2;
                }
                const stages = [];
                const timestamps = new Set<string>();
                while (index4 - startIndex + 8 <= totalLength) {
                    const type = bArr[index4];
                    index4 += 1;
                    const stageTimeSeconds = dv.getUint32(index4, true);
                    const stageTime = (stageTimeSeconds + 946684800) * 1000 - offset;
                    index4 += 4;
                    const duration = (bArr[index4] & 0xFF) + ((bArr[index4 + 1] & 0xFF) << 8) + ((bArr[index4 + 2] & 0xFF) << 16);
                    index4 += 3;
                    const stageTimeStr = `${stageTime}`;
                    if (!timestamps.has(stageTimeStr)) {
                        stages.push({
                            sleepType: type,
                            type: getSleetType(type),
                            sleepStartTime: decodeTimestamp(stageTime),
                            sleepLen: duration
                        });
                        timestamps.add(stageTimeStr);
                    }
                }
                let wakeCount = 0;
                let wakeDuration = 0;
                for (const stage of stages) {
                    if (stage.sleepType === 244) { // awake
                        wakeCount++;
                        wakeDuration += stage.sleepLen;
                    }
                }
                sleepData.push({
                    startTime: decodeTimestamp(startTime),
                    endTime: decodeTimestamp(endTime),
                    deepSleepCount,
                    lightSleepCount,
                    deepSleepTotal,
                    lightSleepTotal,
                    rapidEyeMovementTotal,
                    sleepData: stages,
                    wakeCount,
                    wakeDuration
                });
            }
            result.dataType = 1284; // Health_HistorySleep
            result.data = sleepData;
            break;

        case 6: // Heart History
            const heartData = [];
            let index6 = 0;
            while (index6 + 6 <= bArr.length) {
                const b1 = bArr[index6] & 0xFF;
                index6++;
                const b2 = bArr[index6] & 0xFF;
                index6++;
                const b3 = bArr[index6] & 0xFF;
                index6++;
                const b4 = bArr[index6] & 0xFF;
                index6++;

                const timestamp = b1 + (b2 << 8) + (b3 << 16) + (b4 << 24);
                const startTime = (timestamp + 946684800) * 1000 - offset;

                index6++;
                const heartValue = bArr[index6] & 0xFF;
                index6++;
                heartData.push({
                    heartStartTime: decodeTimestamp(startTime),
                    heartValue: heartValue
                });
            }
            result.dataType = 1286;
            result.data = heartData;
            break;

        case 8: // Blood Pressure History
            const bloodData = [];
            let index8 = 0;
            while (index8 + 8 <= bArr.length) {
                const startTimeSeconds = dv.getUint32(index8, true);
                const startTime = (startTimeSeconds + 946684800) * 1000 - offset;
                index8 += 4;
                const isInflated = bArr[index8];
                index8 += 1;
                const sbp = bArr[index8];
                index8 += 1;
                const dbp = bArr[index8];
                index8 += 2; // 1 byte value + 1 padding
                bloodData.push({
                    bloodStartTime: decodeTimestamp(startTime),
                    bloodSBP: sbp & 0xFF,
                    bloodDBP: dbp & 0xFF,
                    isInflated: isInflated & 0xFF
                });
            }
            result.dataType = 1288; // Health_HistoryBlood
            result.data = bloodData;
            break;

        case 9: // Comprehensive Measurement
            const compData = [];
            let index9 = 0;
            while (index9 + 20 <= bArr.length) {
                const startTimeSeconds = dv.getUint32(index9, true);
                const startTime = (startTimeSeconds + 946684800) * 1000 - offset;
                index9 += 4;
                const stepValue = dv.getUint16(index9, true);
                index9 += 2;
                const heartValue = bArr[index9] & 0xFF;
                index9 += 1;
                const sbp = bArr[index9] & 0xFF;
                index9 += 1;
                const dbp = bArr[index9] & 0xFF;
                index9 += 1;
                const ooValue = bArr[index9] & 0xFF;
                index9 += 1;
                const respiratoryRateValue = bArr[index9] & 0xFF;
                index9 += 1;
                const hrvValue = bArr[index9] & 0xFF;
                index9 += 1;
                const cvrrValue = bArr[index9] & 0xFF;
                index9 += 1;
                const tempIntValue = bArr[index9] & 0xFF;
                index9 += 1;
                const tempFloatValue = bArr[index9] & 0xFF;
                index9 += 1;
                const bodyFatIntValue = bArr[index9] & 0xFF;
                index9 += 1;
                const bodyFatFloatValue = bArr[index9] & 0xFF;
                index9 += 1;
                const bloodSugarValue = bArr[index9] & 0xFF;
                index9 += 3;
                compData.push({
                    startTime: decodeTimestamp(startTime),
                    stepValue,
                    heartValue,
                    DBPValue: dbp,
                    SBPValue: sbp,
                    OOValue: ooValue,
                    respiratoryRateValue,
                    hrvValue,
                    cvrrValue,
                    tempIntValue,
                    tempFloatValue,
                    bodyFatIntValue,
                    bodyFatFloatValue,
                    bloodSugarValue
                });
            }
            result.dataType = 1289;
            result.data = compData;
            break;

        default:
            break;
    }
    return result;
}

export function unpackDeviceInfoData(bArr: Uint8Array): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    result["code"] = 0;

    // Header là 4 byte, payload bắt đầu từ byte thứ 4
    const payloadStart = 4;
    // Loại bỏ 2 byte CRC cuối
    const payload = bArr.slice(payloadStart, bArr.length - 2);

    if (payload.length < 8) {
        console.error("Payload quá ngắn để trích xuất dữ liệu");
        return result;
    }

    // Trích xuất thông tin từ payload
    const deviceId = (payload[0] & 0xFF) + ((payload[1] & 0xFF) << 8);
    const subVersion = payload[2] & 0xFF;
    const mainVersion = payload[3] & 0xFF;
    const batteryState = payload[4] & 0xFF;
    const batteryValue = payload[5] & 0xFF;
    const bindState = payload[6] & 0xFF;
    const syncState = payload[7] & 0xFF;

    // Tính toán deviceVersion
    const deviceVersion = subVersion < 10
        ? `${mainVersion}.0${subVersion}`
        : `${mainVersion}.${subVersion}`;

    // Tạo object chứa dữ liệu
    const data: { [key: string]: any } = {
        deviceId,
        deviceVersion,
        deviceBatteryState: batteryState,
        deviceBatteryValue: batteryValue,
        deviceMainVersion: mainVersion,
        deviceSubVersion: subVersion,
        devicetBindState: bindState,
        devicetSyncState: syncState,
    };

    result["dataType"] = 512;
    result["data"] = data;

    return result;
}

export function unpackSpo2Manual(arr: Uint8Array): number {
    if (arr.length < 5) {
        return 0;
    }

    const spo2 = arr[4];

    if (spo2 > 80) {
        return spo2;
    }

    return 0;
}

export function unpackHeartRateManual(data: Uint8Array): number {
    if (data.length < 5) {
        return 0;
    }

    const heartRate = data[4];

    if (heartRate >= 40 && heartRate <= 200) {
        return heartRate;
    }

    return 0;
}
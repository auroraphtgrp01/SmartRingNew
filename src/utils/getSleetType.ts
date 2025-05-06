import { Constants } from "../constants";

export const getSleetType = (type: number): string => {
    const sleepType = Constants.DATA_SLEEP_TYPE
    switch (type) {
        case sleepType.awake:
        return 'awake';
        case sleepType.deepSleep:
        return 'deepSleep';
        case sleepType.lightSleep:
        return 'lightSleep';
        case sleepType.naps:
        return 'naps';
        case sleepType.rem:
        return 'rem';
        default:
        return 'unknow';
    }
}
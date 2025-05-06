export class Constants {
  static DATA_SLEEP_TYPE = {
    awake: 244,
    deepSleep: 241,
    lightSleep: 242,
    naps: 245,
    rem: 243,
    unknow: -1,
  }

  static DATA_UNPACK_TYPE = {
    sportHistory: 2,
    sleepHistory: 4,
    heartHistory: 6,
    bloodPressureHistory: 8,
    comprehensiveMeasurement: 9
  }

  static UUID = {
    SERVICE_UUID: 'be940000-7333-be46-b7ae-689e71722bd5',
    COMMAND_CHARACTERISTIC_UUID: 'be940001-7333-be46-b7ae-689e71722bd5',
    DATA_CHARACTERISTIC_UUID: 'be940003-7333-be46-b7ae-689e71722bd5'
  }

  static COMMAND_BYTE = {
    // Sync Command
    INIT_HEALTH_BLOCK: new Uint8Array([0x05, 0x80, 0x07, 0x00, 0x00]),
    GET_SLEEP_HISTORY: new Uint8Array([0x05, 0x04, 0x06, 0x00]),
    GET_SPORT_HISTORY: new Uint8Array([0x05, 0x02, 0x06, 0x00, 0x43, 0xFC]),
    GET_HEART_HISTORY: new Uint8Array([0x05, 0x06, 0x06, 0x00, 0x83, 0x20]),
    GET_BLOOD_PRESSURE_HISTORY: new Uint8Array([0x05, 0x08, 0x06, 0x00, 0x82, 0x3B]),
    GET_COMPREHENSIVE_MEASUREMENT: new Uint8Array([0x05, 0x09, 0x06, 0x00, 0xB2, 0x0C]),
    // Device Info Command
    GET_DEVICE_INFO: new Uint8Array([0x02, 0x00, 0x08, 0x00, 0x47, 0x43, 0x6F, 0xEC]),
    // spo2
    SPO2_PREPARE_COMMAND: new Uint8Array([0x03, 0x09, 0x09, 0x00, 0x00, 0x00, 0x02, 0x90, 0xE9]),
    SPO2_START_COMMAND: new Uint8Array([0x03, 0x2F, 0x08, 0x00, 0x01, 0x02, 0x0D, 0x3B]),
    SPO2_STOP_COMMAND: new Uint8Array([0x03, 0x2F, 0x08, 0x00, 0x00, 0x02, 0x0D, 0x3A])
  }

  static DATA_TYPE = {
    sportHistory: 2,
    sleepHistory: 4,
    heartHistory: 6,
    bloodPressureHistory: 8,
    comprehensiveMeasurement: 9
  }
}

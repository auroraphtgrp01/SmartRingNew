import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { unpackDeviceInfoData } from '../core/UnpackData';

export class DeviceInfoService {
  private static instance: DeviceInfoService;
  public deviceInfo: {
    deviceBatteryState: number
    deviceBatteryValue: number
    deviceMainVersion: string
    deviceSubVersion: string
    deviceVersion: string
    deviceId: string
  } = {
    deviceBatteryState: 0,
    deviceBatteryValue: 0,
    deviceMainVersion: '',
    deviceSubVersion: '',
    deviceVersion: '',
    deviceId: '',
  }
  private constructor() {}
  
  public static getInstance(): DeviceInfoService {
    if (!DeviceInfoService.instance) {
      DeviceInfoService.instance = new DeviceInfoService();
    }
    return DeviceInfoService.instance;
  }
  
  /**
   * Gửi lệnh lấy thông tin thiết bị
   * @param device Thiết bị BLE đã kết nối
   * @param callback Callback nhận thông tin thiết bị
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async getDeviceInfo(device: Device, callback: (data: any | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    try {
      // Thiết lập lắng nghe thông báo từ các characteristic
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      // Chuyển đổi Uint8Array thành Buffer
      const deviceInfoCommand = Buffer.from(Constants.COMMAND_BYTE.GET_DEVICE_INFO);
      
      // Gửi lệnh lấy thông tin thiết bị
      // Lưu ý: Lệnh này không cần tính CRC vì đã có sẵn trong Constants
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        deviceInfoCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh lấy thông tin thiết bị');
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh lấy thông tin thiết bị:', error);
      callback(null);
      return false;
    }
  }
  
  /**
   * Xử lý dữ liệu từ characteristic
   * @param device Thiết bị BLE
   * @param error Lỗi (nếu có)
   * @param characteristic Characteristic nhận được
   */
  private handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
    if (error) {
      console.error('Lỗi khi nhận dữ liệu:', error);
      return;
    }
    
    // Đảm bảo có dữ liệu
    if (!characteristic || !characteristic.value) return;
    
    // Giải mã giá trị nhận được từ Base64
    const buffer = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}: ${ByteService.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói phản hồi thông tin thiết bị không (0x02xx)
      if (buffer[0] === 0x02) {
        this.parseDeviceInfo(buffer);
      }
    }
  }
  
  public getDeviceInfoLocal() {
    return this.deviceInfo;
  }

  private parseDeviceInfo(buffer: Buffer): any {
    try {
      if (!ByteService.verifyPacketCRC(buffer)) {
        console.error('CRC không hợp lệ! Bỏ qua gói dữ liệu');
        return null;
      }
      const convertToUnit8 = new Uint8Array(buffer);
      const unpackDeviceInfo = unpackDeviceInfoData(convertToUnit8)
      console.log(convertToUnit8)
      console.log("UNPACK: ", unpackDeviceInfo)
      this.deviceInfo = {
        deviceBatteryState: unpackDeviceInfo.deviceBatteryState,
        deviceBatteryValue: unpackDeviceInfo.deviceBatteryValue,
        deviceMainVersion: unpackDeviceInfo.deviceMainVersion,
        deviceSubVersion: unpackDeviceInfo.deviceSubVersion,
        deviceVersion: unpackDeviceInfo.deviceVersion,
        deviceId: unpackDeviceInfo.deviceId,
        }
    } catch (error) {
      console.error('Lỗi khi phân tích dữ liệu thông tin thiết bị:', error);
      return {
        rawData: ByteService.bufferToHexString(buffer),
        error: 'Lỗi khi phân tích dữ liệu'
      };
    }
  }
  

}

export default DeviceInfoService;

import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { unpackHeartRateManual } from '../core/UnpackData';
import BleService from '../core/BleService';

export class HeartRateService {
  private static instance: HeartRateService;
  private isMonitoring: boolean = false;
  private constructor() {}
  
  public static getInstance(): HeartRateService {
    if (!HeartRateService.instance) {
      HeartRateService.instance = new HeartRateService();
    }
    return HeartRateService.instance;
  }
  
  public async startHeartRate(device: Device, callback: (data: any | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    try {
      this.isMonitoring = true;
      this.setCallback(callback);
      
      // Đăng ký lắng nghe và lưu subscription
      this.commandSubscription = device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      // Đăng ký subscription với BleService
      BleService.getInstance().registerServiceSubscription(this.commandSubscription);
      
      this.dataSubscription = device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      // Đăng ký subscription với BleService
      BleService.getInstance().registerServiceSubscription(this.dataSubscription);
      
      const prepareCommand = Buffer.from(Constants.COMMAND_BYTE.HEART_RATE_PREPARE_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        prepareCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh chuẩn bị đo nhịp tim');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const startCommand = Buffer.from(Constants.COMMAND_BYTE.HEART_RATE_START_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        startCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh bắt đầu đo nhịp tim');
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh đo nhịp tim:', error);
      callback(null);
      return false;
    }
  }

  public async stopHeartRate(device: Device): Promise<boolean> {
    if (!device || !device.isConnected) {
      return false;
    }
    
    try {
      const stopCommand = Buffer.from(Constants.COMMAND_BYTE.HEART_RATE_STOP_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        stopCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh dừng đo nhịp tim');
      this.resetState();
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh dừng đo nhịp tim:', error);
      return false;
    }
  }

  private isCompletionNotification = (data: Uint8Array): boolean => {
    return data.length >= 4 && data[0] === 0x04 && data[1] === 0x0E;
  };

  private callback: ((data: any | null) => void) | null = null;
  private commandSubscription: any = null;
  private dataSubscription: any = null;

  public setCallback(callback: (data: any | null) => void): void {
    this.callback = callback;
  }

  private handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
    // Kiểm tra nếu thiết bị đã ngắt kết nối hoặc không còn kết nối
    if (!device || !device.isConnected || !this.isMonitoring) {
      return; // Không xử lý nếu không còn kết nối hoặc không còn đang đo
    }
    
    if (error) {
      // Kiểm tra nếu lỗi là do thiết bị ngắt kết nối
      if (error.message && error.message.includes('disconnected')) {
        // Đã được xử lý bởi sự kiện onDisconnected, không cần log lỗi
        return;
      }
      console.error('Lỗi khi nhận dữ liệu nhịp tim:', error);
      if (this.callback) this.callback(null);
      return;
    }
    
    if (!characteristic || !characteristic.value) return;
    
    const buffer = Buffer.from(characteristic.value, 'base64');
    const convertToUint8Array = new Uint8Array(buffer);
    
    if(this.isCompletionNotification(convertToUint8Array)) {
      console.log('Nhận được thông báo hoàn thành đo nhịp tim');
      return;
    }
    
    const heartRateValue = unpackHeartRateManual(convertToUint8Array);
    
    if (this.callback && heartRateValue) {
      console.log('Nhịp tim ở service', heartRateValue);
      this.callback(heartRateValue);
    }
  }
  
  /**
   * Đặt lại trạng thái của dịch vụ khi thiết bị ngắt kết nối
   */
  public resetState(): void {
    this.isMonitoring = false;
    this.callback = null;
    
    // Hủy các subscription nếu có
    try {
      if (this.commandSubscription) {
        this.commandSubscription.remove();
        this.commandSubscription = null;
      }
      
      if (this.dataSubscription) {
        this.dataSubscription.remove();
        this.dataSubscription = null;
      }
    } catch (error) {
      console.error('Lỗi khi hủy subscription trong HeartRateService:', error);
    }
  }
}

export default HeartRateService;

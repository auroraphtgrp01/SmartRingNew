import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { unpackSpo2Manual } from '../core/UnpackData';
import BleService from '../core/BleService';

export class SpO2Service {
  private static instance: SpO2Service;
  private isMonitoring: boolean = false;
  private constructor() {}
  private callback: ((data: any | null) => void) | null = null;
  private commandSubscription: any = null;
  private dataSubscription: any = null;

  public static getInstance(): SpO2Service {
    if (!SpO2Service.instance) {
      SpO2Service.instance = new SpO2Service();
    }
    return SpO2Service.instance;
  }
  
  public async startSpo2(device: Device, callback: (data: any | null) => void): Promise<boolean> {
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
      
      const prepareCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_PREPARE_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        prepareCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh chuẩn bị đo SPO2');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const startCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_START_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        startCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh bắt đầu đo SPO2');
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh đo SPO2:', error);
      callback(null);
      return false;
    }
  }

  public async stopSpo2(device: Device): Promise<boolean> {
    if (!device || !device.isConnected) {
      return false;
    }
    
    try {
      const stopCommand = Buffer.from(Constants.COMMAND_BYTE.SPO2_STOP_COMMAND);
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        stopCommand.toString('base64')
      );
      
      console.log('Đã gửi lệnh dừng đo SPO2');
      this.resetState();
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh dừng đo SPO2:', error);
      return false;
    }
  }

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
      console.error('Lỗi khi nhận dữ liệu SPO2:', error);
      if (this.callback) this.callback(null);
      return;
    }
    
    if (!characteristic || !characteristic.value) return;
    
    const buffer = Buffer.from(characteristic.value, 'base64');
    const convertToUint8Array = new Uint8Array(buffer);
    const spo2Value = unpackSpo2Manual(convertToUint8Array);
    if (this.callback && spo2Value) {
      this.callback(spo2Value);
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
      console.error('Lỗi khi hủy subscription trong SpO2Service:', error);
    }
  }
}

export default SpO2Service;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DeviceItemProps {
  device: Device;
  onPress: (device: Device) => void;
  isConnecting: boolean;
}

const DeviceItem: React.FC<DeviceItemProps> = ({ device, onPress, isConnecting }) => {
  // Hiển thị tên thiết bị hoặc "Thiết bị không xác định" nếu không có tên
  const deviceName = device.name || "Thiết bị không xác định";
  // Lấy 4 ký tự cuối của ID để hiển thị ngắn gọn
  const shortId = device.id.substring(device.id.length - 5);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(device)}
      disabled={isConnecting}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={"smartwatch" as any} size={24} color="#40A9FF" />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">
          {deviceName}
        </Text>
        <Text style={styles.deviceId}>ID: ...{shortId}</Text>
      </View>
      
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CCCCCC" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
});

export default DeviceItem; 
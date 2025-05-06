import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BleService from '../../core/BleService';

interface SpO2ScreenProps {
  onBack: () => void;
}

const SpO2Screen: React.FC<SpO2ScreenProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [spo2Value, setSpo2Value] = useState<number>(0);
  const [status, setStatus] = useState<string>('Tốt');
  const [pulseAnim] = useState(new Animated.Value(1));

  // Hiệu ứng nhịp đập cho biểu tượng oxy
  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start(() => {
      if (isLoading) {
        startPulseAnimation();
      }
    });
  };

  const measureSpo2 = async () => {
    setIsLoading(true);
    // Bắt đầu hiệu ứng nhịp đập
    startPulseAnimation();
    // Đặt lại giá trị SpO2 về 0 để hiển thị skeleton
    setSpo2Value(0);
    
    const bleService = BleService.getInstance();
    
    try {
      await bleService.startSpo2((data) => {
        setIsLoading(false);
        if (data) {
          setSpo2Value(data);
          
          // Cập nhật trạng thái dựa trên giá trị SpO2
          if (data >= 95) {
            setStatus('Tốt');
          } else if (data >= 90) {
            setStatus('Trung bình');
          } else {
            setStatus('Thấp');
          }
        } else {
        }
      });
    } catch (error) {
      console.error('Lỗi khi đo SpO2:', error);
      setIsLoading(false);
    }
  };

  // Xác định màu sắc trạng thái
  const getStatusColor = () => {
    switch (status) {
      case 'Thấp': return '#FF4D4F';
      case 'Trung bình': return '#FAAD14';
      default: return '#52C41A'; // Tốt
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nồng độ oxy trong máu</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SpO2 hiện tại</Text>
            <View style={styles.spo2Container}>
              {isLoading ? (
                <Animated.View style={{
                  transform: [{ scale: pulseAnim }]
                }}>
                  <MaterialCommunityIcons name={"water-percent" as any} size={40} color="#95DE64" />
                </Animated.View>
              ) : (
                <MaterialCommunityIcons name={"water-percent" as any} size={40} color="#95DE64" />
              )}
              {isLoading ? (
                <View style={styles.skeletonContainer}>
                  <View style={styles.skeletonValue} />
                </View>
              ) : (
                <Text style={styles.spo2Value}>{spo2Value}</Text>
              )}
              <Text style={styles.spo2Unit}>%</Text>
            </View>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Thông tin SpO2</Text>
          <Text style={styles.infoText}>
            Nồng độ oxy trong máu (SpO2) là chỉ số đo lường lượng oxy trong máu. 
            Chỉ số SpO2 bình thường nằm trong khoảng 95-100%.
          </Text>

          <View style={styles.rangeContainer}>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#52C41A' }]} />
              <Text style={styles.rangeText}>Tốt: 95-100%</Text>
            </View>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#FAAD14' }]} />
              <Text style={styles.rangeText}>Trung bình: 90-94%</Text>
            </View>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#FF4D4F' }]} />
              <Text style={styles.rangeText}>Thấp: Dưới 90%</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.measureButton}
          onPress={measureSpo2}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name={"water-percent" as any} size={24} color="white" />
              <Text style={styles.measureButtonText}>Đo SpO2</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  skeletonValue: {
    width: 80,
    height: 48,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    opacity: 0.7,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 16,
  },
  spo2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  spo2Value: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
  },
  spo2Unit: {
    fontSize: 18,
    color: '#666',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#52C41A',
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  rangeContainer: {
    marginTop: 12,
  },
  rangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  rangeText: {
    fontSize: 14,
    color: '#666',
  },
  measureButton: {
    backgroundColor: '#95DE64',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#95DE64',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  measureButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default SpO2Screen; 
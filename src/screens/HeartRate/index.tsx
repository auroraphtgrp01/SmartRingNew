import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BleService from '../../core/BleService';

interface HeartRateScreenProps {
  onBack: () => void;
}

const HeartRateScreen: React.FC<HeartRateScreenProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [status, setStatus] = useState<string>('Bình thường');
  const [pulseAnim] = useState(new Animated.Value(1));

  // Hiệu ứng nhịp đập cho biểu tượng trái tim
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

  const measureHeartRate = async () => {
    setIsLoading(true);
    // Bắt đầu hiệu ứng nhịp đập
    startPulseAnimation();
    // Đặt lại nhịp tim về 0 để hiển thị skeleton
    setHeartRate(0);
    
    const bleService = BleService.getInstance();
    
    try {
      await bleService.startHeartRate((data) => {
        console.log('Nhịp tim ở screen', data);
        if (data) {
          setHeartRate(data);
          console.log('Nhịp tim:', data);
          // Cập nhật trạng thái dựa trên nhịp tim
          if (data < 60) {
            setStatus('Thấp');
          } else if (data > 100) {
            setStatus('Cao');
          } else {
            setStatus('Bình thường');
          }
          // Dừng loading sau khi có dữ liệu
          setIsLoading(false);
        } else {
          // Nếu không nhận được dữ liệu, giữ nguyên giá trị hiện tại
        }
      });
    } catch (error) {
      console.error('Lỗi khi đo nhịp tim:', error);
      setIsLoading(false);
    }
  };

  // Xác định màu sắc trạng thái
  const getStatusColor = () => {
    switch (status) {
      case 'Thấp': return '#FAAD14';
      case 'Cao': return '#FF4D4F';
      default: return '#52C41A'; // Bình thường
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhịp tim</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nhịp tim hiện tại</Text>
            <View style={styles.heartRateContainer}>
              {isLoading ? (
                <Animated.View style={{
                  transform: [{ scale: pulseAnim }]
                }}>
                  <MaterialCommunityIcons name={"heart-pulse" as any} size={40} color="#FB6F92" />
                </Animated.View>
              ) : (
                <MaterialCommunityIcons name={"heart-pulse" as any} size={40} color="#FB6F92" />
              )}
              {isLoading ? (
                <View style={styles.skeletonContainer}>
                  <View style={styles.skeletonValue} />
                </View>
              ) : (
                <Text style={styles.heartRateValue}>{heartRate}</Text>
              )}
              <Text style={styles.heartRateUnit}>BPM</Text>
            </View>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Thông tin nhịp tim</Text>
          <Text style={styles.infoText}>
            Nhịp tim bình thường khi nghỉ ngơi từ 60 đến 100 nhịp mỗi phút.
          </Text>

          <View style={styles.rangeContainer}>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#52C41A' }]} />
              <Text style={styles.rangeText}>Bình thường: 60-100 BPM</Text>
            </View>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#FAAD14' }]} />
              <Text style={styles.rangeText}>Thấp: Dưới 60 BPM</Text>
            </View>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIndicator, { backgroundColor: '#FF4D4F' }]} />
              <Text style={styles.rangeText}>Cao: Trên 100 BPM</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.measureButton}
          onPress={measureHeartRate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name={"heart" as any} size={24} color="white" />
              <Text style={styles.measureButtonText}>Đo nhịp tim</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  heartRateValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
  },
  heartRateUnit: {
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
    backgroundColor: '#FB6F92',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#FB6F92',
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

export default HeartRateScreen; 
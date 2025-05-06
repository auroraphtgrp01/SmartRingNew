import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Animated, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BleService from '../../core/BleService';
import { useHeartHistory } from '../../contexts/HeartHistoryContext';

interface HeartRateScreenProps {
  onBack: () => void;
}

const HeartRateScreen: React.FC<HeartRateScreenProps> = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number>(0);
  const [status, setStatus] = useState<string>('Bình thường');
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Lấy dữ liệu lịch sử nhịp tim từ Context
  const { heartHistoryData } = useHeartHistory();
  
  // Hàm định dạng thời gian
  // Dữ liệu đầu vào đã được định dạng dưới dạng "hh:mm dd/mm/yyyy"
  const formatDateTime = (dateTimeStr: string): string => {
    // Trả về chuỗi thời gian nguyên bản vì nó đã được định dạng sẵn
    return dateTimeStr;
  };

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            
        <TouchableOpacity 
          style={styles.measureButton}
          onPress={measureHeartRate}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <View style={styles.measureButtonContent}>
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="white" style={styles.arrowIcon} />
                <Text style={styles.measureButtonText}>Đang đo...</Text>
              </>
            ) : (
              <>
                <View style={styles.heartIconContainer}  >
                  <MaterialCommunityIcons name={"heart" as any} size={22}color="white" />
                </View>
                <Text style={styles.measureButtonText}>Đo nhịp tim</Text>
                <MaterialCommunityIcons name={"arrow-right" as any} size={20} color="white" style={styles.arrowIcon} />
              </>
            )}
          </View>
        </TouchableOpacity>
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

        {/* Card hiển thị lịch sử nhịp tim */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleContainer}>
              <MaterialCommunityIcons name="history" size={20} color="#FB6F92" />
              <Text style={styles.historyTitle}>Lịch sử nhịp tim</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FB6F92" />
            </TouchableOpacity>
          </View>
          
          {heartHistoryData && heartHistoryData.data.length > 0 ? (
            <>
              {/* Phần hiển thị nhịp tim trung bình */}
              <View style={styles.avgCardContainer}>
                <View style={styles.avgCard}>
                  <View style={styles.avgIconContainer}>
                    <MaterialCommunityIcons name="heart-pulse" size={24} color="#FB6F92" />
                  </View>
                  <View style={styles.avgTextContainer}>
                    <Text style={styles.avgLabel}>Nhịp tim trung bình</Text>
                    <Text style={styles.avgValue}>
                      {heartHistoryData.avgHeartRate} <Text style={styles.avgUnit}>BPM</Text>
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Phần hiển thị danh sách lịch sử */}
              <View style={styles.historyListContainer}>
                <FlatList
                  data={heartHistoryData.data.slice(0, 5)} // Chỉ hiển thị 5 bản ghi gần nhất
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  renderItem={({ item, index }) => {
                    // Xác định trạng thái nhịp tim
                    let statusColor = '#52C41A'; // Màu mặc định cho trạng thái bình thường
                    let statusText = 'Bình thường';
                    
                    if (item.heartValue < 60) {
                      statusColor = '#FAAD14';
                      statusText = 'Thấp';
                    } else if (item.heartValue > 100) {
                      statusColor = '#FF4D4F';
                      statusText = 'Cao';
                    }
                    
                    return (
                      <View style={styles.historyItem}>
                        <View style={styles.historyItemLeft}>
                          <View style={[styles.historyItemIndicator, { backgroundColor: statusColor }]} />
                          <View style={styles.historyItemContent}>
                            <Text style={styles.historyValue}>{item.heartValue} <Text style={styles.historyUnit}>BPM</Text></Text>
                            <Text style={styles.historyTime}>{formatDateTime(item.heartStartTime)}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={<Text style={styles.emptyText}>Không có dữ liệu</Text>}
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="heart-off-outline" size={48} color="#E5E5E5" />
              <Text style={styles.emptyText}>Chưa có dữ liệu lịch sử</Text>
              <Text style={styles.emptySubText}>Hãy đo nhịp tim để bắt đầu theo dõi</Text>
            </View>
          )}
        </View>

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
    borderRadius: 16,
    marginTop: 20,
    width: '100%',
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#FB6F92',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
  },
  measureButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  heartIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },
  measureButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  arrowIcon: {
    position: 'absolute',
    right: 16,
    opacity: 0.7,
  },
  historyContainer: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#FB6F92',
    marginRight: 4,
  },
  avgCardContainer: {
    marginBottom: 20,
  },
  avgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF7CD',
    borderRadius: 12,
    shadowColor: '#FFDC5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  avgIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#FB6F92',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  avgTextContainer: {
    flex: 1,
  },
  avgLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  avgValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  avgUnit: {
    fontSize: 14,
    color: '#666',
  },
  historyListContainer: {
    marginTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  historyUnit: {
    fontSize: 12,
    color: '#666',
  },
  historyTime: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 12,
    color: '#BBBBBB',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HeartRateScreen; 
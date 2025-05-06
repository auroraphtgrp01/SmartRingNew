import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  onConnect: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onConnect }) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="bluetooth-off" size={80} color="#91D5FF" style={styles.icon} />
      
      <Text style={styles.title}>Chưa có thiết bị nào được kết nối</Text>
      <Text style={styles.description}>
        Kết nối với SmartRing của bạn để theo dõi sức khỏe và giấc ngủ
      </Text>
      
      <TouchableOpacity style={styles.connectButton} onPress={onConnect}>
        <MaterialCommunityIcons name="bluetooth-connect" size={24} color="white" />
        <Text style={styles.buttonText}>Kết nối thiết bị</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: '80%',
  },
  connectButton: {
    flexDirection: 'row',
    backgroundColor: '#40A9FF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#40A9FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default EmptyState; 
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, AppState, AppStateStatus } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGetSessionsQuery } from '../features/api/apiSlice';

type ScheduleStackParamList = {
  ScheduleList: undefined;
  BookingWizard: {
    startStep?: 1 | 2 | 3 | 4;
    preselectedDate?: string;
    preselectedSessionId?: string;
  } | undefined;
};

type NavigationProp = NativeStackNavigationProp<ScheduleStackParamList, 'ScheduleList'>;

const REFETCH_DEBOUNCE_MS = 1000;

export const ScheduleScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // Fetch sessions for next 14 days (default)
  const { data, isLoading, error, refetch, isFetching } = useGetSessionsQuery({});
  
  // Refs for stable callback (prevent infinite loop)
  const isFetchingRef = useRef(false);
  const lastRefetchAtRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);

  // Sync isFetching to ref (for stable callback access)
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);
  
  // Guarded refetch with debounce - STABLE callback (no isFetching in deps)
  const asyncGuardedRefetch = useCallback(async () => {
    // Guard 1: Skip if already fetching
    if (isFetchingRef.current) return;
    
    // Guard 2: Debounce check
    const now = Date.now();
    if (now - lastRefetchAtRef.current < REFETCH_DEBOUNCE_MS) return;
    
    // Update timestamp BEFORE calling refetch
    lastRefetchAtRef.current = now;
    return refetch();
  }, [refetch]);
  
  // Refetch on focus - stable callback reference
  useFocusEffect(
    useCallback(() => {
      void asyncGuardedRefetch();
      return () => {};
    }, [asyncGuardedRefetch])
  );
  
  // Refetch when app returns from background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void asyncGuardedRefetch();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [asyncGuardedRefetch]);
  
  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refetch on pull-to-refresh (bypass debounce)
      lastRefetchAtRef.current = 0;
      await asyncGuardedRefetch();
    } finally {
      setRefreshing(false);
    }
  }, [asyncGuardedRefetch]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ar-SA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ar-SA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-4">
        <Text className="text-red-500 text-center">فشل في تحميل الحصص</Text>
      </View>
    );
  }

  const sessions = data?.sessions || [];

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
        renderItem={({ item }) => {
          const isFull = item.availableSeats <= 0;
          
          return (
            <Pressable
              onPress={() => navigation.navigate('BookingWizard', { 
                startStep: 3, 
                preselectedSessionId: item.id 
              })}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            >
              <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
              
              <View className="flex-row items-center mb-2">
                <Text className="text-gray-600">
                  {formatDate(item.startsAt)} • {formatTime(item.startsAt)}
                </Text>
                <Text className="text-gray-500 ml-2">({item.durationMin} دقيقة)</Text>
              </View>

              {item.instructorName && (
                <Text className="text-gray-700 mb-1">المدربة: {item.instructorName}</Text>
              )}
              
              {item.locationName && (
                <Text className="text-gray-600 mb-2">{item.locationName}</Text>
              )}

              <View className="flex-row items-center justify-between mt-2">
                <View
                  className={`px-3 py-1 rounded-full ${
                    isFull ? 'bg-red-100' : 'bg-green-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isFull ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    {isFull ? 'مكتمل' : `${item.availableSeats} أماكن متاحة`}
                  </Text>
                </View>
                
                <Text className="text-violet-600 font-semibold">عرض التفاصيل ←</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="py-8">
            <Text className="text-center text-gray-500">لا توجد حصص متاحة</Text>
          </View>
        }
      />
      
      {/* Floating Book Now Button */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#f9fafb',
      }}>
        <Pressable
          onPress={() => navigation.navigate('BookingWizard', { startStep: 1 })}
          style={{
            backgroundColor: '#8b5cf6',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: '#8b5cf6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
            احجزي الآن
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

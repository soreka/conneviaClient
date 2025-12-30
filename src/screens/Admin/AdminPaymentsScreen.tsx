// src/screens/Admin/AdminPaymentsScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, RefreshControl, TextInput } from 'react-native';
import { CheckCircle, XCircle, Clock, User, Banknote, Building2 } from 'lucide-react-native';
import { Screen, Card, Button, Badge } from '../../components/UI';
import {
  useGetAdminPaymentSubmissionsQuery,
  useApprovePaymentSubmissionMutation,
  useRejectPaymentSubmissionMutation,
} from '../../features/api/apiSlice';

type StatusFilter = 'submitted' | 'approved' | 'rejected' | 'cancelled' | undefined;

const STATUS_LABELS: Record<string, string> = {
  submitted: 'مقدم',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
};

export const AdminPaymentsScreen = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('submitted');
  const [refreshing, setRefreshing] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetAdminPaymentSubmissionsQuery({ status: statusFilter });
  const [approvePayment, { isLoading: approving }] = useApprovePaymentSubmissionMutation();
  const [rejectPayment, { isLoading: rejecting }] = useRejectPaymentSubmissionMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleApprove = async (id: string) => {
    Alert.alert(
      'تأكيد الموافقة',
      'هل تريد الموافقة على هذا الدفع؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'موافقة',
          onPress: async () => {
            try {
              await approvePayment({ id, adminNote: adminNote || undefined }).unwrap();
              Alert.alert('تم', 'تمت الموافقة على الدفع وتفعيل الاشتراك');
              setAdminNote('');
              setSelectedSubmissionId(null);
              refetch();
            } catch (err: any) {
              Alert.alert('خطأ', err?.data?.error || 'فشل في الموافقة');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (id: string) => {
    Alert.alert(
      'تأكيد الرفض',
      'هل تريد رفض هذا الدفع؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رفض',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPayment({ id, adminNote: adminNote || undefined }).unwrap();
              Alert.alert('تم', 'تم رفض الدفع');
              setAdminNote('');
              setSelectedSubmissionId(null);
              refetch();
            } catch (err: any) {
              Alert.alert('خطأ', err?.data?.error || 'فشل في الرفض');
            }
          },
        },
      ]
    );
  };

  const submissions = data?.submissions || [];

  return (
    <Screen className="bg-background">
      <View className="flex-1">
        {/* Filter Tabs */}
        <View className="flex-row-reverse p-2 bg-card border-b border-border">
          {(['submitted', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              className={`flex-1 py-2 mx-1 rounded-lg ${statusFilter === status ? 'bg-primary' : 'bg-muted'}`}
            >
              <Text className={`text-center text-sm font-medium ${statusFilter === status ? 'text-white' : 'text-foreground'}`}>
                {STATUS_LABELS[status!]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {submissions.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-muted-foreground text-base">لا توجد طلبات</Text>
              </View>
            ) : (
              submissions.map((submission) => (
                <Card key={submission._id} className="mb-4">
                  <View className="p-4">
                    {/* Header */}
                    <View className="flex-row-reverse items-center justify-between mb-3">
                      <View className="flex-row-reverse items-center">
                        <User size={18} color="#8b5cf6" />
                        <Text className="text-base font-bold text-foreground mr-2">
                          {submission.user?.fullName || submission.user?.email || 'مستخدم غير معروف'}
                        </Text>
                      </View>
                      <Badge className={STATUS_COLORS[submission.status] || 'bg-gray-500'}>
                        <Text className="text-white text-xs">{STATUS_LABELS[submission.status] || submission.status}</Text>
                      </Badge>
                    </View>

                    {/* Plan & Method */}
                    <View className="flex-row-reverse justify-between mb-2">
                      <Text className="text-sm text-foreground">الباقة:</Text>
                      <Text className="text-sm font-medium text-foreground">
                        {submission.plan?.name || 'غير محدد'}
                      </Text>
                    </View>

                    <View className="flex-row-reverse justify-between mb-2">
                      <Text className="text-sm text-foreground">طريقة الدفع:</Text>
                      <View className="flex-row items-center">
                        {submission.method === 'cash' ? (
                          <Banknote size={16} color="#8C8C8C" />
                        ) : (
                          <Building2 size={16} color="#8C8C8C" />
                        )}
                        <Text className="text-sm font-medium text-foreground ml-1">
                          {METHOD_LABELS[submission.method] || submission.method}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row-reverse justify-between mb-2">
                      <Text className="text-sm text-foreground">السعر:</Text>
                      <Text className="text-sm font-medium text-primary">
                        {submission.plan?.price ? `${(submission.plan.price / 100).toFixed(2)} ₪` : '-'}
                      </Text>
                    </View>

                    <View className="flex-row-reverse justify-between mb-2">
                      <Text className="text-sm text-muted-foreground">تاريخ التقديم:</Text>
                      <Text className="text-sm text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleDateString('ar-EG')}
                      </Text>
                    </View>

                    {/* Proof URL */}
                    {submission.proofUrl && (
                      <View className="mt-2 p-2 bg-blue-50 rounded-lg">
                        <Text className="text-sm text-blue-800 text-right">تم إرفاق إثبات الدفع</Text>
                      </View>
                    )}

                    {/* Admin Note (for approved/rejected) */}
                    {submission.adminNote && (
                      <View className="mt-2 p-2 bg-muted rounded-lg">
                        <Text className="text-sm text-muted-foreground text-right">ملاحظة الإدارة:</Text>
                        <Text className="text-sm text-foreground text-right">{submission.adminNote}</Text>
                      </View>
                    )}

                    {/* Action Buttons (only for submitted) */}
                    {submission.status === 'submitted' && (
                      <View className="mt-4">
                        {selectedSubmissionId === submission._id ? (
                          <View>
                            <TextInput
                              placeholder="ملاحظة (اختياري)"
                              value={adminNote}
                              onChangeText={setAdminNote}
                              className="border border-border rounded-lg p-3 mb-3 text-right text-foreground"
                              placeholderTextColor="#9ca3af"
                            />
                            <View className="flex-row-reverse gap-2">
                              <Button
                                onPress={() => handleApprove(submission._id)}
                                disabled={approving}
                                className="flex-1 bg-green-600"
                              >
                                {approving ? (
                                  <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                  <View className="flex-row items-center">
                                    <CheckCircle size={16} color="#fff" />
                                    <Text className="text-white font-bold ml-1">موافقة</Text>
                                  </View>
                                )}
                              </Button>
                              <Button
                                variant="destructive"
                                onPress={() => handleReject(submission._id)}
                                disabled={rejecting}
                                className="flex-1"
                              >
                                {rejecting ? (
                                  <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                  <View className="flex-row items-center">
                                    <XCircle size={16} color="#fff" />
                                    <Text className="text-white font-bold ml-1">رفض</Text>
                                  </View>
                                )}
                              </Button>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedSubmissionId(null);
                                setAdminNote('');
                              }}
                              className="mt-2"
                            >
                              <Text className="text-center text-muted-foreground">إلغاء</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Button
                            onPress={() => setSelectedSubmissionId(submission._id)}
                            className="w-full"
                          >
                            <Text className="text-white font-bold">إجراء</Text>
                          </Button>
                        )}
                      </View>
                    )}

                    {/* Approval Details */}
                    {submission.status === 'approved' && submission.targetStartDate && (
                      <View className="mt-3 p-2 bg-green-50 rounded-lg">
                        <Text className="text-sm text-green-800 text-right">
                          الاشتراك: {new Date(submission.targetStartDate).toLocaleDateString('ar-EG')} - {new Date(submission.targetEndDate!).toLocaleDateString('ar-EG')}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
};

export default AdminPaymentsScreen;

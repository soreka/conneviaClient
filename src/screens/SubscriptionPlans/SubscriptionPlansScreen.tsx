// src/screens/SubscriptionPlans/SubscriptionPlansScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { CreditCard, AlertCircle } from 'lucide-react-native';
import {
  useGetSubscriptionPlansQuery,
  useGetMySubscriptionQuery,
  useCreatePaymentSubmissionMutation,
} from '../../features/api/apiSlice';
import { SkeletonPlans, PlanCard, PaymentMethodModal } from './components';

type PaymentMethod = 'cash' | 'bank_transfer';
type RequestedAction = 'renew' | 'upgrade_current_month' | 'upgrade_next_month' | 'downgrade_next_month';

interface Plan {
  id: string;
  name: string;
  monthlyLimit: number; // 4 or 8 sessions per month
  price: number;
  priceFormatted: string;
}

export const SubscriptionPlansScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<RequestedAction>('upgrade_next_month');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useGetSubscriptionPlansQuery();
  const { data: subscriptionData, isLoading: subLoading } = useGetMySubscriptionQuery();
  const [createPayment, { isLoading: isSubmitting }] = useCreatePaymentSubmissionMutation();

  const isLoading = plansLoading || subLoading;

  // Animation values for header
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(8);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 300 });
    headerTranslateY.value = withTiming(0, { duration: 300 });
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  // Sort plans by monthlyLimit ascending (4 sessions, then 8 sessions)
  const sortedPlans: Plan[] = [...(plansData?.plans || [])].sort(
    (a, b) => a.monthlyLimit - b.monthlyLimit
  );

  const currentSub = subscriptionData?.current;
  const currentPlan = currentSub?.plan;
  const hasPending = !!subscriptionData?.pending;

  const selectedPlan = sortedPlans.find((p) => p.id === selectedPlanId);

  // Determine plan relationship to current
  const getPlanRelation = (plan: Plan): 'same' | 'lower' | 'higher' | 'new' => {
    if (!currentPlan) return 'new';
    if (plan.id === currentPlan._id) return 'same';
    if (plan.monthlyLimit < currentPlan.monthlyLimit) return 'lower';
    return 'higher';
  };

  // Handle plan selection with appropriate action
  const handleSelectPlan = useCallback((planId: string, action: RequestedAction) => {
    if (hasPending) return; // Blocked
    setSelectedPlanId(planId);
    setSelectedAction(action);
    setShowPaymentModal(true);
  }, [hasPending]);

  // Handle same-plan renewal confirmation
  const handleRenewSamePlan = useCallback((planId: string) => {
    if (hasPending || !currentSub) return;
    
    const endDate = new Date(currentSub.endDate).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    Alert.alert(
      'تمديد الاشتراك',
      `اشتراكك الحالي ينتهي في ${endDate}. هل تريد تمديده لشهر إضافي؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'نعم، تمديد', 
          onPress: () => handleSelectPlan(planId, 'renew')
        },
      ]
    );
  }, [hasPending, currentSub, handleSelectPlan]);

  // Handle upgrade now with proration notice
  const handleUpgradeNow = useCallback((planId: string) => {
    if (hasPending || !currentSub) return;
    
    Alert.alert(
      'ترقية الآن',
      'هذا مبلغ تقديري وقد يتم تعديله بعد مراجعة الإدارة. هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'نعم، ترقية الآن', 
          onPress: () => handleSelectPlan(planId, 'upgrade_current_month')
        },
      ]
    );
  }, [hasPending, currentSub, handleSelectPlan]);

  // Handle higher plan selection - show options
  const handleHigherPlanSelection = useCallback((planId: string) => {
    if (hasPending) return;
    
    if (!currentSub) {
      // No current subscription - default to upgrade_next_month
      handleSelectPlan(planId, 'upgrade_next_month');
      return;
    }

    Alert.alert(
      'اختر موعد التفعيل',
      'متى تريد تفعيل الباقة الجديدة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'للشهر القادم', 
          onPress: () => handleSelectPlan(planId, 'upgrade_next_month')
        },
        { 
          text: 'ترقية الآن', 
          onPress: () => handleUpgradeNow(planId)
        },
      ]
    );
  }, [hasPending, currentSub, handleSelectPlan, handleUpgradeNow]);

  const handleCloseModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handleConfirmPayment = useCallback(
    async (method: PaymentMethod, proofUrl?: string) => {
      if (!selectedPlanId) return;

      try {
        await createPayment({
          planId: selectedPlanId,
          method,
          requestedAction: selectedAction,
          proofUrl,
        }).unwrap();

        setShowPaymentModal(false);
        setSelectedPlanId(null);

        const actionMessages: Record<RequestedAction, string> = {
          renew: 'تم تقديم طلب تمديد الاشتراك بنجاح.',
          upgrade_current_month: 'تم تقديم طلب الترقية الفورية بنجاح.',
          upgrade_next_month: 'تم تقديم طلب الترقية للشهر القادم بنجاح.',
          downgrade_next_month: 'تم تقديم طلب تخفيض الباقة للشهر القادم بنجاح.',
        };

        Alert.alert(
          'تم بنجاح! ✓',
          `${actionMessages[selectedAction]} سيتم مراجعته من قبل الإدارة وإشعارك عند الموافقة.`,
          [
            {
              text: 'حسناً',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } catch (err: any) {
        Alert.alert('خطأ', err?.data?.error || 'فشل في تقديم الطلب. يرجى المحاولة مرة أخرى.');
      }
    },
    [selectedPlanId, selectedAction, createPayment, navigation]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <SkeletonPlans />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={headerAnimatedStyle} className="mb-6">
          <View className="flex-row-reverse items-center justify-end mb-2">
            <Text className="text-2xl font-bold text-gray-900 mr-2">خطط الاشتراك</Text>
            <CreditCard size={28} color="#8b5cf6" />
          </View>
          <Text className="text-sm text-gray-500 text-right">
            اختر الباقة المناسبة لك واستمتع بجلسات البيلاتس
          </Text>
        </Animated.View>

        {/* Pending submission notice */}
        {hasPending && (
          <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200 flex-row-reverse items-center">
            <AlertCircle size={20} color="#ca8a04" />
            <Text className="text-sm text-yellow-800 mr-2 flex-1 text-right">
              لديك طلب قيد المراجعة. لا يمكنك تقديم طلب جديد حتى تتم معالجته.
            </Text>
          </View>
        )}

        {/* Current subscription info */}
        {currentPlan && (
          <View className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
            <Text className="text-sm text-purple-800 text-right">
              باقتك الحالية: <Text className="font-bold">{currentPlan.name}</Text> ({currentPlan.monthlyLimit} جلسات/شهر)
            </Text>
          </View>
        )}

        {/* Plans */}
        {sortedPlans.map((plan, index) => {
          const relation = getPlanRelation(plan);
          const isDisabled = hasPending;
          
          return (
            <AnimatedPlanCard
              key={plan.id}
              plan={plan}
              index={index}
              isPopular={plan.monthlyLimit === 8} // 8 sessions plan is popular
              isSelected={selectedPlanId === plan.id}
              isCurrentPlan={relation === 'same'}
              isDisabled={isDisabled}
              onSelect={() => {
                if (isDisabled) return;
                
                switch (relation) {
                  case 'same':
                    handleRenewSamePlan(plan.id);
                    break;
                  case 'lower':
                    handleSelectPlan(plan.id, 'downgrade_next_month');
                    break;
                  case 'higher':
                    handleHigherPlanSelection(plan.id);
                    break;
                  case 'new':
                    handleSelectPlan(plan.id, 'upgrade_next_month');
                    break;
                }
              }}
              actionLabel={
                relation === 'same' ? 'تمديد للشهر القادم' :
                relation === 'lower' ? 'تخفيض للشهر القادم' :
                relation === 'higher' ? 'ترقية' :
                'اختيار'
              }
            />
          );
        })}

        {/* Info text */}
        <View className="mt-4 mb-8">
          <Text className="text-xs text-gray-400 text-center">
            جميع الأسعار بالشيكل الإسرائيلي. يتم تجديد الاشتراك شهرياً.
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-1">
            يمكنك إلغاء أو تغيير اشتراكك في أي وقت.
          </Text>
        </View>
      </ScrollView>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        visible={showPaymentModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPayment}
        isLoading={isSubmitting}
        planName={selectedPlan?.name}
        planPrice={selectedPlan?.price}
        requestedAction={selectedAction}
      />
    </View>
  );
};

// Animated wrapper for PlanCard
interface AnimatedPlanCardProps {
  plan: Plan;
  index: number;
  isPopular: boolean;
  isSelected: boolean;
  isCurrentPlan?: boolean;
  isDisabled?: boolean;
  onSelect: () => void;
  actionLabel?: string;
}

const AnimatedPlanCard: React.FC<AnimatedPlanCardProps> = ({
  plan,
  index,
  isPopular,
  isSelected,
  isCurrentPlan,
  isDisabled,
  onSelect,
  actionLabel,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = (index + 1) * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlanCard
        id={plan.id}
        name={plan.name}
        monthlyLimit={plan.monthlyLimit}
        price={plan.price}
        priceFormatted={plan.priceFormatted}
        isPopular={isPopular}
        isSelected={isSelected}
        isCurrentPlan={isCurrentPlan}
        isDisabled={isDisabled}
        onSelect={onSelect}
        actionLabel={actionLabel}
      />
    </Animated.View>
  );
};

export default SubscriptionPlansScreen;

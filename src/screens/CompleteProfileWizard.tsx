import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Phone, Mail, HeartPulse, Paperclip, X, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { Screen, Card, Button, Progress } from '../components/UI';
import { AppInput } from '../components/UI/AppInput';
import { useGetMeQuery, usePatchMeFullMutation, useUploadHealthFileMutation } from '../features/api/apiSlice';
import { useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { resetToLogin } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Step = 1 | 2;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const isValidPhone = (phone: string) => {
  const normalized = phone.replace(/\s+/g, '');
  return normalized.startsWith('05') && normalized.length >= 9;
};

export const CompleteProfileWizard: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const { data: meData, refetch: refetchMe } = useGetMeQuery();
  const me = meData?.user;

  const [patchMeFull, { isLoading: isSaving }] = usePatchMeFullMutation();
  const [uploadHealthFile, { isLoading: isUploading }] = useUploadHealthFileMutation();

  const [step, setStep] = useState<Step>(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [healthCondition, setHealthCondition] = useState('');

  const [healthFileData, setHealthFileData] = useState<string | null>(null);
  const [healthFileName, setHealthFileName] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // same wizard progress logic
  const progressValue = step === 1 ? 50 : 100;

  const canSubmit = useMemo(() => {
    return !isSaving && !isUploading;
  }, [isSaving, isUploading]);

  const validateStep1 = useCallback(() => {
    const next: Record<string, string> = {};

    if (!firstName.trim()) next.firstName = 'الاسم الأول مطلوب';
    if (!lastName.trim()) next.lastName = 'اسم العائلة مطلوب';

    if (!phone.trim()) next.phone = 'رقم الهاتف مطلوب';
    else if (!isValidPhone(phone)) next.phone = 'رقم الهاتف غير صحيح';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [firstName, lastName, phone]);

  const validateStep2 = useCallback(() => {
    const next: Record<string, string> = {};

    const ageNum = Number(age);
    const weightNum = Number(weight);

    if (!age.trim()) next.age = 'العمر مطلوب';
    else if (!Number.isFinite(ageNum) || ageNum <= 0) next.age = 'العمر غير صحيح';

    if (!weight.trim()) next.weight = 'الوزن مطلوب';
    else if (!Number.isFinite(weightNum) || weightNum <= 0) next.weight = 'الوزن غير صحيح';

    if (!healthCondition.trim()) next.healthCondition = 'الحالة الصحية مطلوبة (يمكن كتابة: لا يوجد)';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [age, weight, healthCondition]);

  const handleNext = useCallback(() => {
    if (!validateStep1()) return;
    setStep(2);
  }, [validateStep1]);

  const handleBack = useCallback(() => {
    setErrors({});
    setStep(1);
  }, []);

  const handleExitToLogin = useCallback(() => {
    Alert.alert('تسجيل الخروج', 'هل تريدين العودة إلى شاشة تسجيل الدخول؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم',
        style: 'destructive',
        onPress: () => {
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - BEFORE dispatch(logout)');
          dispatch(logout());
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - AFTER dispatch(logout), calling resetToLogin');
          resetToLogin();
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - AFTER resetToLogin');
        },
      },
    ]);
  }, [dispatch, navigation]);

  const handleAttachPress = useCallback(() => {
    Alert.alert(
      'إرفاق ملف صحي',
      'حالياً يمكن إرفاق الملف بصيغة (Base64 data URL). إذا لم يتوفر لديك الآن، يمكنك المتابعة بدون ملف وإرفاقه لاحقاً.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حسناً', style: 'default' },
      ]
    );
  }, []);

  const handleRemoveFile = useCallback(() => {
    setHealthFileData(null);
    setHealthFileName(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep2()) return;

    try {
      let healthFileUrl: string | undefined;

      if (healthFileData) {
        const uploadRes = await uploadHealthFile({ fileData: healthFileData }).unwrap();
        healthFileUrl = uploadRes.healthFileUrl;
      }

      const res = await patchMeFull({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        age: Number(age),
        weight: Number(weight),
        healthCondition: healthCondition.trim(),
        ...(healthFileUrl && { healthFileUrl }),
      }).unwrap();

      if (res.user.profileCompleted) {
        Toast.show({
          type: 'success',
          text1: 'تم حفظ البيانات بنجاح',
          position: 'bottom',
        });
        // Refetch user data to update the cache, then navigate
        await refetchMe();
        navigation.navigate('CustomerTabs');
      } else {
        Toast.show({
          type: 'error',
          text1: 'لم تكتمل البيانات',
          text2: 'يرجى التأكد من تعبئة جميع الحقول المطلوبة',
          position: 'bottom',
        });
      }
    } catch (_e) {
      Toast.show({
        type: 'error',
        text1: 'حدث خطأ أثناء حفظ البيانات',
        position: 'bottom',
      });
    }
  }, [
    validateStep2,
    uploadHealthFile,
    patchMeFull,
    firstName,
    lastName,
    phone,
    age,
    weight,
    healthCondition,
    healthFileData,
    navigation,
  ]);

  // Register-style text
  const cardTitle = 'أكملي ملفك الشخصي';
  const cardDescription =
    step === 1
      ? 'بضع خطوات سريعة لتجهيز حسابك قبل الحجز'
      : 'هذه المعلومات تساعد المدربة على تخصيص التمرين لك';

  return (
    <Screen scroll safe className="bg-transparent">
      {/* Full-page gradient EXACTLY like Register design spec */}
      <LinearGradient
        colors={['#FCE8F0', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="min-h-screen flex flex-col p-5">
          {/* Header bar like Register */}
          <View className="flex-row items-center justify-between py-4">
            <Pressable
              onPress={handleExitToLogin}
              className="h-10 w-10 rounded-full bg-white items-center justify-center border border-gray-200"
            >
              <ArrowRight size={20} color="#6B7280" />
            </Pressable>

            

            <View className="w-10" />
          </View>

          {/* Card container - starts higher, with shadow */}
          <View className="flex-1 items-center pt-4">
            <View className="w-full max-w-md">
              <Card className="border-0 rounded-2xl bg-white p-4 shadow-xl">
                {/* Card header */}
                <View className="pb-4 space-y-1">
                  <Text className="text-2xl font-bold text-[#666666] text-center">
                    {cardTitle}
                  </Text>
                  <Text className="text-sm text-[#8C8C8C] text-center">
                    {cardDescription}
                  </Text>
                </View>

                {/* Progress inside card - RTL: step on right, percentage on left */}
                <View className="mb-4">
                  <View className="flex-row-reverse items-center justify-between mb-2">
                    <Text className="text-sm text-[#666666] font-medium">
                      الخطوة {step} من 2
                    </Text>
                    <Text className="text-sm text-[#8C8C8C]">{progressValue}%</Text>
                  </View>
                  <Progress value={progressValue} className="bg-gray-200" style={{ transform: [{ scaleX: -1 }] }} />
                </View>

                {/* Step content (same fields + same handlers) */}
                {step === 1 ? (
                  <View className="gap-4">
                    <Text className="text-lg font-bold text-[#666666] text-right">
                      المعلومات الأساسية
                    </Text>

                    <AppInput
                      label="الاسم الأول"
                      placeholder="مثال: سارة"
                      value={firstName}
                      onChangeText={setFirstName}
                      error={errors.firstName}
                      rightIcon={<User size={18} color="#8C8C8C" />}
                    />

                    <AppInput
                      label="اسم العائلة"
                      placeholder="مثال: أحمد"
                      value={lastName}
                      onChangeText={setLastName}
                      error={errors.lastName}
                      rightIcon={<User size={18} color="#8C8C8C" />}
                    />

                    <AppInput
                      label="رقم الهاتف"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChangeText={setPhone}
                      error={errors.phone}
                      keyboardType="phone-pad"
                      rightIcon={<Phone size={18} color="#8C8C8C" />}
                    />

                    <View className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex-row-reverse items-center">
                      <Mail size={18} color="#8C8C8C" />
                      <View className="flex-1 mr-3">
                        <Text className="text-xs text-[#8C8C8C] text-right">البريد الإلكتروني</Text>
                        <Text className="text-sm text-[#666666] text-right">
                          {me?.email || '—'}
                        </Text>
                      </View>
                    </View>

                    <Button onPress={handleNext} disabled={!canSubmit}>
                      التالي
                    </Button>
                  </View>
                ) : (
                  <View className="gap-4">
                    <Text className="text-lg font-bold text-[#666666] text-right">
                      المعلومات الصحية
                    </Text>

                    <AppInput
                      label="العمر"
                      placeholder="مثال: 28"
                      value={age}
                      onChangeText={setAge}
                      error={errors.age}
                      keyboardType="number-pad"
                      rightIcon={<HeartPulse size={18} color="#8C8C8C" />}
                    />

                    <AppInput
                      label="الوزن"
                      placeholder="مثال: 62"
                      value={weight}
                      onChangeText={setWeight}
                      error={errors.weight}
                      keyboardType="number-pad"
                      rightIcon={<HeartPulse size={18} color="#8C8C8C" />}
                    />

                    <AppInput
                      label="الحالة الصحية"
                      placeholder="اكتبي حالتك الصحية أو اذكري: لا يوجد"
                      value={healthCondition}
                      onChangeText={setHealthCondition}
                      error={errors.healthCondition}
                      multiline
                      inputClassName="min-h-[96px]"
                      rightIcon={<HeartPulse size={18} color="#8C8C8C" />}
                    />

                    <View className="gap-2">
                      <TouchableOpacity
                        onPress={handleAttachPress}
                        activeOpacity={0.8}
                        className="border border-gray-200 rounded-xl py-3 px-4 flex-row-reverse items-center justify-between bg-white"
                      >
                        <View className="flex-row-reverse items-center">
                          <Paperclip size={18} color="#8C8C8C" />
                          <Text className="text-sm text-[#666666] mr-2">
                            إرفاق ملف صحي (اختياري)
                          </Text>
                        </View>
                        {isUploading ? (
                          <ActivityIndicator size="small" color="#A68CD4" />
                        ) : null}
                      </TouchableOpacity>

                      <Text className="text-xs text-[#8C8C8C] text-right">
                        يمكنكِ إرفاق الملف لاحقًا من الملف الشخصي
                      </Text>

                      <AppInput
                        label="ملف صحي (Base64) - اختياري"
                        placeholder="data:application/pdf;base64,..."
                        value={healthFileData || ''}
                        onChangeText={(t) => {
                          setHealthFileData(t || null);
                          setHealthFileName(t ? 'health-file' : null);
                        }}
                        rightIcon={<Paperclip size={18} color="#8C8C8C" />}
                      />

                      {healthFileName && (
                        <View className="flex-row-reverse items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                          <Text className="text-sm text-[#666666] text-right flex-1">
                            {healthFileName}
                          </Text>
                          <TouchableOpacity onPress={handleRemoveFile} className="p-1" activeOpacity={0.7}>
                            <X size={16} color="#8C8C8C" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button variant="outline" onPress={handleBack} disabled={!canSubmit}>
                          رجوع
                        </Button>
                      </View>
                      <View className="flex-1">
                        <Button onPress={handleSubmit} loading={isSaving || isUploading} disabled={!canSubmit}>
                          حفظ وإنهاء
                        </Button>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Screen>
  );
};

export default CompleteProfileWizard;

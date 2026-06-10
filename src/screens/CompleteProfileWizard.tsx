import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Alert, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Phone, Mail, HeartPulse, ArrowRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { Screen, Card, Button, Progress } from '../components/UI';
import { AppInput } from '../components/UI/AppInput';
import { useGetMeQuery, usePatchMeFullMutation } from '../features/api/apiSlice';
import { useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';
import { resetToLogin } from '../navigation/navigationRef';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../constants/legal';
import { openExternalUrl } from '../utils/openExternalUrl';
import { setAccessToken, setRefreshToken } from '../api';

type Step = 1 | 2;

const isValidPhone = (phone: string) => {
  // Audit 2026-06-10 finding #15: align with the server (`/^05\d{8}$/`) and
  // real IL mobile shape. Strip all non-digits first so "05X XXXX XXX" or
  // "+972-50-..." (after country-code trim) still validates cleanly when
  // typed naturally; reject any leftover non-digit cruft.
  const digitsOnly = phone.replace(/\D/g, '');
  return /^05\d{8}$/.test(digitsOnly);
};

export const CompleteProfileWizard: React.FC = () => {
  const dispatch = useAppDispatch();

  const { data: meData, refetch: refetchMe } = useGetMeQuery();
  const me = meData?.user;

  const [patchMeFull, { isLoading: isSaving }] = usePatchMeFullMutation();

  const [step, setStep] = useState<Step>(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [healthCondition, setHealthCondition] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // same wizard progress logic
  const progressValue = step === 1 ? 50 : 100;

  const canSubmit = useMemo(() => {
    return !isSaving;
  }, [isSaving]);

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
        onPress: async () => {
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - BEFORE dispatch(logout)');
          dispatch(logout());
          // Audit 2026-06-10 finding #23: AWAIT the SecureStore token clears
          // BEFORE navigating back to Login. The earlier fire-and-forget
          // pattern allowed a force-quit race where the next cold start
          // could re-auth a userless session against a still-persisted
          // access/refresh token.
          try {
            await setAccessToken(null);
            await setRefreshToken(null);
          } catch (e) {
            if (__DEV__) console.warn('[Logout] CompleteProfileWizard - token clear failed', e);
          }
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - tokens cleared, calling resetToLogin');
          resetToLogin();
          if (__DEV__) console.log('[Logout] CompleteProfileWizard - AFTER resetToLogin');
        },
      },
    ]);
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep2()) return;

    try {
      const res = await patchMeFull({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        age: Number(age),
        weight: Number(weight),
        healthCondition: healthCondition.trim(),
      }).unwrap();

      if (res.user.profileCompleted) {
        Toast.show({
          type: 'success',
          text1: 'تم حفظ البيانات بنجاح',
          position: 'bottom',
        });
        // Refetch /v1/me so the RTK Query cache flips profileCompleted -> true.
        // RootNavigator renders screens conditionally on that flag, so it swaps
        // CompleteProfileWizard -> CustomerTabs automatically. Do NOT navigate
        // manually: at this point the navigator only has the wizard screen
        // mounted, so navigate('CustomerTabs') is unhandled (RN warns) and is
        // redundant with the conditional rendering.
        await refetchMe();
      } else {
        Toast.show({
          type: 'error',
          text1: 'لم تكتمل البيانات',
          text2: 'يرجى التأكد من تعبئة جميع الحقول المطلوبة',
          position: 'bottom',
        });
      }
    } catch (e) {
      // Audit 2026-06-10 finding #8: don't blindly swallow the error. RTK
      // Query rejects with a FetchBaseQueryError shaped { status, data }.
      // The server's central Zod handler returns
      // { error: 'Validation failed', code: 'VALIDATION_ERROR', details }
      // on a 400 — surface that to the user with an actionable Arabic prompt
      // so a validation rejection doesn't permanently strand the wizard.
      // Other causes (network/5xx/timeout) keep a generic Arabic message.
      const status = (e as { status?: number | string } | undefined)?.status;
      const code = (e as { data?: { code?: string } } | undefined)?.data?.code;

      if (__DEV__) {
        console.warn('[CompleteProfileWizard] patchMeFull failed', { status, code });
      }

      if (status === 400 || code === 'VALIDATION_ERROR') {
        Toast.show({
          type: 'error',
          text1: 'بعض الحقول غير صحيحة',
          text2: 'يرجى التأكد من صحة الاسم والهاتف والعمر والوزن ثم المحاولة مرة أخرى',
          position: 'bottom',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'حدث خطأ أثناء حفظ البيانات',
          text2: 'يرجى المحاولة مرة أخرى',
          position: 'bottom',
        });
      }
    }
  }, [
    validateStep2,
    patchMeFull,
    firstName,
    lastName,
    phone,
    age,
    weight,
    healthCondition,
    refetchMe,
  ]);

  // Register-style text
  const cardTitle = 'أكملي ملفك الشخصي';
  const cardDescription =
    step === 1
      ? 'بضع خطوات سريعة لتجهيز حسابك قبل الحجز'
      : 'هذه المعلومات تساعد المدربة على تخصيص التمرين لك';

  return (
    // C-UX-06: KeyboardAvoidingView is the TOP-LEVEL wrapper so it actually
    // pushes the scroll surface (rendered by the Screen `scroll` variant)
    // against the keyboard. Nesting the KAV inside the ScrollView (the
    // previous shape) made it a no-op. We also drop the web-only Tailwind
    // viewport-height class (NativeWind does not translate it) and forward
    // `keyboardShouldPersistTaps="handled"` so taps on the submit button
    // aren't swallowed while the keyboard is open.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen scroll safe className="bg-transparent" keyboardShouldPersistTaps="handled">
      {/* Full-page gradient EXACTLY like Register design spec */}
      <LinearGradient
        colors={['#FCE8F0', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="flex flex-col p-5">
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

          {/* Card container - starts higher, with shadow.
              NOTE: deliberately NO `flex-1` here. This subtree lives inside the
              Screen's ScrollView (contentContainerStyle flexGrow:1). A `flex-1`
              child inside a scroll container has no bounded height to fill, so it
              collapsed to 0 and clipped the card's title/inputs on (re)mount
              (visible as overlapping fields + missing text). Let the card flow at
              its natural content height; the LinearGradient still fills the
              viewport behind it. */}
          <View className="items-center pt-4">
            <View className="w-full max-w-md">
              <Card className="border-0 rounded-2xl bg-white p-4 shadow-xl">
                {/* Card header */}
                {/* `space-y-*` does not translate in NativeWind 4 (per repo
                    CLAUDE.md); use an explicit margin on the description. */}
                <View className="pb-4">
                  <Text className="text-2xl font-bold text-[#666666] text-center">
                    {cardTitle}
                  </Text>
                  <Text className="text-sm text-[#8C8C8C] text-center mt-1">
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

                    {/* C-STORE-03: consent line referencing Privacy + Terms at
                        the point of health-data collection (Apple 5.1.1 /
                        Play Data Safety). The two links are tappable and
                        open the hosted policy documents. */}
                    <View className="flex-row-reverse flex-wrap items-center justify-center">
                      <Text className="text-xs text-[#8C8C8C]">
                        بالمتابعة فإنكِ توافقين على{' '}
                      </Text>
                      <Pressable
                        onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}
                        hitSlop={8}
                      >
                        <Text className="text-xs text-[#A68CD4] underline">
                          سياسة الخصوصية
                        </Text>
                      </Pressable>
                      <Text className="text-xs text-[#8C8C8C]"> و </Text>
                      <Pressable
                        onPress={() => openExternalUrl(TERMS_URL)}
                        hitSlop={8}
                      >
                        <Text className="text-xs text-[#A68CD4] underline">
                          الشروط والأحكام
                        </Text>
                      </Pressable>
                    </View>

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Button variant="outline" onPress={handleBack} disabled={!canSubmit}>
                          رجوع
                        </Button>
                      </View>
                      <View className="flex-1">
                        <Button onPress={handleSubmit} loading={isSaving} disabled={!canSubmit}>
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
    </KeyboardAvoidingView>
  );
};

export default CompleteProfileWizard;

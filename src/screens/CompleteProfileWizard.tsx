import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Phone, Mail, HeartPulse, Paperclip, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { Screen, Card, Button, Progress } from '../components/UI';
import { AppInput } from '../components/UI/AppInput';
import { useGetMeQuery, usePatchMeMutation, useUploadHealthFileMutation } from '../features/api/apiSlice';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Step = 1 | 2;

type Nav = NativeStackNavigationProp<RootStackParamList>;

const isValidPhone = (phone: string) => {
  const normalized = phone.replace(/\s+/g, '');
  return normalized.startsWith('05') && normalized.length >= 9;
};

export const CompleteProfileWizard: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const { data: meData } = useGetMeQuery();
  const me = meData?.user;

  const [patchMe, { isLoading: isSaving }] = usePatchMeMutation();
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

  const handleAttachPress = useCallback(() => {
    Alert.alert(
      'إرفاق ملف صحي',
      'حالياً يمكن إرفاق الملف بصيغة (Base64 data URL). إذا لم يتوفر لديك الآن، يمكنك المتابعة بدون ملف وإرفاقه لاحقاً.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حسناً',
          style: 'default',
        },
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

      const res = await patchMe({
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
        navigation.reset({
          index: 0,
          routes: [{ name: 'CustomerTabs' }],
        });
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
    patchMe,
    firstName,
    lastName,
    phone,
    age,
    weight,
    healthCondition,
    healthFileData,
    navigation,
  ]);

  return (
    <Screen scroll safe className="bg-background">
      <LinearGradient
        colors={['#A68CD4', 'rgba(166, 140, 212, 0.8)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        <View className="px-5 pt-6 pb-6">
          <Text className="text-white text-2xl font-bold text-right">إكمال الملف الشخصي</Text>
          <Text className="text-white/90 text-sm text-right mt-1">
            الخطوة {step} من 2
          </Text>
          <View className="mt-4">
            <Progress value={progressValue} className="bg-white/30" />
          </View>
        </View>
      </LinearGradient>

      <View className="px-5 -mt-4 pb-8">
        <Card className="p-4 border border-primary/20">
          {step === 1 ? (
            <View className="gap-4">
              <Text className="text-lg font-bold text-foreground text-right">المعلومات الأساسية</Text>

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
                <Mail size={18} color="#6B7280" />
                <View className="flex-1 mr-3">
                  <Text className="text-xs text-gray-500 text-right">البريد الإلكتروني</Text>
                  <Text className="text-sm text-gray-900 text-right">{me?.email || '—'}</Text>
                </View>
              </View>

              <Button onPress={handleNext} disabled={!canSubmit}>
                التالي
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <Text className="text-lg font-bold text-foreground text-right">المعلومات الصحية</Text>

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
                  className="border border-input rounded-xl py-3 px-4 flex-row-reverse items-center justify-between"
                >
                  <View className="flex-row-reverse items-center">
                    <Paperclip size={18} color="#6B7280" />
                    <Text className="text-sm text-foreground mr-2">إرفاق ملف صحي (اختياري)</Text>
                  </View>
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#A68CD4" />
                  ) : null}
                </TouchableOpacity>

                <Text className="text-xs text-muted-foreground text-right">
                  يمكنكِ إرفاق الملف لاحقًا من الملف الشخصي
                </Text>

                {/* Temporary advanced input: paste base64 */}
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
                    <Text className="text-sm text-gray-700 text-right flex-1">{healthFileName}</Text>
                    <TouchableOpacity onPress={handleRemoveFile} className="p-1" activeOpacity={0.7}>
                      <X size={16} color="#6B7280" />
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
    </Screen>
  );
};

export default CompleteProfileWizard;

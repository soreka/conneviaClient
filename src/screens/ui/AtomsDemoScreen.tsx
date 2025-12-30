import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Mail, Lock, User } from 'lucide-react-native';
import {
  Screen,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  AppInput,
  Badge,
  Divider,
} from '../../components/UI';

export const AtomsDemoScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Screen scroll padding>
      <Text className="text-2xl font-bold text-foreground mb-6 text-right">
        مجموعة عناصر التصميم
      </Text>

      {/* Buttons Section */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          الأزرار - Button Variants
        </Text>
        <View className="gap-3">
          <Button onPress={() => console.log('Default')}>
            زر افتراضي
          </Button>
          <Button variant="destructive" onPress={() => console.log('Destructive')}>
            زر حذف
          </Button>
          <Button variant="outline" onPress={() => console.log('Outline')}>
            زر محدد
          </Button>
          <Button variant="secondary" onPress={() => console.log('Secondary')}>
            زر ثانوي
          </Button>
          <Button variant="ghost" onPress={() => console.log('Ghost')}>
            زر شفاف
          </Button>
          <Button variant="link" onPress={() => console.log('Link')}>
            رابط
          </Button>
        </View>
      </View>

      <Divider className="my-6" />

      {/* Button Sizes */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          أحجام الأزرار - Button Sizes
        </Text>
        <View className="gap-3">
          <Button size="sm">صغير</Button>
          <Button size="default">افتراضي</Button>
          <Button size="lg">كبير</Button>
          <View className="flex-row gap-3">
            <Button size="icon">
              <User size={20} color="#FFFFFF" />
            </Button>
            <Button size="icon" variant="outline">
              <Mail size={20} color="#A68CD4" />
            </Button>
          </View>
        </View>
      </View>

      <Divider className="my-6" />

      {/* Button with Icons and Loading */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          أزرار مع أيقونات وتحميل
        </Text>
        <View className="gap-3">
          <Button
            leftIcon={<Mail size={20} color="#FFFFFF" />}
            onPress={() => console.log('With icon')}
          >
            مع أيقونة يسار
          </Button>
          <Button
            rightIcon={<User size={20} color="#FFFFFF" />}
            onPress={() => console.log('With icon')}
          >
            مع أيقونة يمين
          </Button>
          <Button loading={loading} onPress={handleLoadingDemo}>
            {loading ? 'جاري التحميل...' : 'اضغط للتحميل'}
          </Button>
        </View>
      </View>

      <Divider className="my-6" />

      {/* Card Example */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          البطاقة - Card
        </Text>
        <Card>
          <CardHeader>
            <CardTitle>عنوان البطاقة</CardTitle>
            <CardDescription>وصف البطاقة يظهر هنا</CardDescription>
          </CardHeader>
          <CardContent>
            <Text className="text-foreground text-right">
              محتوى البطاقة. يمكن أن يحتوي على أي عناصر React Native.
            </Text>
          </CardContent>
          <CardFooter>
            <Button size="sm" className="flex-1">
              إجراء
            </Button>
          </CardFooter>
        </Card>
      </View>

      <Divider className="my-6" />

      {/* Input States */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          حقول الإدخال - Input States
        </Text>
        <View className="gap-4">
          <AppInput 
            label="البريد الإلكتروني"
            placeholder="أدخل بريدك الإلكتروني"
            leftIcon={<Mail size={20} color="#8C8C8C" />}
          />
          
          <AppInput
            label="كلمة المرور"
            placeholder="أدخل كلمة المرور"
            isPassword
            leftIcon={<Lock size={20} color="#8C8C8C" />}
          />
          
          <AppInput
            label="مع تلميح"
            placeholder="اكتب شيئاً"
            hint="هذا تلميح مفيد"
          />
          
          <AppInput
            label="مع خطأ"
            placeholder="اكتب شيئاً"
            error="هذا الحقل مطلوب"
            defaultValue="قيمة خاطئة"
          />
          
          <AppInput
            label="مع أيقونة يمين"
            placeholder="ابحث..."
            rightIcon={<User size={20} color="#8C8C8C" />}
          />
        </View>
      </View>

      <Divider className="my-6" />

      {/* Badge Variants */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          الشارات - Badges
        </Text>
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            <Badge>افتراضي</Badge>
            <Badge variant="secondary">ثانوي</Badge>
            <Badge variant="outline">محدد</Badge>
            <Badge variant="destructive">حذف</Badge>
            <Badge variant="success">نجاح</Badge>
            <Badge variant="warning">تحذير</Badge>
          </View>
        </View>
      </View>

      <Divider className="my-6" />

      {/* Color Palette Display */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3 text-right">
          لوحة الألوان - Color Palette
        </Text>
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-primary" />
            <Text className="text-foreground">Primary</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-secondary" />
            <Text className="text-foreground">Secondary</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-accent" />
            <Text className="text-foreground">Accent</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-muted" />
            <Text className="text-foreground">Muted</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-destructive" />
            <Text className="text-foreground">Destructive</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-success" />
            <Text className="text-foreground">Success</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-12 h-12 rounded-lg bg-warning" />
            <Text className="text-foreground">Warning</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
};

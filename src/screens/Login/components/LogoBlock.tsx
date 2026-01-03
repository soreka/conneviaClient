import React from 'react';
import { View, Text, Image } from 'react-native';

const logo = require('../../../assets/3logo.png');

export const LogoBlock: React.FC = () => {
  return (
    <View className="items-center pt-4 pb-4 w-full mt-10">
      
      <View className=" justify-center items-center w-full ">
        <Image 
          source={logo} 
          
            className="w-48 h-48 "
            resizeMode="cover"
        />
      </View>
      <Text className="text-3xl font-arabic  font-bold text-[#666666] text-center mb-1">
        نادي البيلاتس
      </Text>
      <Text className="text-m text-[#8C8C8C] text-center">
        رحلتك نحو صحة أفضل تبدأ هنا
      </Text>
    </View>
  );
};

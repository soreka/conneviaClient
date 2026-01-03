import React from 'react';
import { View, Image } from 'react-native';

const heroImage = require('../../../assets/pilates-hero.jpg');

export const HeroCard: React.FC = () => {
  return (
    <View className="w-full mb-4">
      <Image 
        source={heroImage} 
        className="w-full h-48 rounded-2xl"
        resizeMode="cover"
      />
    </View>
  );
};

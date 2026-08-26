import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, Users } from 'lucide-react-native';
import { Card, Badge, Button, Progress } from '../../components/UI';
import { formatTime, getEndTime } from '../../utils/dates';
import { isSessionInPast, getPastSessionLabel } from '../../utils/sessionTime';

interface Session {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  instructorName?: string;
  locationName?: string;
  status: string;
}

interface SessionCardProps {
  session: Session;
  onPress: () => void;
  onBookPress: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onPress,
  onBookPress,
}) => {
  const availableSeats = session.availableSeats ?? (session.capacity - session.bookedCount);
  const isFull = availableSeats <= 0;
  // A session that already started is never reservable — render it like the
  // admin screen does: "ended" badge, card press disabled, no book button.
  const isPast = isSessionInPast(session.startsAt);
  const startTime = formatTime(session.startsAt);
  const endTime = getEndTime(session.startsAt, session.durationMin);
  const timeRange = `${startTime} - ${endTime}`;

  const bookedCount = session.capacity - availableSeats;
  const occupancyPercent = session.capacity > 0
    ? (bookedCount / session.capacity) * 100
    : 0;

  const getProgressVariant = (): 'success' | 'warning' | 'destructive' => {
    if (isFull) return 'destructive';
    const availableRatio = availableSeats / session.capacity;
    if (availableRatio <= 0.5) return 'warning';
    return 'success';
  };

  const availabilityText = isFull
    ? 'لا توجد أماكن متاحة'
    : `${availableSeats} من ${session.capacity} متاح`;

  const fractionText = `${availableSeats}/${session.capacity}`;

  const handleCardPress = () => {
    if (!isFull && !isPast) {
      onPress();
    }
  };

  const handleBookPress = () => {
    onBookPress();
  };

  return (
    <Card className="mx-4 mb-3">
      <Pressable
        onPress={handleCardPress}
        disabled={isFull || isPast}
        className="p-4"
        style={isPast ? { opacity: 0.55 } : undefined}
      >
        <View className="flex-row-reverse items-center justify-between mb-3">
          <View className="flex-row-reverse items-center">
            <Clock size={16} color="#8C8C8C" />
            <Text className="text-base font-semibold text-foreground mr-2">
              {timeRange}
            </Text>
          </View>
          <Badge variant={isPast ? 'secondary' : isFull ? 'destructive' : 'success'}>
            {isPast ? getPastSessionLabel() : isFull ? 'ممتلئ' : 'متاح'}
          </Badge>
        </View>

        <Text className="text-lg font-bold text-foreground text-right mb-1">
          {session.title}
        </Text>

        <Text className="text-sm text-muted-foreground text-right mb-3">
          {session.instructorName || 'المدربة'}
        </Text>

        <View className="flex-row-reverse items-center justify-between mb-3">
          <View className="flex-row-reverse items-center">
            <Users size={16} color="#8C8C8C" />
            <Text className="text-sm text-muted-foreground mr-2">
              {availabilityText}
            </Text>
          </View>
          <Text className="text-sm font-medium text-foreground">
            {fractionText}
          </Text>
        </View>

        <View className="mb-4">
          <Progress
            value={occupancyPercent}
            variant={getProgressVariant()}
          />
        </View>

        {!isFull && !isPast && (
          <Button
            onPress={handleBookPress}
            className="w-full"
          >
            احجزي الآن
          </Button>
        )}
      </Pressable>
    </Card>
  );
};

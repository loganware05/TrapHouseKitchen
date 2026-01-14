import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold mb-4">TrapHouseKitchen v2</Text>
      <Link href="/(auth)/login" className="text-blue-500 py-2">Chef Login</Link>
      <Link href="/menu" className="text-blue-500 py-2">View Menu</Link>
      <StatusBar style="auto" />
    </View>
  );
}


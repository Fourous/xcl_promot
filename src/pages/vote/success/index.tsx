import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { CircleCheck } from 'lucide-react-taro';
import { Button } from '@/components/ui/button';
import { clearSelection } from '@/utils/selection';

/** 投票成功页 */
export default function VoteSuccess() {
  return (
    <View className="flex flex-col items-center justify-center min-h-screen px-8 bg-white">
      <CircleCheck size={96} color="#C80018" />
      <Text className="block text-2xl font-bold text-gray-900 mt-8">投票成功</Text>
      <Text className="block text-sm text-gray-500 mt-4 text-center leading-7">
        感谢您参与本次评选投票。
        {'\n'}您的每一票都是对奋斗者的肯定与鼓励。
      </Text>
      <Button
        className="w-full max-w-xs mt-12"
        onClick={() => {
          clearSelection();
          Taro.reLaunch({ url: '/pages/index/index' });
        }}
      >
        返回首页
      </Button>
    </View>
  );
}

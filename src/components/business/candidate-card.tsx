import { View, Text } from '@tarojs/components';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Candidate } from '@/services/vote';

interface CandidateCardProps {
  candidate: Candidate;
  /** 选中序号，0 表示未选中，>0 表示选中序号 */
  selectedIndex: number;
  onToggle: (id: string) => void;
}

/**
 * 候选人卡片：头像 + 姓名 + 编号 + 部门 + 岗位
 * 选中态：红色边框 + 右上角序号角标
 */
const CandidateCard = ({ candidate, selectedIndex, onToggle }: CandidateCardProps) => {
  const selected = selectedIndex > 0;

  return (
    <View
      className={`relative w-[48%] mb-3 rounded-lg border bg-white p-3 ${
        selected ? 'border-primary' : 'border-border'
      }`}
      onClick={() => onToggle(candidate.id)}
    >
      {/* 选中序号角标 */}
      {selected && (
        <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Text className="text-white text-xs font-semibold">{selectedIndex}</Text>
        </View>
      )}

      <View className="flex items-center gap-2">
        <Avatar className="h-12 w-12 rounded-md">
          <AvatarImage src={candidate.avatar_url || ''} />
          <AvatarFallback className="rounded-md bg-[#F7F7F5] text-foreground text-base font-semibold">
            {candidate.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <View className="flex-1 min-w-0">
          <Text className="block text-sm font-semibold text-foreground truncate">
            {candidate.name}
          </Text>
          <Text className="block text-xs text-muted-foreground mt-1 tabular-nums">
            {candidate.code}
          </Text>
        </View>
      </View>

      <Text className="block text-xs text-foreground mt-2 truncate">{candidate.department}</Text>
      <Text className="block text-xs text-muted-foreground mt-1 truncate">
        {candidate.position || '—'}
      </Text>
    </View>
  );
};

export default CandidateCard;

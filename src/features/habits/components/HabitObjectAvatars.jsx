import { useQuery } from '@tanstack/react-query';
import { socialService } from '../../../services/socialService';
import { useAuth } from '../../../context/AuthProvider';
import { CupAvatarFx } from '../../water/components/CupAvatarFx';

/**
 * Hai avatar ở góc thẻ, giống thẻ cốc nước:
 * - trái: bạn (nghiêng vào tác động khi vừa ghi / được cộng → vật thể sáng lên),
 * - phải: partner (đập vào khi từ chối → vật thể rớt ra và tối đi).
 */
export function HabitObjectAvatars({ pour = 0, approve = 0, spill = 0, color = '#c07a72', left, right }) {
  const { user } = useAuth();
  const { data: partner } = useQuery({
    queryKey: ['my-partner'],
    queryFn: async () => (await socialService.getMyPartner()).data,
    staleTime: 60_000,
    // Trang partner tự truyền 2 avatar nên không cần hỏi partner của mình.
    enabled: !left || !right,
  });

  const leftAvatar = left ?? { avatarUrl: user?.avatarUrl, name: 'Bạn' };
  // `right === null` = không hiện avatar bên phải.
  const rightAvatar = right === undefined ? (partner ? { avatarUrl: partner.avatarUrl, name: partner.fullName } : null) : right;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between">
      <CupAvatarFx
        action="pour"
        avatarUrl={leftAvatar.avatarUrl}
        name={leftAvatar.name}
        side="left"
        signal={pour}
        color={color}
      />
      {rightAvatar && (
        <CupAvatarFx
          // Partner tác động: duyệt thì "rót sáng", từ chối thì "đập" cho vật thể rơi ra.
          action={approve > spill ? 'pour' : 'hit'}
          avatarUrl={rightAvatar.avatarUrl}
          name={rightAvatar.name}
          side="right"
          signal={approve > spill ? approve : spill}
          color={approve > spill ? '#16a34a' : '#f43f5e'}
        />
      )}
    </div>
  );
}

export default HabitObjectAvatars;

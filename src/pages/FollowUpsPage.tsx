import { Routes, Route } from 'react-router-dom';
import { FollowUpsScreen } from '@/components/followups/FollowUpsScreen';
import { AddFirstTimerScreen } from '@/components/followups/AddFirstTimerScreen';

export function FollowUpsPage() {
  return (
    <Routes>
      <Route index element={<FollowUpsScreen />} />
      <Route path="add" element={<AddFirstTimerScreen />} />
    </Routes>
  );
}

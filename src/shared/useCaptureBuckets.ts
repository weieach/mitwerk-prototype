import { useSyncExternalStore } from 'react';
import { captureBucketStore } from './capture-buckets';
export function useCaptureBuckets() {
  return useSyncExternalStore(captureBucketStore.subscribe, captureBucketStore.getSnapshot, captureBucketStore.getSnapshot);
}

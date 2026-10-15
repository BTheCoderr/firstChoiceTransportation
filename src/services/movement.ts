import { supabase } from "@/lib/supabase";
import type { PointLike } from "@/utils/movement";

/**
 * Status, first movement and anomaly flags are server-owned.
 * GPS must be saved first; the RPC independently checks the authenticated
 * driver, their open shift and recent persisted route points.
 */
export async function processMovementUpdate(
  shiftId: string,
  _currentPoint: PointLike & { recorded_at: string }
): Promise<void> {
  const { error } = await supabase.rpc("refresh_driver_shift_activity", {
    p_shift_id: shiftId,
  });
  if (error) {
    // The route point upload succeeded even if status refresh is unavailable.
    // Let the background task record an actionable tracking warning rather
    // than silently falling back to untrusted direct payroll-table writes.
    throw new Error("SERVER_MOVEMENT_REFRESH_UNAVAILABLE");
  }
}

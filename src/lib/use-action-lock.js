import { useRef, useState } from "react";
import { toast } from "sonner";
export function useActionLock() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const run = async (action) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    try {
      await action();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not complete this action. Please try again.",
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return { pending, run };
}

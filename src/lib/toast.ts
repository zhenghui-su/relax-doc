export type ToastVariant = "info" | "success" | "error";

export type ToastPayload = {
  message: string;
  variant?: ToastVariant;
};

export function showToast({ message, variant = "info" }: ToastPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: {
        message,
        variant,
      } satisfies ToastPayload,
    }),
  );
}

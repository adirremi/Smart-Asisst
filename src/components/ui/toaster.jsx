import React from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastAction,
  ToastViewport,
} from "@/components/ui/toast";

function renderToastAction(action) {
  if (!action) return null;
  if (React.isValidElement(action)) return action;
  if (typeof action === 'object' && action.label) {
    return (
      <ToastAction altText={action.label} onClick={action.onClick}>
        {action.label}
      </ToastAction>
    );
  }
  return null;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>
                  {typeof description === 'string' ? description : String(description)}
                </ToastDescription>
              )}
            </div>
            {renderToastAction(action)}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
} 
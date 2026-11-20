import { useEffect, useId, useRef, type ReactNode } from "react";
import { ReadAloudButton } from "./read-aloud-button.js";

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

const CloseMark = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ModalDialog = ({
  isOpen,
  onClose,
  title,
  closeLabel,
  children,
}: ModalDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (isOpen && !dialog.open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
      closeButtonRef.current?.focus();
      return;
    }
    if (!isOpen && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
      openerRef.current = null;
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {isOpen ? (
        <>
          <div className="modal-dialog-header">
            <h2 id={titleId}>{title}</h2>
            <button
              ref={closeButtonRef}
              type="button"
              className="modal-dialog-close"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <CloseMark />
            </button>
          </div>
          <div
            role="region"
            aria-labelledby={titleId}
            tabIndex={0}
            className="modal-dialog-body"
          >
            {children}
          </div>
          <div className="modal-dialog-footer">
            <ReadAloudButton
              className="read-aloud dialog-read-aloud"
              readsSection
            />
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
};

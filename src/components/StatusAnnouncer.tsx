import { forwardRef, useImperativeHandle, useState, type SetStateAction } from "react";

export type StatusTextUpdate = SetStateAction<string>;

export type StatusAnnouncerHandle = {
  announce: (next: StatusTextUpdate) => void;
};

type StatusAnnouncerProps = {
  initialText: string;
};

export const StatusAnnouncer = forwardRef<StatusAnnouncerHandle, StatusAnnouncerProps>(
  function StatusAnnouncer({ initialText }, ref) {
    const [statusText, setStatusText] = useState(initialText);

    useImperativeHandle(ref, () => ({ announce: setStatusText }), []);

    return (
      <div className="app-status-announcer" role="status" aria-live="polite" aria-atomic="true">
        {statusText}
      </div>
    );
  }
);

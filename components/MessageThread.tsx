"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/lib/actions/messages";

export interface ThreadMessage {
  id: string;
  senderId: string;
  body: string | null;
  attachmentUrl: string | null;
  attachmentType: "image" | "document" | null;
  attachmentName: string | null;
  createdAt: string;
}

export default function MessageThread({
  threadId,
  clientFolderId,
  currentUserId,
  messages,
}: {
  threadId: string;
  clientFolderId: string;
  currentUserId: string;
  messages: ThreadMessage[];
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16, minHeight: 0 }}>
      <div className="msg-thread">
        {messages.length === 0 && <p className="empty-state">No messages yet — say hello.</p>}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} style={{ textAlign: mine ? "right" : "left" }}>
              {m.attachmentUrl && m.attachmentType === "document" && (
                <div className={`msg ${mine ? "msg-out" : "msg-in"}`}>
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="msg-file">
                    <span className="file-ico">{(m.attachmentName?.split(".").pop() || "DOC").slice(0, 3).toUpperCase()}</span>
                    <span>{m.attachmentName}</span>
                  </a>
                </div>
              )}
              {m.attachmentUrl && m.attachmentType === "image" && (
                <div className={`msg ${mine ? "msg-out" : "msg-in"}`} style={{ padding: 4 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.attachmentUrl} alt="" style={{ maxWidth: 180, borderRadius: 10, display: "block" }} />
                </div>
              )}
              {m.body && <div className={`msg ${mine ? "msg-out" : "msg-in"}`}>{m.body}</div>}
              <div className="msg-time">
                {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      <form
        ref={formRef}
        className="composer"
        action={(formData) => {
          if (pendingFile) formData.set("attachment", pendingFile);
          sendMessage(threadId, clientFolderId, formData);
          formRef.current?.reset();
          setPendingFile(null);
        }}
      >
        <button
          type="button"
          className="btn btn-plain btn-icon"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          title={pendingFile ? pendingFile.name : "Attach a file"}
        >
          {pendingFile ? "📎" : "+"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
        />
        <input type="text" name="body" placeholder="Write a message…" autoComplete="off" />
        <button type="submit" className="btn btn-accent btn-icon" aria-label="Send">
          ↑
        </button>
      </form>
    </div>
  );
}

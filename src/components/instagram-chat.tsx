import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getInstagramThreadForLead,
  markInstagramConversationRead,
  sendInstagramReply,
} from "@/lib/instagram.functions";

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Lid kartochkasidagi Instagram Direct yozishmasi paneli. */
export function InstagramChatPanel({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const fetchThread = useServerFn(getInstagramThreadForLead);
  const markRead = useServerFn(markInstagramConversationRead);
  const sendReply = useServerFn(sendInstagramReply);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const threadQ = useQuery({
    queryKey: ["instagram-thread", leadId],
    queryFn: () => fetchThread({ data: { leadId } }),
    refetchInterval: 15000,
  });

  const thread = threadQ.data ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const read = useMutation({
    mutationFn: async (conversationId: string) => markRead({ data: { conversationId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["instagram-thread", leadId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!thread) throw new Error("Suhbat topilmadi");
      return sendReply({ data: { conversationId: thread.conversationId, text: text.trim() } });
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["instagram-thread", leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (threadQ.isLoading) {
    return <div className="text-[12px] text-slate-400">Direct yozishmasi yuklanmoqda...</div>;
  }
  if (!thread) return null;

  return (
    <div className="border border-pink-200 rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-pink-50 px-2.5 py-1.5">
        <div className="text-xs font-medium text-pink-700">
          📩 Instagram Direct
          {thread.username ? <span className="text-pink-500"> · @{thread.username.replace(/^@/, "")}</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {thread.unreadCount > 0 && (
            <button
              type="button"
              onClick={() => read.mutate(thread.conversationId)}
              className="text-[11px] bg-pink-600 text-white rounded-full px-2 py-0.5 hover:bg-pink-700"
            >
              {thread.unreadCount} yangi · o'qildi
            </button>
          )}
          <button
            type="button"
            onClick={() => threadQ.refetch()}
            className="text-pink-600 hover:text-pink-800"
            title="Yangilash"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${threadQ.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto bg-white px-2.5 py-2 space-y-1.5">
        {thread.messages.length === 0 && (
          <div className="text-[12px] text-slate-400">Hozircha xabar yo'q.</div>
        )}
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[12px] ${
                m.direction === "outbound"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-100"
                  : "bg-slate-50 text-slate-700 border border-slate-100"
              }`}
            >
              {m.message_text ? (
                <div className="whitespace-pre-wrap break-words">{m.message_text}</div>
              ) : (
                <div className="italic text-slate-400">📎 {m.media_type ?? "media"}</div>
              )}
              <div className="text-[10px] text-slate-400 mt-0.5">{formatMsgTime(m.sent_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-1.5 border-t border-pink-100 bg-slate-50 p-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Javob yozing..."
          rows={2}
          className="text-sm resize-none bg-white"
        />
        <Button
          size="sm"
          onClick={() => send.mutate()}
          disabled={send.isPending || !text.trim()}
          className="bg-pink-600 hover:bg-pink-700 h-9"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

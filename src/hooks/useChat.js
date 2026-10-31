import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as chat from "../services/chatService.js";

export function useConversation(id) {
  return useQuery({ queryKey: ["conversation", id], queryFn: () => chat.getConversation(id), enabled: Boolean(id) });
}

export function useMessages(id) {
  return useQuery({
    queryKey: ["messages", id],
    queryFn: async () => (await chat.listMessages(id)).items,
    enabled: Boolean(id),
  });
}

export function useSendMessage(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => chat.sendMessage(id, text),
    onSuccess: (msg) => {
      qc.setQueryData(["messages", id], (old) =>
        old ? (old.some((m) => m.id === msg.id) ? old : [...old, msg].sort((a, b) => a.seq - b.seq)) : [msg],
      );
      qc.invalidateQueries({ queryKey: ["conversation", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useConversations(filters) {
  return useQuery({ queryKey: ["conversations", filters], queryFn: () => chat.listConversations(filters) });
}

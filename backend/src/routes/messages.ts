import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth";
import {
  clearConversationHandler,
  deleteMessageHandler,
  getConversationMessagesHandler,
  listInboxHandler,
  sendMessageHandler,
  startConversationHandler
} from "../controllers/messagesController";

export const messagesRouter = Router();

messagesRouter.post("/messages/start", requireAuth, startConversationHandler);
messagesRouter.get("/messages/inbox", requireAuth, listInboxHandler);
messagesRouter.get(
  "/messages/:conversationId",
  requireAuth,
  getConversationMessagesHandler
);
messagesRouter.post("/messages/:conversationId", requireAuth, sendMessageHandler);
messagesRouter.delete("/messages/:messageId", requireAuth, deleteMessageHandler);
messagesRouter.post(
  "/messages/:conversationId/clear",
  requireAuth,
  clearConversationHandler
);

import type { Request, Response, NextFunction } from "express";

import { findUserById } from "../repositories/userRepository";
import {
  createConversation,
  createMessage,
  deleteMessageForUser,
  findMessageInConversation,
  findConversationByUsers,
  clearConversationForUser,
  getConversationForUser,
  getConversationPeer,
  listInboxForUser,
  listMessagesByConversation
} from "../repositories/messageRepository";

interface StartMessageBody {
  recipientUserId?: unknown;
  message?: unknown;
}

interface SendMessageBody {
  message?: unknown;
  replyToMessageId?: unknown;
  reply_to_message_id?: unknown;
}

export async function startConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as StartMessageBody;
    const recipientUserId =
      typeof body.recipientUserId === "string" ? body.recipientUserId.trim() : "";
    if (!recipientUserId) {
      res.status(400).json({ error: "Recipient user id is required" });
      return;
    }

    if (recipientUserId === req.user.id) {
      res.status(400).json({ error: "Cannot message yourself" });
      return;
    }

    const recipient = await findUserById(recipientUserId);
    if (!recipient || recipient.account_status !== "active") {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }

    let conversation = await findConversationByUsers(req.user.id, recipientUserId);
    if (!conversation) {
      conversation = await createConversation(req.user.id, recipientUserId);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const replyToMessageId =
      typeof body.replyToMessageId === "string" ? body.replyToMessageId.trim() : "";
    if (message) {
      await createMessage(conversation.id, req.user.id, message, null);
    }

    res.status(201).json({ conversationId: conversation.id });
  } catch (error) {
    next(error);
  }
}

export async function listInboxHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const inbox = await listInboxForUser(req.user.id);
    console.log(
      "[messages/inbox]",
      "me:",
      req.user.id,
      "count:",
      inbox.length,
      "conversation_ids:",
      inbox.map((item) => item.conversation_id)
    );
    res.json(
      inbox.map((item) => ({
        conversation_id: item.conversation_id,
        peer_user: {
          id: item.peer_id,
          full_name: item.peer_full_name,
          profile_image_url: item.peer_profile_image_url
        },
        last_message: item.last_message_body
          ? {
              body: item.last_message_body,
              created_at: item.last_message_at,
              sender_id: item.last_message_sender_id
            }
          : null,
        created_at: item.conversation_created_at
      }))
    );
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const conversationId =
      typeof req.params.conversationId === "string"
        ? req.params.conversationId.trim()
        : "";

    if (!conversationId) {
      res.status(400).json({ error: "Conversation id is required" });
      return;
    }

    const conversation = await getConversationForUser(conversationId, req.user.id);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const [messages, peer] = await Promise.all([
      listMessagesByConversation(conversationId, req.user.id),
      getConversationPeer(conversationId, req.user.id)
    ]);

    if (!peer) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json({ messages, other_user: peer });
  } catch (error) {
    next(error);
  }
}

export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const conversationId =
      typeof req.params.conversationId === "string"
        ? req.params.conversationId.trim()
        : "";

    if (!conversationId) {
      res.status(400).json({ error: "Conversation id is required" });
      return;
    }

    const body = req.body as SendMessageBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const replyToMessageId =
      typeof body.reply_to_message_id === "string"
        ? body.reply_to_message_id.trim()
        : typeof body.replyToMessageId === "string"
        ? body.replyToMessageId.trim()
        : "";

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const conversation = await getConversationForUser(conversationId, req.user.id);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (replyToMessageId) {
      const target = await findMessageInConversation(
        replyToMessageId,
        conversationId
      );
      if (!target) {
        res.status(400).json({ error: "Reply target not found" });
        return;
      }
    }

    const created = await createMessage(
      conversationId,
      req.user.id,
      message,
      replyToMessageId || null
    );
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function deleteMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const messageId =
      typeof req.params.messageId === "string" ? req.params.messageId.trim() : "";

    if (!messageId) {
      res.status(400).json({ error: "Message id is required" });
      return;
    }

    const result = await deleteMessageForUser(messageId, req.user.id);
    if (!result) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function clearConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const conversationId =
      typeof req.params.conversationId === "string"
        ? req.params.conversationId.trim()
        : "";

    if (!conversationId) {
      res.status(400).json({ error: "Conversation id is required" });
      return;
    }

    const conversation = await getConversationForUser(conversationId, req.user.id);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const clearedCount = await clearConversationForUser(
      conversationId,
      req.user.id
    );

    res.json({ cleared: clearedCount });
  } catch (error) {
    next(error);
  }
}

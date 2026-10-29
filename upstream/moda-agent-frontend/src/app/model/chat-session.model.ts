import { AvailableModel } from "./available-model.model";

export class ChatSession {
  conversationId: string = '';
  title: string = '';
  selectModel?: AvailableModel;
  messageTree: MessageNode[] = [];
  lastModifyDttm: number = 0;

  constructor(data: Partial<ChatSession> = {}) {
    Object.assign(this, data);
  }
}

export class MessageNode {
  id: string = '';
  parentId: string | null = null;
  createdDttm: number = 0;
  content: ContentItem[] = [];
  children: MessageNode[] = [];
  thinkingTime?: number;

  constructor(data: Partial<MessageNode> = {}) {
    Object.assign(this, data);
    this.children = (data.children || []).map(child => new MessageNode(child));
  }
}

export class ContentItem {
  role?: 'user' | 'assistant';
  type: 'image_url' | 'text' | 'reasoningContent' = 'text';
  thinkingTime?: number;
  text?: string;
  image_url?: { url: string };
  createdDttm?: number;

  constructor(data: Partial<ContentItem> = {}) {
    Object.assign(this, data);
  }
}

export class MessageContent {
  role: 'user' | 'assistant' = 'user';
  content: Content[] = [];
}

export class Content {
  type: 'image_url' | 'text' | 'reasoningContent' = 'text';
  text: string = '';
  image_url?: string;
  thinkingTime?: number;
  createdDttm: number = 0;
}

export interface Message {
  role: string;
  content: string;
  reasoning_content?: string;
  image?: string[];
  thinkingTime?: number;
  messageId?: string;
}

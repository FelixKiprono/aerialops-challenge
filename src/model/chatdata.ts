import mongoose, { model, models } from "mongoose";

// An interface that describes the properties
// that are required to create a new Chat
interface TextChatAttrs {
  message: string;
  signedImageKey: string;
  hasImage?: boolean;
  sentAt?: Date;
}
const textChatSchema = new mongoose.Schema({
  message: {
    type: String
    },
  signedImageKey: {
    type: String
  },
  hasImage: {
    type: Boolean,
  },
  sentAt: {
    type: Date,
  }
});

textChatSchema.statics.build = (attrs: TextChatAttrs) => {
  return new TextChat(attrs);
};
// models.Chat || 
const TextChat = model<TextChatAttrs>("Chat", textChatSchema);
export default TextChat;

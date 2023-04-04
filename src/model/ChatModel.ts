import mongoose, { model, models } from "mongoose";
// An interface that describes the properties of chat 
interface TextChatAttrs {
  message: string;
  signedImageKey?: string;
  hasImage?: boolean;
  sentAt: Date;
}
const textChatSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
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
// models.Chat || 
const Chat = model<TextChatAttrs>("Chat", textChatSchema);
export default Chat;

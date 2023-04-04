import { boolean, date, object, string, TypeOf } from "zod";

const addMsgParams = object({
  message: string(),
  sentAt: date(),
  hasImage: boolean(),
  signedImageKey: string(),
  fileType: string(),
})

const deleteMsgParams = object({
  id: string(),
});

export type AddMsgParams = TypeOf<typeof addMsgParams>;
export type DeleteMsgParams = TypeOf<typeof deleteMsgParams>;

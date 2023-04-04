import AWS from 'aws-sdk';
import moment from 'moment';
import { boolean, date, object, string, TypeOf } from 'zod';
import { AddMsgParams, DeleteMsgParams } from '~/server/schema/custom';
import Chat from '~/model/ChatModel';

//S3 instance
const S3 = new AWS.S3({
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  signatureVersion: 'v4',
});

// parameters for query
type MsgParams = {
  cursor?: string | null;
};
//response types
export type Response = {
  id: string;
  message?: string;
  hasImage: boolean;
  sentAt: Date;
  imageUrl: string;
};

//generate presignedurl using the type and timestamp as the key
const generatePresignedUrl = async (type: string) => {
  const timestamp = Date.now();
  const Key = `${timestamp}.${type}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key,
    Expires: 3600,
    ContentType: type,
  };

  const uploadUrl = await S3.getSignedUrl('putObject', s3Params);

  return {
    Key,
    uploadUrl,
  };
};

//add message to mongodb
export const sendMessage = async ({
  input: { message, hasImage, sentAt, fileType },
}: {
  input: any;
}) => {
  //first if it has image generate upload url
  if (hasImage) {
    const { Key, uploadUrl } = await generatePresignedUrl(fileType as string);
    try {
      //crud with signedImage key that we will use when fetching the message
      const newchat = await Chat.create({
        message: message,
        sentAt: moment().toDate().toString(),
        hasImage: hasImage,
        fileType: fileType,
        signedImageKey: Key,
      });
      if (newchat) {
        //response
        return {
          success: true,
          hasImage: true,
          message: 'Message sent',
          metadata: {
            key: Key,
            signedUrl: uploadUrl,
          },
        };
      }
    } catch (error) {
      console.error('Problem sending message', error);
    }
  } else {
    //when there is no image just send normal message and timestamp
    try {
      const sentMessageResponse = await Chat.create({
        message: message,
        sentAt: sentAt,
      });
      return {
        success: true,
        hasImage: false,
        message: 'Message sent ',
      };
    } catch (error) {
      console.error('Error adding message', error);
    }
  }
};

export const getAllMessages = async ({
  input: { cursor },
}: {
  input: MsgParams;
}) => {
  try {
    //empty messages array
    //show 9 items per page
    const LIMIT = 5;
    //since this is a cursor based
    //our cursor in this case is the sentat
    //sort the messages based on the time created/sent
    const filter = cursor ? { sentAt: { $lt: new Date(cursor) } } : {};
    const allMessagesFromServer = await Chat.find(filter)
      .sort({ sentAt: -1 })
      .limit(LIMIT + 1);

    // allMessagesFromServer.reverse()
    //loop through each message and get the image url if it has one
    // we check the signedImageKey property if its set
    const allChats = await Promise.all(
      allMessagesFromServer.map(async (chat: any) => {
        //if it has imageKey then get the url
        if (chat.signedImageKey) {
          const url = await S3.getSignedUrlPromise('getObject', {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: chat.signedImageKey,
          });
          return {
            id: chat?._id,
            message: chat?.message,
            hasImage: true,
            sentAt: chat?.sentAt,
            imageUrl: url as string,
          };
        } else {
          //if it doesnt have image just return the normal message payload
          return {
            id: chat?._id,
            message: chat?.message,
            hasImage: false,
            sentAt: chat?.sentAt,
          };
        }
      }),
    );

    //if the total numnber of chats are greater than the limit then we have more messages
    const hasNext = allChats.length > LIMIT ? true : false;
    const edges = hasNext ? allChats.slice(0, -1) : allChats;
    //set our cursor /in this case we use the sentAt time
    const setCursor = hasNext
      ? moment(edges[edges?.length - 1]?.sentAt).format()
      : '';

    // console.log(edges)
    //get the cursor
    //basically get the last item id
    return {
      edges: edges,
      page: {
        hasNext: hasNext,
        cursor: setCursor,
      },
    };
  } catch (error) {
    console.error('Error getting chats', error);
  }
};
//delete existing chat
export const deleteChat = async ({
  input: { id },
}: {
  input: DeleteMsgParams;
}) => {
  try {
    //check first if the chat really exists
    const selectedChat = await Chat.findOne({ _id: id });
    if (selectedChat) {
      // if it is there we delete the message
      await Chat.deleteOne({ _id: id });
      return {
        success: true,
        message: 'Deleted',
      };
    }
  } catch (error) {
    console.error('Error deleting chat', error);
  }
};

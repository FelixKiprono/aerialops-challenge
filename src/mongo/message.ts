import AWS from 'aws-sdk';
import moment from 'moment';
import { boolean, date, object, string, TypeOf } from 'zod';
import { AddMsgParams, DeleteMsgParams } from '~/server/schema/custom';
import TextChat from '~/model/chatdata';
const S3 = new AWS.S3({
  region: process.env.S3_REGION,
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  signatureVersion: 'v4',
});

type MsgParams = {
  cursor?: string | null;
};

export type Response = {
  id: string;
  message?: string;
  hasImage: boolean;
  sentAt: string;
  imageUrl: string;
};

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

export const sendMessage = async ({
  input: { message, hasImage, sentAt, fileType },
}: {
  input: any;
}) => {
  if (hasImage) {

    const { Key, uploadUrl } = await generatePresignedUrl(fileType as string);
    try {
      const newchat = await TextChat.create(
        {
          message:"sdfs",
          sentAt:moment().toDate().toString(),
          hasImage:false,
          fileType:"sdf",
          signedImageKey:"sdfsdf"
        }
      );
      return {
        success: true,
        hasImage: true,
        message: 'Message sent',
        metadata: {
          key: Key,
          signedUrl: uploadUrl,
        },
      };
    } catch (error) {
      console.error('Problem sending message', error);
    }
  } else {
    try {
      const sentMessageResponse = await TextChat.create({
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
    // console.log(cursor)
    //empty messages array
    let allMessagesFromServer = [];
    //show 5 items per page
    const LIMIT = 9;
    //since this is a cursor based
    //our cursor in this case is the last item id
    //sort the messages based on the time created/sent
    if (cursor) {
      console.log(cursor)
      allMessagesFromServer = await TextChat
        .find({
          sentAt: { $lt: cursor },
        })
        .sort({ sentAt: -1 })
        .limit(LIMIT + 1);

    } else {

      allMessagesFromServer = await TextChat.find({})
        .sort({ sentAt: -1 })
        .limit(LIMIT + 1);

    }


    //reverse message list to facilitate top down rendering
    //becase looking at the array the first or item 0 is the newest item based on the sort by date
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

    // allChats.reverse()
    //if the total numnber of chats are greater than the limit then we have more messages
    const hasNext = allChats.length > LIMIT ? true : false;
    const edges = hasNext ? allChats.slice(0, -1) : allChats;

    //set our cursor /in this case we use the sentAt time
    const setCursor = moment(edges[edges?.length - 1]?.sentAt).format();

    //get the cursor
    //basically get the last item id
    return {
      edges: edges,
      pageInfo: {
        hasNext: hasNext,
        cursor: setCursor,
      },
    };
  } catch (error) {
    console.error('Error getting messages', error);
  }
};

export const deleteChat = async ({
  input: { id },
}: {
  input: DeleteMsgParams;
}) => {
  try {
    const selectedChat = await TextChat.findOne({ _id: id });
    if (selectedChat) {
      // The we delete the message
      await TextChat.deleteOne({ _id: id });
      return {
        success: true,
        message: 'Deleted',
      };
    }
  } catch (error) {
    console.error('Error deleting message', error);
  }
};

import React from 'react';
import { trpc } from '../utils/trpc';
import { NextPageWithLayout } from './_app';
import { inferProcedureInput } from '@trpc/server';
import { useRef, useState } from 'react';
import type { AppRouter } from '~/server/routers/_app';
import {
  Container,
  Flex,
  Loader,
  Text,
  Divider,
  Title,
  Image,
  Modal,
} from '@mantine/core';
import { Button, Stack, TextInput } from '@mantine/core';
import { Message } from '~/components/MessageContent';
import moment from 'moment';
import { MdAttachFile } from 'react-icons/md';
import Swal from 'sweetalert2';
import { IMAGE_TYPES, MAX__SIZE } from 'lib/globalConstants';
import s3Upload from 'lib/s3Upload';
import InfiniteScroll from 'react-infinite-scroll-component';
import { AddMsgParams } from '~/server/schema/custom';
import { useEffect } from 'react';
import { connection } from 'mongoose';
import { number } from 'zod';

const IndexPage: NextPageWithLayout = () => {
  const [slowTransitionOpened, setSlowTransitionOpened] = useState(false);

  //message
  const [message, setTypedMessage] = useState<string>('');
  const [hasImage, setHasImage] = useState<boolean>(false);

  //file
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  //exttas
  const [fileSize, setFileSize] = useState<any>();
  const [fileType, setFileType] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  const utils = trpc.useContext();

  const inputRef = useRef<HTMLInputElement>(null);

  //init our swal as toast
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,
    // timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  //file upload
  const onFileSelect = (event: any) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) {
      Toast.fire({
        icon: 'error',
        title: 'Unable to upload file',
      });
      return;
    }
    //convert to mbs
    const fileInMbs = fileObj?.size / 1024;
    //check file size
    if (fileInMbs > MAX__SIZE) {
      Toast.fire({
        icon: 'error',
        title: `Image should not exceed ${MAX__SIZE} kb`,
      });
    }
    //check file types
    if (!IMAGE_TYPES.includes(fileObj.type)) {
      Toast.fire({
        icon: 'error',
        title: `Image type is invalid  \n Accepted types are ${IMAGE_TYPES.toString()}`,
      });
    }
    // 👇️ reset file input
    event.target.value = null;
    setHasImage(true);
    setUploadedPhoto(fileObj);
    setUploadedPhotoUrl(URL.createObjectURL(fileObj));
    setFileName(fileObj.name);
    setFileSize(fileObj?.size);
    setFileType(fileObj.type);

    setSlowTransitionOpened(true);
  };

  const handleClick = () => inputRef.current?.click();

  type Input = inferProcedureInput<AppRouter['msg']['add']>;
  const sendSms = trpc.msg.add.useMutation({
    // onMutate: async (newMessage) => {},
    onSuccess: async (data): Promise<void> => {
      scrollToBottom();
      await utils.msg.list.invalidate();
      if (hasImage && data?.metadata?.signedUrl) {
        await s3Upload(uploadedPhoto as File, data?.metadata?.signedUrl);
      }
    },
    onSettled: async () => {
      scrollToBottom();
      //clear the text
      setTypedMessage('');
      setHasImage(false);
      setUploadedPhoto(null);
      setUploadedPhotoUrl('');
      await utils.msg.list.invalidate();
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: async (err, newMsg, context) => {
      console.log(err);
    },
  });

  const send = async () => {
    const input = {
      message,
      hasImage,
      fileType: uploadedPhoto?.type,
      sentAt: moment().toDate(),
    };
    try {
      sendSms.mutateAsync(input);
    } catch (error) {
      console.log(error);
    }
  };
  const messageQuery = trpc.msg.list.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastpage, allPages) => {
        // console.log(lastpage?.page?.cursor)
        //we want the request to use our custom cursor
        return lastpage?.page?.cursor;
      },
      //we dont need this now
      // getPreviousPageParam: (firstPage, allPages) =>
      //   firstPage?.page?.cursor,
      onSuccess: ({ pages }) => {
        // scrollToBottom();
        //we go to the last page from the list
        //get the flag hasNext and set it on state so that we can use to show loading
        setHasNextPage(pages[pages?.length - 1]?.page?.hasNext as boolean);
      },
    },
  );
  //get pages
  const pages = messageQuery?.data?.pages.map((p) => p?.edges)
    ?.length as number;

  const viewport = useRef<HTMLDivElement>(null);
  const scrollToBottom = () =>
    viewport?.current?.scrollTo({
      top: viewport?.current?.scrollHeight,
      behavior: 'smooth',
    });

  //using react query loading property when loading items
  if (messageQuery.isLoading) {
    return (
      <>
        <Title order={2} color="blue.5">
          Please wait loading ...
        </Title>
      </>
    );
  }
  if (!messageQuery.data?.pages.map((p) => p?.edges).length) {
    return (
      <>
        <Title order={2} color="red.5">
          Nothing to load !
        </Title>
      </>
    );
  }

  return (
    <div>
      <Modal
        opened={slowTransitionOpened}
        onClose={() => setSlowTransitionOpened(false)}
        title="Preview Photo"
      >
        <center>
          <Image
            mx="auto"
            radius="md"
            width={300}
            height={400}
            src={uploadedPhotoUrl}
            alt="Random unsplash image"
            caption="Uploaded image"
          />
        </center>

        <Divider my="sm" variant="dotted" />
        <Text size="sm">
          Size : {parseFloat(fileSize)} kbs<br></br>
          Type : {fileType}
          <br></br>
          Filename : {fileName}
          <br></br>
        </Text>
        <Button mt="xl" onClick={() => setSlowTransitionOpened(false)}>
          Ok
        </Button>
      </Modal>

      <Container>
        <Text
          variant="gradient"
          gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
          sx={{ fontFamily: 'Greycliff CF, sans-serif' }}
          // ta="center"
          fz="xl"
          fw={700}
        >
          TPRC Chat based App
        </Text>
        <Divider my="sm" variant="dotted" />
        <Flex direction="column" sx={{ position: 'relative' }}>
          <Stack align="left" sx={{ backgroundColor: '#D4D4D4' }}>
            <div
              id="scrollableDiv"
              style={{
                height: 500,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column-reverse',
              }}
            >
              <InfiniteScroll
                dataLength={pages}
                next={() => messageQuery.fetchNextPage()}
                style={{ display: 'flex', flexDirection: 'column-reverse' }}
                inverse={true}
                hasMore={hasNextPage as boolean}
                loader={
                  <div>
                    {' '}
                    <center>
                      <Loader />
                      <br />
                      <Title order={5} color="blue.5">
                        Loading more ... ⏱️
                      </Title>
                    </center>
                  </div>
                }
                scrollableTarget="scrollableDiv"
                endMessage={
                  <center>
                  <p style={{ textAlign: 'center' }}>
                    <Title order={4} color="pink.5">
                      Alrighty you have seen 👓 it all! 🥁
                    </Title>
                  </p>
                  </center>
                }
              >
                {message?.length > 0 && (
                  <Text style={{ marginLeft: 3 }}>Someone is Typing ...</Text>
                )}

                {messageQuery?.data?.pages.map((page, key) => {
                  return page?.edges?.map(
                    ({ id, message, sentAt, hasImage, imageUrl }) => (
                      <Message
                        key={key}
                        id={id.toString()}
                        message={message}
                        sentAt={sentAt}
                        hasImage={hasImage}
                        imageUrl={imageUrl}
                      />
                    ),
                  );
                })}
              </InfiniteScroll>
            </div>
          </Stack>
          <div
            style={{
              display: 'flex',
              padding: '2px',
              margin: '5px',
              borderColor: '1px',
            }}
          >
            <TextInput
              variant={'default'}
              onChange={(e) => setTypedMessage(e.target.value)}
              size="md"
              sx={{ flexGrow: 2 }}
              placeholder="Enter Message . . . "
            />
            <Button
              variant={'default'}
              size="md"
              sx={{ marginLeft: '5px' }}
              onClick={handleClick}
            >
              <input
                style={{ display: 'none' }}
                type="file"
                accept="image/*"
                ref={inputRef}
                onChange={onFileSelect}
              />
              <MdAttachFile
                style={{ transform: 'rotate(45deg)', marginRight: '12px' }}
                size={26}
              />
            </Button>
            <Button
              disabled={message?.length <= 0}
              sx={{ marginLeft: '5px' }}
              size="md"
              onClick={send}
            >
              SEND
            </Button>
          </div>
        </Flex>
      </Container>
    </div>
  );
};

export default IndexPage;

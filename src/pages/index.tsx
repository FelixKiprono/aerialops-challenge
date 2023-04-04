'use client'
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
  Space,
  Chip,
  Dialog,
  Popover,
} from '@mantine/core';
import { Button, Stack, TextInput } from '@mantine/core';
import moment from 'moment';
import { MdAttachFile } from 'react-icons/md';
import Swal from 'sweetalert2';
import { IMAGE_TYPES, MAX__SIZE } from 'constants/globalConstants';
import s3Upload from 'lib/s3Upload';
import InfiniteScroll from 'react-infinite-scroll-component';
import { AddMsgParams } from '~/server/schema/custom';
import { useEffect } from 'react';
import { connection } from 'mongoose';
import { number } from 'zod';
import { Messages } from '~/components/Messages';
import { useHover } from '@mantine/hooks';

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
  const [showTyping, setShowTyping] = useState<boolean>(false);

  const [scrollToBottom, setScrollToBottom] = useState<boolean>(false);
  const [sendingState, setSendingState] = useState<boolean>(false);

  const [opened, setOpened] = useState(false);

  const utils = trpc.useContext();
  const { hovered, ref } = useHover();
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

    setOpened(true);

  };
  const handleClick = () => inputRef.current?.click();
  type Input = inferProcedureInput<AppRouter['msg']['add']>;
  const sendSms = trpc.msg.add.useMutation({
    // onMutate: async (newMessage) => {},
    onSuccess: async (data): Promise<void> => {
      await utils.msg.list.invalidate();
      if (hasImage && data?.metadata?.signedUrl) {
        await s3Upload(uploadedPhoto as File, data?.metadata?.signedUrl);
      }
    },
    onSettled: async () => {
      await utils.msg.list.invalidate();
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: async (err, newMsg, context) => {
      console.log(err);
    },
  });

  const send = async () => {
    setSendingState(true)
    const input = {
      message,
      hasImage,
      fileType: uploadedPhoto?.type,
      sentAt: moment().toDate(),
    };
    try {
      await sendSms.mutateAsync(input);
      //after sending messages
      //clear inputs
      setTypedMessage('');
      setHasImage(false);
      setUploadedPhoto(null);
      setUploadedPhotoUrl('');
      setScrollToBottom(true)
      setSendingState(false)
    } catch (error) {
      console.log(error);
        //clear inputs
        setTypedMessage("");
        setHasImage(false);
        setUploadedPhoto(null);
        setUploadedPhotoUrl('');
        setScrollToBottom(true)
        setSendingState(false)

    }
  };

  //when user types and  presses enter 
  // if use presses enter and shift we treat it as new line so we dont send message
 const onKeyUpEvent = async (event:any) => {
  if (event.keyCode === 13 && !event.shiftKey) {
    event.preventDefault();
    send()
  }
};
  useEffect(()=>{
   
    //simple logic 
    // console.log(message.length)
    // if(message.length>0){
    //   //the there is activity
    //   const interval =  setInterval(() => {
    //       setShowTyping(true);
    //     }, 1000);
    //     setShowTyping(false);
    //   return () => clearInterval(interval);
    // }
    // else{
    //   setShowTyping(false);
    // }
   
  },[message])


  return (
    <div>
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
       
           <Messages scrollToBottom={scrollToBottom}/>
           <div style={{ display: 'flex',height:'25px' }}>
         
           {sendingState &&
           (<>
           <Text
             variant="gradient"
              sx={{ fontFamily: 'Greycliff CF, sans-serif',margin:'2px 2px'}}
              // ta="center"
              fz="sm"
              fw={700}
            > Sending  </Text> 
            <Space w="md" />
            <Loader sx={{marginTop:2}} size="sm" color="blue" variant="dots"/>

          
            </>
           )}
                        
           </div>
          
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
              onKeyUp={onKeyUpEvent}
            />
                {/* <Popover  opened={opened} onChange={setOpened} width={200} position="top" withArrow shadow="md">
             <Popover.Target>
             
         
              </Popover.Target>
              <Popover.Dropdown>
                <Image
                  mx="auto"
                  width={200}
                  height={100}
                  src={uploadedPhotoUrl}
                  alt="Random unsplash image"
                />

        <Divider my="sm" variant="dotted" />
        <Text size="sm">
          Currently Uploaded : <br/>
          Size : {parseFloat(fileSize)} kbs<br></br>
          Type : {fileType}
          <br></br>
        </Text>
              </Popover.Dropdown>
            </Popover>
           */}
           <Button
               onMouseEnter={() => setOpened(true)}
               onMouseLeave={() => setOpened(false)}

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
             
               style={{ transform: 'rotate(45deg)' }}
               size={24}
             />
           </Button>
              <Button
                disabled={message?.length <= 0}
                sx={{ marginLeft: '5px' }}
                size="md"
                onClick={send}
              >
                Send
                 
              </Button>
          </div>
      </Container>
    </div>
  );
};

export default IndexPage;

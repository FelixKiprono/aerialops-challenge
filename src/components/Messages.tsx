import { ActionIcon, Box, Button, Flex, Image, Loader, Modal, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { inferProcedureInput } from '@trpc/server';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { useCallback } from 'react';
import Swal from 'sweetalert2';
import { AppRouter } from '~/server/routers/_app';
import { trpc } from '~/utils/trpc';
import React from "react";
import InfiniteScroll from 'react-infinite-scroll-component';
import { MdAttachFile } from 'react-icons/md';
import { MessageBox } from './MessageBox';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const Messages = (props: any) => {

    //set scroll to bottom after sendimg message
  const {scrollToBottom} = props
  const utils = trpc.useContext();
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  //query for fetching all messages
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

  const ref = useRef<HTMLDivElement>(null);
  const scrollDown = () => ref.current?.scrollTo(0, ref.current.scrollHeight);

  useEffect(() => {
    if (scrollToBottom) {
      scrollDown()
    }
  }, [scrollToBottom]);

  //using react query loading property when loading items
  if (messageQuery.isLoading) {
    return (
      <>
        <Title order={2} color="blue.5">
          Please wait loading ... 🕓
        </Title>
      </>
    );
  }
  if (!messageQuery.data?.pages.map((p) => p?.edges).length) {
    return (
      <>
        <Title order={2} color="red.5">
          Nothing to load ! 😢
        </Title>
      </>
    );
  }

  return (
    <>
      <Flex   
        ref ={ref}   
        id="scrollableDiv"
        direction="column-reverse" 
        sx={{
         height: "40vh",
          backgroundColor: "#D4D4D4",
          padding: "10px",
          overflowY: "auto",
         }}>
              <InfiniteScroll
              
                dataLength={pages}
                next={() => messageQuery.fetchNextPage()}
                style={{ 
                  display: 'flex', 
                flexDirection: 'column-reverse' }}
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
              {messageQuery?.data?.pages.map((page, key) => {
                  return page?.edges?.map((message:any) => (
                      <MessageBox
                        key={key}
                        id={message?.id.toString()}
                        message={message?.message}
                        sentAt={message?.sentAt}
                        hasImage={message?.hasImage}
                        imageUrl={message?.imageUrl}
                      />
                    ),
                  );
                })}
              </InfiniteScroll>
     
      </Flex>
    
    </>
  );
};

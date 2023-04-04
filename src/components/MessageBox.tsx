import { ActionIcon, Box, Image, Modal, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { inferProcedureInput } from '@trpc/server';
import moment from 'moment';
import { useState } from 'react';
import { useCallback } from 'react';
import Swal from 'sweetalert2';
import { AppRouter } from '~/server/routers/_app';
import { trpc } from '~/utils/trpc';
import React from "react";

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

export const MessageBox = (props: any) => {
  const utils = trpc.useContext();
  const [slowTransitionOpened, setSlowTransitionOpened] = useState(false);
  const { id, message, sentAt, hasImage, imageUrl } = props;
  const handleDelete = trpc.msg.delete.useMutation({
    onMutate: async (updatedMessage) => {
      await utils.msg.list.cancel();
      const previousMessages = await utils.msg.list.getData();
      return { previousMessages };
    },
    onSuccess: async (data): Promise<void> => {
      await utils.msg.list.invalidate();
    },
    onSettled: async () => {
      await utils.msg.list.invalidate();
    },
  });
  //
  const deleteMessage = useCallback(async () => {
    type Input = inferProcedureInput<AppRouter['msg']['delete']>;
    const input: Input = {
      id,
    };
    try {
      await handleDelete.mutateAsync(input);
      Toast.fire({
        icon: 'success',
        title: `Successfully deleted the message!`,
      });
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: `Ooops! cant delete message!`,
      });
      console.error('error', error);
    }
  }, []);

  return (
    <>
      <Modal
        opened={slowTransitionOpened}
        onClose={() => setSlowTransitionOpened(false)}
        title="Preview Photo"
      >
        {imageUrl && <Image src={imageUrl} alt="Random unsplash image" />}
      </Modal>
      <div style={{ width: '340px', margin: '20px 10px' }}>
        <Box
          className="chat-box"
          sx={(theme) => ({
            backgroundColor: 'white',
            textAlign: 'left',
            padding: theme.spacing.xl,
            cursor: 'pointer',
            // '&:hover': {
            //   backgroundColor:
            //     theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
            // },
          })}
        >
          <div className="delete-button">
            <ActionIcon onClick={deleteMessage}>
              <IconX size="1.125rem" />
            </ActionIcon>
          </div>
          <Text> {message} </Text>
        </Box>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            onClick={() => {
              setSlowTransitionOpened(true);
            }}
          />
        )}
        <Text fz="sm">{moment(sentAt).fromNow()}</Text>{' '}
      </div>
    </>
  );
};

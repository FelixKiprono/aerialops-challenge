import { Button, Select } from '@mantine/core';
import React from "react";

export const Filter = () => {
  return (
    <>
      <div
        style={{
          display: 'flex',
          margin: '5px',
        }}
      >
        <select style={{ flexGrow: 1 }} name="filters">
          <option value="Time">Time</option>
          <option value="Messages">Messages</option>
        </select>

        <Button size="lg" sx={{ marginLeft: '5px' }}>
          Asc
        </Button>
        <Button size="lg" variant="default" sx={{ marginLeft: '5px' }}>
          {' '}
          Desc
        </Button>
      </div>
    </>
  );
};

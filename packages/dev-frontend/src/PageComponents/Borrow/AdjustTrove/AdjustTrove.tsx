// @ts-nocheck
import React from "react";
import {
  Box,
  BoxProps,
} from "@chakra-ui/react";

import AdjustTroveComponents from "./AdjustTroveComponents"

import { Form } from "react-final-form";

type AdjustTroveProps = {
  disconnected?: boolean;
  borrowMode: "normal" | "lever" | "unlever";
  setBorrowMode: any;
} & BoxProps;


const AdjustTrove: React.FC<AdjustTroveProps> = ({ disconnected, borrowMode, setBorrowMode, ...props }) => {
  const getFormattedValue = (value: string) => {
    if (/^[0-9.]*$/.test(value)) {
      return value;
    }
    return "";
  };
  return (
    <Box layerStyle="card" flex={1} px={2} {...props}>
      <Form
        onSubmit={() => {}}
        format={getFormattedValue}
        render={({ values, form }) => (
          <>
            <AdjustTroveComponents borrowMode={borrowMode} setBorrowMode={setBorrowMode} values={values} form={form}/>
          </>
        )}
      />
    </Box>
  );
};

export default AdjustTrove;

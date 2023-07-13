// @ts-nocheck
import React from "react";
import { BoxProps, Container } from "@chakra-ui/react";
import Footer from "../Footer";

type PageWrapperProps = { snow?: 0 | 1 } & BoxProps;

const PageWrapper: React.FC<PageWrapperProps> = ({ snow = 1, children, ...props }) => (
  <>
    <Container maxW={1220} {...props} minH="100vh" py={8} mb={24} px={[4, 6, 8]}>
      {children}
    </Container>
    <Footer />
  </>
);

export default PageWrapper;

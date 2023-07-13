// @ts-nocheck
import React from "react";
import { Icon as ChakraIcon, IconProps as ChakraIconProps } from "@chakra-ui/react";
import library from "./library";


export interface IconProps extends Omit<ChakraIconProps, "css"> {
  iconName?: string;
}

function getIcon(iconName?: string): typeof ChakraIcon {
  return library[iconName as keyof typeof library] ?? ChakraIcon;
}



/**
 * Icon component. We use this to have a common interface for all of our icons, see
 * and inspect them in one place. Add an icon by using Chakra's createIcon function
 * {@link https://chakra-ui.com/docs/media-and-icons/icon#using-the-createicon-function}
 * And adding it to library/index.ts.
 *
 * @param iconName - key of the icon in the library
 * @returns Chakra UI Icon component
 */
const Icon: React.FC<IconProps> = React.forwardRef(({ iconName, ...props }, ref) => {

  const SelectedIcon =

      iconName === "WAVAX"
      ? getIcon("AVAX")
      : getIcon(iconName);

  // @ts-ignore the ref chakra has incorrect types
  return <SelectedIcon {...props} ref={ref} />;
});

export default Icon;

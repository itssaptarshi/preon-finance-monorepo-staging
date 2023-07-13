import { extendTheme } from "@chakra-ui/react";

import textStyles from "./textStyles";
import layerStyles from "./layerStyles";
import colors from "./colors";
import components from "./Components";
import radii from "./radii";
import yeti from "./yeti";
import sizes from "./sizes";

const theme = extendTheme({
  colors,
  textStyles,
  layerStyles,
  components,
  radii,
  sizes,
  yeti
});

export default theme;

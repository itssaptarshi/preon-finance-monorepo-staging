const defaultTextStyle = {
  color: "white",
  fontFamily: "Open Sans"
};

const textStyles = {
  title1: {
    ...defaultTextStyle,
    fontSize: "5xl",
    fontWeight: "bold"
  },
  title2: {
    ...defaultTextStyle,
    fontSize: "4xl",
    fontWeight: "bold"
  },
  title3: {
    ...defaultTextStyle,
    fontSize: "2xl",
    fontWeight: "bold"
  },
  title4: {
    ...defaultTextStyle,
    fontSize: "xl",
    fontWeight: "bold"
  },
  title5: {
    ...defaultTextStyle,
    fontSize: "lg",
    fontWeight: "bold"
  },
  subtitle1: {
    ...defaultTextStyle,
    fontSize: "lg",
    fontWeight: "bold"
  },
  subtitle2: {
    ...defaultTextStyle,
    fontSize: "md",
    fontWeight: "bold"
  },
  subtitle3: {
    ...defaultTextStyle,
    fontSize: "sm",
    fontWeight: "bold"
  },
  subtitle4: {
    ...defaultTextStyle,
    fontSize: "xs",
    fontWeight: "bold"
  },
  body1: {
    ...defaultTextStyle,
    fontSize: "md",
    fontWeight: "normal"
  },
  body2: {
    ...defaultTextStyle,
    fontSize: "sm",
    fontWeight: "normal"
  },
  body3: {
    ...defaultTextStyle,
    fontSize: "xs",
    fontWeight: "normal"
  },
  label1: {
    ...defaultTextStyle,
    fontSize: "0.625rem",
    fontWeight: "normal"
  },
  label2: {
    ...defaultTextStyle,
    fontSize: "0.5rem",
    fontWeight: "normal"
  },
  Dropdown: {
    ...defaultTextStyle,
    fontWeight: "light",
    fontSize: "lg"
  },
  Button: {
    ...defaultTextStyle,
    fontWeight: 700,
    fontSize: "lg"
  },
  walletAddress: {
    ...defaultTextStyle,
    fontSize: "md",
    color: "brand.200",
    p: 2,
    borderRadius: 8,
    borderColor: "brand.700",
    borderWidth: 2
  },
  inherit: {
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit"
  },
  hover: {
    ...defaultTextStyle,
    fontSize: "md",
    fontWeight: "normal",
    cursor: "pointer",
    textDecoration: "underline"
  },
  subtitle2Link: {
    ...defaultTextStyle,
    fontSize: "md",
    fontWeight: "bold",
    textDecoration: "underline"
  }
};

export default textStyles;

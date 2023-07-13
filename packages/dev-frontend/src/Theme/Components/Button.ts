const Button = {
  baseStyle: {
    fontWeight: "bold",
    fontFamily: "Open Sans",
    fontSize: "lg",
    _focus: {
      outline: "none",
      boxShadow: "none"
    }
  },
  variants: {
    primary: {
      bg: "brand.500",
      color: "white",
      _hover: {
        backgroundColor: "brand.600"
      },
      _active: {
        backgroundColor: "brand.600"
      }
    },
    secondary: {
      bg: "transparent",
      color: "secondary.400",
      borderWidth: "2px",
      borderStyle: "solid",
      borderColor: "secondary.400",
      _hover: {
        bg: "secondary.400",
        color: "white"
      },
      _active: {
        bg: "secondary.400",
        color: "white"
      }
    },
    noLUSD: {
      bg: "transparent",
      color: "secondary.400",
      borderWidth: "2px",
      borderStyle: "solid",
      borderColor: "secondary.400",
      cursor: "default"
    },
    tertiary: {
      bg: "transparent",
      color: "white",
      borderWidth: "2px",
      borderStyle: "solid",
      borderColor: "white",
      _active: {
        bg: "transparent"
      }
    },
    quaternary: {
      bg: "brand.200",
      color: "white",

      _active: {
        bg: "brand.200"
      }
    },
    connect: {
      bg: "transparent",
      color: "orange.400",
      fontSize: "xl",
      borderWidth: "2.5px",
      borderStyle: "solid",
      borderColor: "orange.400",

      _hover: {
        color: "orange.500",
        borderColor: "orange.500"
      },

      _active: {
        color: "orange.500",
        borderColor: "orange.500"
      }
    },
    orange: {
      bg: "orange.400",
      color: "white",
      fontSize: "lg",

      _hover: {
        bg: "orange.500"
      },

      _active: {
        bg: "orange.500"
      }
    },
    tokenSelect: {
      bg: "brand.900",
      textStyle: "subtitle1",
      color: "white",
      px: 4,
      py: 6,
      borderRadius: "xl",
      _hover: { bg: "brand.1000" },
      borderWidth: 2,
      borderStyle: "solid",
      w: "100%"
    },
    inverted: {
      bg: "transparent",
      color: "brand.400",
      borderWidth: "2.5px",
      borderStyle: "solid",
      borderColor: "brand.400",
      _hover: {
        bg: "transparent",
        color: "brand.500",
        borderColor: "brand.500"
      },
      _active: {
        bg: "transparent"
      }
    },
    dropdown: ({ theme }: any) => ({
      px: "0.5rem",
      bg: "transparent",
      color: "brand.100",
      textStyle: "Dropdown",
      border: theme.yeti.borders.input,
      _active: {
        background: "transparent"
      },
      _hover: {
        background: "transparent"
      }
    })
  },
  sizes: {
    AdjustInput: {
      height: "40%",
      fontSize: "46%",
      borderRadius: "2px"
    },
    xs: {
      height: "inputlike.xs"
    },
    sm: {
      height: "inputlike.sm"
    },
    md: {
      height: "inputlike.md"
    },
    lg: {
      height: "inputlike.lg"
    }
  }
};

export default Button;

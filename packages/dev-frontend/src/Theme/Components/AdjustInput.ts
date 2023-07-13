import yeti from "../yeti";

const AdjustInput = {
  parts: [
    "input",
    "inputGroup",
    "inputRightElement",
    "inputLeftElement",
    "maxButton",
    "currencyConverter",
    "incrementButtons",
    "increment",
    "decrement"
  ],
  baseStyle: {
    input: {
      height: "100%",
      border: "none",
      color: "brand.300",
      px: 0.5,
      borderRadius: "none",
      _hover: {},
      _focus: {}
    },
    inputGroup: {
      border: yeti.borders.input,
      borderRadius: "input",
      borderColor: "brand.700",
      height: "100%",
      display: "flex",
      flexDir: "row",
      alignItems: "center"
    },
    iconContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center"
    },
    decoratorContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center"
    },
    maxButton: {
      fontWeight: 700,
      minWidth: "",
      bg: "brand.400",
      color: "white",

      _hover: {
        bg: "brand.500"
      }
    },
    currencyConverter: {
      fontWeight: 700
    },
    incrementButtons: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-around",
      alignItems: "center"
    },
    increment: {
      cursor: "pointer",
      iconName: "AdjustInputIncrement",
      w: "100%",
      color: "brand.700"
    },
    decrement: {
      cursor: "pointer",
      iconName: "AdjustInputDecrement",
      w: "100%",
      color: "brand.700"
    }
  },
  sizes: {
    xs: {
      increment: {
        height: 2,
        width: 2
      },
      decrement: {
        height: 2,
        width: 2
      },
      maxButton: {
        ml: 1,
        height: 3.5,
        px: 2,
        fontSize: "0.5rem",
        borderRadius: "microbutton"
      },
      inputGroup: {
        ml: 1
      },
      currencyConverter: {
        transform: "translatey(1px)",
        fontSize: "0.625rem"
      },
      input: {
        fontSize: "18px",
        fontWeight: 700,
        ml: 1
      },
      decoratorContainer: {
        pr: "5px"
      },
      iconContainer: {
        display: "none"
      }
    },
    md: {
      increment: {
        height: 4,
        width: 4
      },
      decrement: {
        height: 4,
        width: 4
      },
      maxButton: {
        ml: 2,
        height: 4,
        px: 3,
        fontSize: ".7rem",
        borderRadius: "microbutton"
      },
      inputGroup: {
        ml: 1
      },
      currencyConverter: {
        transform: "translatey(1px)",
        fontSize: ".8rem"
      },
      input: {
        fontSize: "18px",
        fontWeight: 700,
        ml: 1
      },
      decoratorContainer: {
        pr: "5px"
      },
      iconContainer: {
        display: "none"
      }
    }
  },
  variants: {
    noIncrementButtons: {
      incrementButtons: {
        display: "none"
      },

      inputGroup: {
        ml: 0
      }
    }
  }
};

export default AdjustInput;

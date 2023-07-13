import colors from "./colors";

const yeti = {
  borders: {
    input: `2px solid ${colors.brand[700]}`
  },
  scrollbar: {
    "&::-webkit-scrollbar": {
      width: "10px"
    },
    "&::-webkit-scrollbar-track": {
      background: colors.brand[700]
    },
    "&::-webkit-scrollbar-thumb": {
      background: colors.brand[900]
    }
  },
  scrollbarDashboard: {
    "&::-webkit-scrollbar": {
      width: "10px"
    },
    "&::-webkit-scrollbar-track": {
      background: colors.brand[700]
    },
    "&::-webkit-scrollbar-thumb": {
      background: "white"
    }
  }
};

export default yeti;

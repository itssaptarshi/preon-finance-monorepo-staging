function getNum(n) {
  // console.log("Get Num");
  // console.log(n);
  if (n > 9999999) {
    return (n / 1000000).toFixed(1).toLocaleString() + "m";
  } else if (n > 999999) {
    return (n / 1000000).toFixed(2).toLocaleString() + "m";
  } else if (n > 9999) {
    return (
      parseFloat(n / 1000)
        .toFixed(1)
        .toLocaleString() + "k"
    );
  } else {
    return parseFloat(n).toFixed(2).toString();
  }
}

export { getNum };

export const chainName = data =>
  data?.name &&
  data.name
    .split(' ')
    .length < 3 ?
    data.name :
    data?.short_name
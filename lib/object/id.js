export const type = id => {
  const txRegEx = new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm')
  const addressRegEx = new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm')
  const ensRegEx = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm')

  return !id ? null : id.match(txRegEx) ? 'tx' : id.match(addressRegEx) ? 'address' : id.match(ensRegEx) ? 'router' : 'tx'
}
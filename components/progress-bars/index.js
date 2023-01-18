export const ProgressBar = (
  {
    width,
    color,
    className = '',
    backgroundClassName = '',
  },
) => {
  width =
    width < 0 ?
      0 :
      width > 100 ?
        100 :
        width

  return (
    <div className={`w-full h-1 relative flex flex-row items-center text-xs text-center ${backgroundClassName}`}>
      <div
        className={`w-full h-1 top-0 left-0 ${color} ${className}`}
        style={
          {
            width: `${width}%`,
          }
        }
      />
    </div>
  )
}

export const ProgressBarWithText = (
  {
    width,
    color,
    text,
    className = '',
    backgroundClassName = '',
  },
) => {
   width =
     width < 0 ?
      0 :
      width > 100 ?
        100 :
        width

  return (
    <div className={`w-full ${backgroundClassName.includes('h-') ? '' : 'h-4'} ${backgroundClassName.includes('bg-') ? '' : 'bg-slate-50 dark:bg-slate-800'} relative flex flex-row items-center text-xs text-center ${backgroundClassName}`}>
      <div
        className={`w-full absolute top-0 text-white ${color} ${className}`}
        style={
          {
            width: `${width}%`,
          }
        }
      >
        {
          typeof text !== 'undefined' ?
            text :
            `${width}%`
        }
      </div>
    </div>
  )
}
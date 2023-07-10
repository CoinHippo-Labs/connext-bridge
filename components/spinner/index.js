import { useSelector, shallowEqual } from 'react-redux'
import { Blocks, ProgressBar, Rings, RotatingSquare, Puff, Watch, Oval } from 'react-loader-spinner'

import { loaderColor } from '../../lib/utils'

export default ({ name, width = 24, height = 24, color }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  color = color || loaderColor(theme)
  switch (name) {
    case 'Blocks':
      return <Blocks />
    case 'ProgressBar':
      return <ProgressBar width={width} height={height} borderColor={color} />
    case 'Rings':
      return <Rings width={width} height={height} color={color} />
    case 'RotatingSquare':
      return <RotatingSquare width={width} height={height} color={color} />
    case 'Puff':
      return <Puff width={width} height={height} color={color} />
    case 'Watch':
      return <Watch width={width} height={height} color={color} />
    case 'Oval':
    default:
      return <Oval width={width} height={height} color={color} />
  }
}
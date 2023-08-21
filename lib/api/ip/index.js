import { toArray, equalsIgnoreCase } from '../../utils'
import geoblock from '../../../config/geoblock.json'

const request = async (params = {}) => {
  const response = await fetch(`https://ipapi.co/json${Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : ''}`).catch(error => { return null })
  return response && await response.json()
}

export const getIP = async params => await request(params)

export const isBlock = data => {
  const { country, region } = { ...data }
  return geoblock.findIndex(d => toArray([country, region]).findIndex(_d => equalsIgnoreCase(_d, d)) > -1) > -1
}
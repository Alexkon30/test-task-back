import { Injectable } from '@nestjs/common'
import { CrmType, FetchParams, Order, OrdersFilter, RetailPagination } from './types'
import axios, { AxiosInstance } from 'axios'
import { ConcurrencyManager } from 'axios-concurrency'
import { serialize } from '../tools'
import { plainToClass } from 'class-transformer'

@Injectable()
export class RetailService {
  private readonly axios: AxiosInstance

  constructor() {
    this.axios = axios.create({
      baseURL: `${process.env.RETAIL_URL}/api/v5`,
      timeout: 10000,
      headers: { 
        "x-api-key": process.env.RETAIL_KEY,
      },
    })

    this.axios.interceptors.request.use((config) => {
      // console.log(config.url)
      return config
    })
    this.axios.interceptors.response.use(
      (r) => {
        // console.log("Result:", r.data)
        return r
      },
      (r) => {
        // console.log("Error:", r.response.data)
        return r
      },
    )

    ConcurrencyManager(this.axios, +process.env.MAX_CONCURRENT_REQUESTS || 10)
  }

  async orders(filter?: OrdersFilter): Promise<[Order[], RetailPagination]> {
    const params = serialize(filter, '')
    const resp = await this.axios.get('/orders?' + params)

    if (!resp.data) throw new Error('RETAIL CRM ERROR')

    const orders = plainToClass(Order, resp.data.orders as Array<any>)
    const pagination: RetailPagination = resp.data.pagination

    return [orders, pagination]
  }

  async findOrder(id: string): Promise<Order | null> {
    const filter: OrdersFilter = {
      filter: {
        ids: [Number(id)],
      },
    }

    const params = serialize(filter, '')
    const resp = await this.axios.get(`/orders?${params}`)

    if (!resp.data) throw new Error('RETAIL CRM ERROR')

    if (resp.data.orders.length === 0) return null

    return resp.data.orders[0]
  }

  async orderStatuses(): Promise<CrmType[]> {
    const params: FetchParams = {
      url: '/reference/statuses',
      property: 'statuses'
    }
    return await this.fetchDataByUrl(params)
  }

  async productStatuses(): Promise<CrmType[]> {
    const params: FetchParams = {
      url: '/reference/product-statuses',
      property: 'productStatuses'
    }
    return await this.fetchDataByUrl(params)
  }

  async deliveryTypes(): Promise<CrmType[]> {
    const params: FetchParams = {
      url: '/reference/delivery-types',
      property: 'deliveryTypes'
    }
    return await this.fetchDataByUrl(params)
  }

  private async fetchDataByUrl(params: FetchParams): Promise<CrmType[]> {
    const { url, property } = params
    const resp = await this.axios.get(url)

    if (!resp.data) throw new Error('RETAIL CRM ERROR')

    const data = plainToClass(CrmType, resp.data[property] as Array<any>)
    
    return Object.values(data)
  }
}

import { onMounted, reactive, ref, type Ref } from 'vue'

export interface UseTableOptions<S extends object> {
  /** 初始筛选参数 */
  defaultParams?: S
  /** 挂载后是否立即请求 */
  immediate?: boolean
}

export interface PageParams {
  page: number
  pageSize: number
}

export type TableFetcher<T, S extends object> = (
  params: PageParams & S
) => Promise<{ list: T[]; total: number }>

/**
 * 表格通用逻辑:搜索 / 重置 / 分页 / 多选 统一封装,
 * 页面只需提供 fetcher,避免每个列表页重复实现。
 */
export function useTable<T, S extends object = Record<string, never>>(
  fetcher: TableFetcher<T, S>,
  options: UseTableOptions<S> = {}
) {
  const loading = ref(false)
  const tableData = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const selection = ref<T[]>([]) as Ref<T[]>

  const pagination = reactive({
    page: 1,
    pageSize: 20,
    pageSizes: [10, 20, 50, 100]
  })

  const searchParams = reactive({ ...(options.defaultParams ?? {}) }) as S

  async function fetchList(): Promise<void> {
    loading.value = true
    try {
      const data = await fetcher({ ...searchParams, page: pagination.page, pageSize: pagination.pageSize } as PageParams & S)
      tableData.value = data.list
      total.value = data.total
    } finally {
      loading.value = false
    }
  }

  /** 查询:重置到第一页 */
  function search(): void {
    pagination.page = 1
    fetchList()
  }

  /** 重置筛选并查询 */
  function reset(): void {
    Object.assign(searchParams, options.defaultParams ?? {})
    pagination.page = 1
    fetchList()
  }

  function handleSizeChange(size: number): void {
    pagination.pageSize = size
    pagination.page = 1
    fetchList()
  }

  function handleCurrentChange(page: number): void {
    pagination.page = page
    fetchList()
  }

  function handleSelectionChange(rows: T[]): void {
    selection.value = rows
  }

  onMounted(() => {
    if (options.immediate !== false) fetchList()
  })

  return {
    loading,
    tableData,
    total,
    selection,
    pagination,
    searchParams,
    fetchList,
    search,
    reset,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  }
}

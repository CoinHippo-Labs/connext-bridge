import { useEffect, useRef, forwardRef } from 'react'
import { useTable, useSortBy, usePagination, useRowSelect } from 'react-table'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { BiLeftArrowAlt, BiRightArrowAlt } from 'react-icons/bi'

import { PageWithText, Pagination } from '../paginations'

const IndeterminateCheckbox = forwardRef(({ indeterminate, ...rest }, ref) => {
  const defaultRef = useRef()
  const resolvedRef = ref || defaultRef

  useEffect(() => {
    resolvedRef.current.indeterminate = indeterminate
  }, [resolvedRef, indeterminate])

  return (
    <input
      ref={resolvedRef}
      type="checkbox"
      { ...rest }
      className="form-checkbox w-4 h-4"
    />
  )
})

export default ({
  columns,
  data,
  rowSelectEnable = false,
  defaultPageSize = 10,
  noPagination = false,
  noRecordPerPage = false,
  className = '',
}) => {
  const tableRef = useRef()
  const {
    getTableProps,
    getTableBodyProps,
    rows,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize, selectedRowIds }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: defaultPageSize },
      disableSortRemove: true,
      stateReducer: (newState, action, prevState) => action.type.startsWith('reset') ? prevState : newState,
    },
    useSortBy,
    usePagination,
    useRowSelect,
    hooks => {
      hooks.visibleColumns.push(columns => [
        rowSelectEnable ? {
          id: 'selection',
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <IndeterminateCheckbox { ...getToggleAllRowsSelectedProps() } />
          ),
          Cell: ({ row }) => (
            <IndeterminateCheckbox { ...row.getToggleRowSelectedProps() } />
          )
        } : undefined,
        ...columns
      ].filter(c => c))
    }
  )

  useEffect(() => {
    if (pageIndex + 1 > pageCount) {
      gotoPage(pageCount - 1)
    }
  }, [pageIndex, pageCount])

  const loading = data?.findIndex(item => item.skeleton) > -1 ? true : false

  return (
    <>
      <table ref={tableRef} { ...getTableProps() } className={`table rounded-lg ${className}`}>
        <thead>
          {headerGroups.map(hg => (
            <tr { ...hg.getHeaderGroupProps() }>
              {hg.headers.map((c, i) => (
                <th { ...c.getHeaderProps(c.getSortByToggleProps()) } className={`${c.className} ${i === 0 ? 'rounded-tl-lg' : i === hg.headers.length - 1 ? 'rounded-tr-lg' : ''}`}>
                  <div className={`flex flex-row items-center ${c.headerClassName?.includes('justify-') ? '' : 'justify-start'} ${c.headerClassName || ''}`}>
                    <span>
                      {c.render('Header')}
                    </span>
                    {c.isSorted && (
                      <span className="ml-2">
                        {c.isSortedDesc ?
                          <FiChevronDown className="stroke-current text-2xs" /> :
                          <FiChevronUp className="stroke-current text-2xs" />
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody { ...getTableBodyProps() }>
          {(noPagination ? rows : page).map((row, i) => {
            prepareRow(row)
            return (
              <tr { ...row.getRowProps() }>
                {row.cells.map((cell, j) => (
                  <td { ...cell.getCellProps() } className={headerGroups[0]?.headers[j]?.className}>
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!noPagination && data?.length > 0 && (
        <div className={`flex flex-col sm:flex-row items-center justify-${noRecordPerPage ? 'center' : 'between'} my-4`}>
          {!noRecordPerPage && (
            <select
              disabled={loading}
              value={pageSize}
              onChange={event => setPageSize(Number(event.target.value))}
              className="form-select dark:bg-slate-900 outline-none border-slate-200 dark:border-slate-900 appearance-none shadow-none focus:shadow-none rounded-lg text-xs p-2 pl-3.5"
            >
              {[10, 25, 50, 100].map((s, i) => (
                <option key={i} value={s}>
                  Show {s}
                </option>
              ))}
            </select>
          )}
          {pageCount > 1 && pageCount <= 4 && (
            <span className="my-2 sm:my-0 mx-4">
              Page <span className="font-bold">{pageIndex + 1}</span> of <span className="font-bold">{pageOptions.length}</span>
            </span>
          )}
          <div className="pagination flex flex-wrap items-center justify-end space-x-2">
            {pageCount > 4 ?
              <div className="flex flex-col sm:flex-row items-center justify-center mt-2 sm:mt-0">
                <Pagination
                  items={[...Array(pageCount).keys()]}
                  disabled={loading}
                  active={pageIndex + 1}
                  previous={noRecordPerPage ? <BiLeftArrowAlt size={16} /> : 'Previous'}
                  next={noRecordPerPage ? <BiRightArrowAlt size={16} /> : 'Next'}
                  onClick={p => {
                    gotoPage(p - 1)
                    tableRef.current.scrollIntoView() 
                  }}
                  icons={noRecordPerPage ? true : false}
                  className={noRecordPerPage ? 'space-x-0.5' : ''}
                />
              </div>
              :
              <>
                {pageIndex !== 0 && (
                  <PageWithText
                    disabled={loading}
                    onClick={() => {
                      gotoPage(0)
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    First
                  </PageWithText>
                )}
                {canPreviousPage && (
                  <PageWithText
                    disabled={loading}
                    onClick={() => {
                      previousPage()
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Previous
                  </PageWithText>
                )}
                {canNextPage && (
                  <PageWithText
                    disabled={!canNextPage || loading}
                    onClick={() => {
                      nextPage()
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Next
                  </PageWithText>
                )}
                {pageIndex !== pageCount - 1 && (
                  <PageWithText
                    disabled={!canNextPage || loading}
                    onClick={() => {
                      gotoPage(pageCount - 1)
                      tableRef.current.scrollIntoView() 
                    }}
                  >
                    Last
                  </PageWithText>
                )}
              </>
            }
          </div>
        </div>
      )}
    </>
  )
}
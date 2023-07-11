import { useEffect, useRef, forwardRef } from 'react'
import _ from 'lodash'
import { useTable, useSortBy, usePagination, useRowSelect } from 'react-table'
import { BiChevronDown, BiChevronUp, BiLeftArrowAlt, BiRightArrowAlt } from 'react-icons/bi'

import { PageWithText, Pagination } from '../paginations'
import { toArray } from '../../lib/utils'

const IndeterminateCheckbox = forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = useRef()
    const resolvedRef = ref || defaultRef

    useEffect(
      () => {
        resolvedRef.current.indeterminate = indeterminate
      },
      [resolvedRef, indeterminate],
    )

    return (
      <input
        ref={resolvedRef}
        type="checkbox"
        { ...rest }
        className="form-checkbox w-4 h-4"
      />
    )
  }
)

export default (
  {
    columns,
    size,
    data,
    rowSelectEnable = false,
    defaultPageSize = 10,
    pageSizes = [10, 25, 50, 100],
    noPagination = false,
    noRecordPerPage = false,
    extra,
    className = '',
    style,
  },
) => {
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
    state: {
      pageIndex,
      pageSize,
      selectedRowIds,
    }
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
      hooks.visibleColumns.push(
        columns => toArray([
          rowSelectEnable && {
            id: 'selection',
            Header: ({ getToggleAllRowsSelectedProps }) => <IndeterminateCheckbox { ...getToggleAllRowsSelectedProps() } />,
            Cell: ({ row }) => <IndeterminateCheckbox { ...row.getToggleRowSelectedProps() } />,
          },
          ...columns,
        ])
      )
    }
  )

  useEffect(
    () => {
      if (pageIndex + 1 > pageCount) {
        gotoPage(pageCount - 1)
      }
    },
    [pageIndex, pageCount],
  )

  const loading = toArray(data).findIndex(d => d.skeleton) > -1

  return (
    <>
      <table
        ref={tableRef}
        { ...getTableProps() }
        className={`table rounded ${className}`}
        style={{ ...style }}
      >
        <thead>
          {headerGroups.map(hg =>
            <tr { ...hg.getHeaderGroupProps() }>
              {hg.headers.map((c, i) =>
                <th
                  { ...c.getHeaderProps(c.getSortByToggleProps()) }
                  className={`${i === 0 ? 'rounded-tl' : i === hg.headers.length - 1 ? 'rounded-tr' : ''} ${c.className || ''}`}
                >
                  <div className={`flex flex-row items-center ${c.headerClassName?.includes('justify-') ? '' : 'justify-start'} ${c.headerClassName || ''}`}>
                    <span>{c.render('Header')}</span>
                    {c.isSorted && (
                      <span className="ml-1.5">
                        {c.isSortedDesc ? <BiChevronDown className="stroke-current" /> : <BiChevronUp className="stroke-current" />}
                      </span>
                    )}
                  </div>
                </th>
              )}
            </tr>
          )}
        </thead>
        <tbody { ...getTableBodyProps() }>
          {(noPagination ? rows : page).map((row, i) => {
            prepareRow(row)
            return (
              <tr { ...row.getRowProps() } className="hover:bg-slate-100 dark:hover:bg-slate-800">
                {row.cells.map((cell, j) => {
                  const { className } = { ..._.head(headerGroups)?.headers[j] }
                  return (
                    <td
                      { ...cell.getCellProps() }
                      className={className}
                      style={className?.includes('p-0') ? { padding: 0 } : undefined}
                    >
                      {cell.render('Cell')}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!noPagination && data?.length > 0 && (
        <div className={`${noRecordPerPage || pageCount <= 3 ? 'grid' : 'flex flex-col'} sm:grid grid-cols-3 items-center justify-between ${size === 'small' ? 'text-xs' : 'text-sm'} gap-4 sm:my-2`}>
          {!noRecordPerPage && (
            <select
              disabled={loading}
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className={`${size === 'small' ? 'w-fit py-0.5 px-1' : 'w-20 py-1 px-1.5'} form-select bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 outline-none border-zinc-100 dark:border-zinc-900 appearance-none shadow rounded cursor-pointer font-medium text-center`}
            >
              {pageSizes.map((s, i) =>
                <option
                  key={i}
                  value={s}
                  className="text-xs font-medium"
                >
                  Show {s}
                </option>
              )}
            </select>
          )}
          {pageCount > 1 && pageCount <= 1 && (
            <div className="space-x-1 my-2.5 sm:my-0 mx-auto">
              <span>Page</span>
              <span className="font-bold">
                {pageIndex + 1}
              </span>
              <span>of</span>
              <span className="font-bold">
                {pageOptions.length}
              </span>
            </div>
          )}
          <div className="pagination flex flex-wrap items-center justify-center space-x-2">
            {pageCount > 1 ?
              <div className="flex flex-col sm:flex-row items-center justify-center my-3 sm:my-0">
                <Pagination
                  size={size}
                  items={[...Array(pageCount).keys()]}
                  disabled={loading}
                  active={pageIndex + 1}
                  previous={<BiLeftArrowAlt size={16} />}
                  next={<BiRightArrowAlt size={16} />}
                  onClick={p => gotoPage(p - 1)}
                  icons={true}
                  className="space-x-0.5"
                />
              </div> :
              <>
                {pageIndex !== 0 && (
                  <PageWithText
                    size={size}
                    disabled={loading}
                    onClick={
                      () => {
                        gotoPage(0)
                        tableRef.current.scrollIntoView()
                      }
                    }
                  >
                    <span className={`${size === 'small' ? 'text-2xs' : ''}`}>
                      First
                    </span>
                  </PageWithText>
                )}
                {canPreviousPage && (
                  <PageWithText
                    size={size}
                    disabled={loading}
                    onClick={() => previousPage()}
                  >
                    <span className={`${size === 'small' ? 'text-2xs' : ''}`}>
                      Prev
                    </span>
                  </PageWithText>
                )}
                {canNextPage && (
                  <PageWithText
                    size={size}
                    disabled={!canNextPage || loading}
                    onClick={() => nextPage()}
                  >
                    <span className={`${size === 'small' ? 'text-2xs' : ''}`}>
                      Next
                    </span>
                  </PageWithText>
                )}
                {pageIndex !== pageCount - 1 && (
                  <PageWithText
                    size={size}
                    disabled={!canNextPage || loading}
                    onClick={
                      () => {
                        gotoPage(pageCount - 1)
                        tableRef.current.scrollIntoView()
                      }
                    }
                  >
                    <span className={`${size === 'small' ? 'text-2xs' : ''}`}>
                      Last
                    </span>
                  </PageWithText>
                )}
              </>
            }
          </div>
          {extra && (
            <div className={`flex flex-col sm:flex-row items-center ${pageCount <= 3 ? 'justify-end' : ''} sm:justify-end sm:space-x-2`}>
              {extra}
            </div>
          )}
        </div>
      )}
    </>
  )
}